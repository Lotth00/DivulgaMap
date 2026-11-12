const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');
const verificarDonoEmpresa = require('../middlewares/donoEmpresa');
const idValido = require('../utils/id');
const jwt = require('jsonwebtoken');

const router = express.Router();

const FUSO_HORARIO = 'America/Sao_Paulo';
const PADRAO_SEM_FUSO = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?$/;
const PADRAO_COM_FUSO = /(Z|[+-]\d{2}:?\d{2})$/i;

// Data da promoção no horário de Brasília ("AAAA-MM-DDTHH:MM:SS"), ou null se inválida.
// As colunas não guardam fuso: datas com "Z" ou deslocamento são convertidas, as demais já são locais.
function normalizarData(valor) {
  if (typeof valor !== 'string') return null;
  const texto = valor.trim();

  // Dia que não existe no calendário (ex: 30/02)
  const [ano, mes, dia] = texto.slice(0, 10).split('-').map(Number);
  const conferida = new Date(Date.UTC(ano, mes - 1, dia));
  if (conferida.getUTCFullYear() !== ano || conferida.getUTCMonth() !== mes - 1 || conferida.getUTCDate() !== dia) {
    return null;
  }

  let instante;
  if (PADRAO_COM_FUSO.test(texto)) {
    instante = new Date(texto);
  } else if (PADRAO_SEM_FUSO.test(texto)) {
    const local = new Date(`${texto.replace(' ', 'T').slice(0, 19)}${texto.length <= 10 ? 'T00:00:00' : ''}Z`);
    return Number.isNaN(local.getTime()) ? null : local.toISOString().slice(0, 19);
  } else {
    return null;
  }
  if (Number.isNaN(instante.getTime())) return null;

  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO_HORARIO,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instante)
      .map((parte) => [parte.type, parte.value])
  );
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}`;
}

// Confere se os campos certos vieram para cada tipo de promoção (datas já normalizadas)
function validarCamposPorTipo({ tipo, desconto_percentual, condicao, data_inicio, data_fim }) {
  if (!['normal', 'especial', 'relampago'].includes(tipo)) {
    return 'Tipo inválido. Use "normal", "especial" ou "relampago".';
  }
  if (!data_inicio || !data_fim) {
    return 'data_inicio e data_fim são obrigatórios e precisam ser datas válidas (ex: 2026-12-31T23:59:00).';
  }
  if (new Date(`${data_fim}Z`) <= new Date(`${data_inicio}Z`)) {
    return 'data_fim precisa ser depois de data_inicio.';
  }
  if (desconto_percentual !== undefined && desconto_percentual !== null && desconto_percentual !== '') {
    const desconto = Number(desconto_percentual);
    if (!Number.isFinite(desconto) || desconto <= 0 || desconto > 100) {
      return 'desconto_percentual deve ser um número maior que 0 e até 100.';
    }
  }
  if (tipo === 'normal' && !desconto_percentual) {
    return 'Promoções do tipo "normal" precisam de desconto_percentual.';
  }
  if (tipo === 'especial' && !condicao) {
    return 'Promoções do tipo "especial" precisam do campo condicao (ex: "Leve 3, pague 2").';
  }
  if (tipo === 'relampago') {
    if (!desconto_percentual && !condicao) {
      return 'Promoções relâmpago precisam de desconto_percentual OU condicao.';
    }
    const horasDeDuracao = (new Date(`${data_fim}Z`) - new Date(`${data_inicio}Z`)) / (1000 * 60 * 60);
    if (horasDeDuracao > 24) return 'Promoções relâmpago devem durar no máximo 24 horas.';
  }
  return null; 
}

// Colunas da promoção, com as datas como texto no horário de Brasília (como foram gravadas)
// status calculado pelas datas; 'expirada' gravado (encerrada pelo dono) vale sempre
function camposPromocao(prefixo = '') {
  const agora = `(NOW() AT TIME ZONE '${FUSO_HORARIO}')`;
  return `${prefixo}id_promocao, ${prefixo}empresa_id, ${prefixo}produto_id, ${prefixo}tipo, ${prefixo}titulo,
    ${prefixo}descricao, ${prefixo}condicao, ${prefixo}desconto_percentual,
    CASE WHEN ${prefixo}status = 'expirada' OR ${prefixo}data_fim < ${agora} THEN 'expirada'
         WHEN ${prefixo}data_inicio <= ${agora} THEN 'ativa'
         ELSE 'agendada' END AS status,
    to_char(${prefixo}data_inicio, 'YYYY-MM-DD"T"HH24:MI:SS') AS data_inicio,
    to_char(${prefixo}data_fim, 'YYYY-MM-DD"T"HH24:MI:SS') AS data_fim`;
}

// Usuário do token, se houver um válido (rotas públicas)
function usuarioOpcional(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// LISTAR promoções de uma empresa; empresa não aprovada só para o dono ou admin
router.get('/empresa/:empresaId', async (req, res) => {
  try {
    const empresaId = idValido(req.params.empresaId);
    if (!empresaId) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }
    const empresa = await pool.query('SELECT id_usuario, status FROM empresas WHERE id_empresa = $1', [empresaId]);
    if (!empresa.rows[0]) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }
    if (empresa.rows[0].status !== 'aprovada') {
      const usuario = usuarioOpcional(req);
      let permitido = usuario?.id === empresa.rows[0].id_usuario;
      if (usuario && !permitido) {
        const tipo = await pool.query('SELECT tipo FROM usuarios WHERE id_usuario = $1', [usuario.id]);
        permitido = tipo.rows[0]?.tipo === 'admin';
      }
      if (!permitido) {
        return res.status(404).json({ erro: 'Empresa não encontrada.' });
      }
    }
    const resultado = await pool.query(
      `SELECT ${camposPromocao()} FROM promocoes WHERE empresa_id = $1 ORDER BY data_inicio DESC`,
      [empresaId]
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar promoções.' });
  }
});

// LISTAR só as promoções relâmpago ativas AGORA, de empresas aprovadas (horário de Brasília)
router.get('/relampago/ativas', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT ${camposPromocao('p.')} FROM promocoes p
       JOIN empresas e ON e.id_empresa = p.empresa_id
       LEFT JOIN produtos pr ON pr.id_produto = p.produto_id
       WHERE p.tipo = 'relampago' AND e.status = 'aprovada'
         AND p.status <> 'expirada'
         AND (p.produto_id IS NULL OR pr.disponivel = TRUE)
         AND p.data_inicio <= (NOW() AT TIME ZONE $1)
         AND p.data_fim >= (NOW() AT TIME ZONE $1)
       ORDER BY p.data_fim ASC`,
      [FUSO_HORARIO]
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar promoções relâmpago.' });
  }
});

const LIMITE_PADRAO = 20;
const LIMITE_MAXIMO = 50;

// Campos de uma oferta (lista e detalhe); $1 é sempre o fuso horário
function consultaOferta(distancia = 'NULL::float8') {
  return `SELECT
         p.id_promocao AS id,
         p.tipo,
         p.titulo,
         p.descricao,
         p.condicao,
         p.desconto_percentual,
         to_char(p.data_inicio, 'YYYY-MM-DD"T"HH24:MI:SS') AS data_inicio,
         to_char(p.data_fim, 'YYYY-MM-DD"T"HH24:MI:SS') AS data_fim,
         (p.data_inicio <= (NOW() AT TIME ZONE $1) AND p.data_fim >= (NOW() AT TIME ZONE $1)) AS em_vigor,
         e.id_empresa AS empresa_id,
         e.nome_fantasia AS empresa_nome,
         en.endereco,
         en.bairro,
         en.latitude,
         en.longitude,
         pr.id_produto AS produto_id,
         pr.nome AS produto_nome,
         pr.descricao AS produto_descricao,
         pr.tipo_item,
         pr.unidade_medida,
         pr.preco AS preco_original,
         CASE WHEN pr.preco IS NOT NULL AND p.desconto_percentual IS NOT NULL
              THEN ROUND(pr.preco * (100 - p.desconto_percentual) / 100, 2)
         END AS preco_promocional,
         pr.foto_url AS foto_produto,
         (SELECT f.url FROM fotos_empresa f
          WHERE f.empresa_id = e.id_empresa
          ORDER BY f.ordem, f.id_foto LIMIT 1) AS foto_empresa,
         COALESCE(cp.nome, (
           SELECT c.nome FROM empresa_categoria ec
           JOIN categorias c ON c.id_categoria = ec.categoria_id
           WHERE ec.empresa_id = e.id_empresa
           ORDER BY c.nome LIMIT 1
         )) AS categoria,
         ${distancia} AS distancia_km
       FROM promocoes p
       JOIN empresas e ON e.id_empresa = p.empresa_id
       LEFT JOIN produtos pr ON pr.id_produto = p.produto_id
       LEFT JOIN categorias cp ON cp.id_categoria = pr.categoria_id
       LEFT JOIN LATERAL (
         SELECT endereco, bairro, latitude, longitude FROM enderecos
         WHERE empresa_id = e.id_empresa ORDER BY id_endereco LIMIT 1
       ) en ON TRUE`;
}

// OFERTAS em vigor agora, de empresas aprovadas (pública)
router.get('/ativas', async (req, res) => {
  try {
    const { tipo, empresa, lat, lng, limite } = req.query;
    const valores = [FUSO_HORARIO];
    const filtros = [];

    if (tipo !== undefined && tipo !== '') {
      if (!['normal', 'especial', 'relampago'].includes(tipo)) {
        return res.status(400).json({ erro: 'Tipo inválido. Use "normal", "especial" ou "relampago".' });
      }
      valores.push(tipo);
      filtros.push(`AND p.tipo = $${valores.length}`);
    }

    // Só as ofertas de uma empresa
    if (empresa !== undefined && empresa !== '') {
      const empresaId = Number(empresa);
      if (!Number.isInteger(empresaId) || empresaId < 1) {
        return res.status(400).json({ erro: 'empresa precisa ser o número da empresa.' });
      }
      valores.push(empresaId);
      filtros.push(`AND p.empresa_id = $${valores.length}`);
    }

    const temLat = lat !== undefined && lat !== '';
    const temLng = lng !== undefined && lng !== '';
    if (temLat !== temLng) {
      return res.status(400).json({ erro: 'Envie lat e lng juntos.' });
    }

    let distancia = 'NULL::float8';
    if (temLat) {
      const latitude = Number(lat);
      const longitude = Number(lng);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        return res.status(400).json({ erro: 'lat e lng precisam ser coordenadas válidas.' });
      }
      valores.push(latitude, longitude);
      const pLat = `$${valores.length - 1}::float8`;
      const pLng = `$${valores.length}::float8`;
      // Distância em linha reta (fórmula de Haversine)
      distancia = `ROUND((6371 * 2 * ASIN(SQRT(
          POWER(SIN(RADIANS(en.latitude::float8 - ${pLat}) / 2), 2) +
          COS(RADIANS(${pLat})) * COS(RADIANS(en.latitude::float8)) *
          POWER(SIN(RADIANS(en.longitude::float8 - ${pLng}) / 2), 2)
        )))::numeric, 2)::float8`;
    }

    let quantidade = LIMITE_PADRAO;
    if (limite !== undefined && limite !== '') {
      quantidade = Number(limite);
      if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > LIMITE_MAXIMO) {
        return res.status(400).json({ erro: `limite precisa ser um número inteiro de 1 a ${LIMITE_MAXIMO}.` });
      }
    }
    valores.push(quantidade);

    const resultado = await pool.query(
      `${consultaOferta(distancia)}
       WHERE e.status = 'aprovada'
         AND p.data_inicio <= (NOW() AT TIME ZONE $1)
         AND p.data_fim >= (NOW() AT TIME ZONE $1)
         AND (p.produto_id IS NULL OR pr.disponivel = TRUE)
         ${filtros.join(' ')}
       ORDER BY ${temLat ? 'distancia_km ASC NULLS LAST, ' : ''}p.data_fim ASC
       LIMIT $${valores.length}`,
      valores
    );

    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar ofertas.' });
  }
});

// DETALHE de uma oferta (pública), mesmo encerrada: em_vigor diz se ainda vale
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ erro: 'id inválido.' });
    }
    const resultado = await pool.query(
      `${consultaOferta()}
       WHERE p.id_promocao = $2 AND e.status = 'aprovada'
         AND (p.produto_id IS NULL OR pr.disponivel = TRUE)`,
      [FUSO_HORARIO, id]
    );
    if (!resultado.rows[0]) {
      return res.status(404).json({ erro: 'Oferta não encontrada.' });
    }
    return res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar a oferta.' });
  }
});

// CRIAR uma nova promoção (protegida)
router.post('/', verificarToken, verificarDonoEmpresa, async (req, res) => {
  try {
    const { produto_id, tipo, titulo, descricao, condicao, desconto_percentual } = req.body;
    const data_inicio = normalizarData(req.body.data_inicio);
    const data_fim = normalizarData(req.body.data_fim);
    const empresa_id = req.empresa.id_empresa;

    if (typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 150) {
      return res.status(400).json({ erro: 'titulo é obrigatório e pode ter até 150 letras.' });
    }
    if (descricao !== undefined && descricao !== null && typeof descricao !== 'string') {
      return res.status(400).json({ erro: 'descricao precisa ser texto.' });
    }
    if (condicao !== undefined && condicao !== null && (typeof condicao !== 'string' || condicao.trim().length > 255)) {
      return res.status(400).json({ erro: 'condicao precisa ser texto de até 255 letras.' });
    }

    const erroDeValidacao = validarCamposPorTipo({ tipo, desconto_percentual, condicao, data_inicio, data_fim });
    if (erroDeValidacao) {
      return res.status(400).json({ erro: erroDeValidacao });
    }

    // Produto precisa ser da mesma empresa
    if (produto_id) {
      const produto = idValido(produto_id)
        ? await pool.query(
          'SELECT 1 FROM produtos WHERE id_produto = $1 AND empresa_id = $2 AND disponivel = TRUE',
          [idValido(produto_id), empresa_id]
        )
        : { rows: [] };
      if (!produto.rows[0]) {
        return res.status(400).json({ erro: 'O produto informado não pertence a esta empresa.' });
      }
    }

    const novaPromocao = await pool.query(
      `INSERT INTO promocoes
        (empresa_id, produto_id, tipo, titulo, descricao, condicao, desconto_percentual, data_inicio, data_fim, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'agendada') RETURNING ${camposPromocao()}`,
      [empresa_id, produto_id || null, tipo, titulo.trim(), descricao?.trim() || null, condicao?.trim() || null, desconto_percentual || null, data_inicio, data_fim]
    );

    return res.status(201).json(novaPromocao.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao criar promoção.' });
  }
});

// Promoção pelo id; a empresa dela passa para a verificação do dono
async function carregarPromocao(req, res, next) {
  try {
    const id = idValido(req.params.id);
    if (!id) {
      return res.status(404).json({ erro: 'Promoção não encontrada.' });
    }
    const resultado = await pool.query(`SELECT ${camposPromocao()} FROM promocoes WHERE id_promocao = $1`, [id]);
    if (!resultado.rows[0]) {
      return res.status(404).json({ erro: 'Promoção não encontrada.' });
    }
    req.promocao = resultado.rows[0];
    req.empresaIdAlvo = req.promocao.empresa_id;
    next();
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar a promoção.' });
  }
}

// Valor enviado ou o atual, quando o campo não veio
function enviadoOuAtual(corpo, campo, atual) {
  return corpo[campo] !== undefined ? corpo[campo] : atual[campo];
}

// EDITAR uma promoção (só o dono); só os campos enviados mudam, com as regras do POST
router.put('/:id', verificarToken, carregarPromocao, verificarDonoEmpresa, async (req, res) => {
  try {
    const corpo = req.body || {};
    const atual = req.promocao;

    if (atual.status === 'expirada') {
      return res.status(400).json({ erro: 'Esta promoção já foi encerrada e não pode ser editada.' });
    }

    const tipo = enviadoOuAtual(corpo, 'tipo', atual);
    const titulo = enviadoOuAtual(corpo, 'titulo', atual);
    const descricao = enviadoOuAtual(corpo, 'descricao', atual);
    const condicao = enviadoOuAtual(corpo, 'condicao', atual);
    const desconto_percentual = enviadoOuAtual(corpo, 'desconto_percentual', atual);
    const produto_id = enviadoOuAtual(corpo, 'produto_id', atual);
    const data_inicio = corpo.data_inicio !== undefined ? normalizarData(corpo.data_inicio) : atual.data_inicio;
    const data_fim = corpo.data_fim !== undefined ? normalizarData(corpo.data_fim) : atual.data_fim;

    if (typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 150) {
      return res.status(400).json({ erro: 'titulo é obrigatório e pode ter até 150 letras.' });
    }
    if (descricao !== null && typeof descricao !== 'string') {
      return res.status(400).json({ erro: 'descricao precisa ser texto.' });
    }
    if (condicao !== null && (typeof condicao !== 'string' || condicao.trim().length > 255)) {
      return res.status(400).json({ erro: 'condicao precisa ser texto de até 255 letras.' });
    }

    const erroDeValidacao = validarCamposPorTipo({ tipo, desconto_percentual, condicao: condicao?.trim(), data_inicio, data_fim });
    if (erroDeValidacao) {
      return res.status(400).json({ erro: erroDeValidacao });
    }

    // Produto novo precisa ser da mesma empresa e estar disponível
    if (corpo.produto_id !== undefined && produto_id) {
      const produtoId = idValido(produto_id);
      const produto = produtoId
        ? await pool.query(
          'SELECT 1 FROM produtos WHERE id_produto = $1 AND empresa_id = $2 AND disponivel = TRUE',
          [produtoId, atual.empresa_id]
        )
        : { rows: [] };
      if (!produto.rows[0]) {
        return res.status(400).json({ erro: 'O produto informado não pertence a esta empresa.' });
      }
    }

    const resultado = await pool.query(
      `UPDATE promocoes
       SET tipo = $2, titulo = $3, descricao = $4, condicao = $5, desconto_percentual = $6,
           produto_id = $7, data_inicio = $8, data_fim = $9
       WHERE id_promocao = $1
       RETURNING ${camposPromocao()}`,
      [
        atual.id_promocao, tipo, titulo.trim(), descricao?.trim() || null, condicao?.trim() || null,
        desconto_percentual === '' || desconto_percentual === undefined ? null : desconto_percentual,
        produto_id || null, data_inicio, data_fim,
      ]
    );
    return res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao editar a promoção.' });
  }
});

// ENCERRAR uma promoção (só o dono): termina agora e fica como expirada
router.delete('/:id', verificarToken, carregarPromocao, verificarDonoEmpresa, async (req, res) => {
  try {
    if (req.promocao.status === 'expirada') {
      return res.status(400).json({ erro: 'Esta promoção já foi encerrada.' });
    }
    const resultado = await pool.query(
      `UPDATE promocoes
       SET data_inicio = LEAST(data_inicio, NOW() AT TIME ZONE $2),
           data_fim = LEAST(data_fim, NOW() AT TIME ZONE $2),
           status = 'expirada'
       WHERE id_promocao = $1
       RETURNING ${camposPromocao()}`,
      [req.promocao.id_promocao, FUSO_HORARIO]
    );
    return res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao encerrar a promoção.' });
  }
});

module.exports = router;