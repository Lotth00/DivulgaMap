const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');
const verificarDonoEmpresa = require('../middlewares/donoEmpresa');

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

// LISTAR promoções de uma empresa
router.get('/empresa/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const resultado = await pool.query(
      'SELECT * FROM promocoes WHERE empresa_id = $1 ORDER BY data_inicio DESC',
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
      `SELECT p.* FROM promocoes p
       JOIN empresas e ON e.id_empresa = p.empresa_id
       WHERE p.tipo = 'relampago' AND e.status = 'aprovada'
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

// OFERTAS em vigor agora, de empresas aprovadas (pública)
router.get('/ativas', async (req, res) => {
  try {
    const { tipo, lat, lng, limite } = req.query;
    const valores = [FUSO_HORARIO];
    const filtros = [];

    if (tipo !== undefined && tipo !== '') {
      if (!['normal', 'especial', 'relampago'].includes(tipo)) {
        return res.status(400).json({ erro: 'Tipo inválido. Use "normal", "especial" ou "relampago".' });
      }
      valores.push(tipo);
      filtros.push(`AND p.tipo = $${valores.length}`);
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
      `SELECT
         p.id_promocao AS id,
         p.tipo,
         p.titulo,
         p.descricao,
         p.condicao,
         p.desconto_percentual,
         to_char(p.data_fim, 'YYYY-MM-DD"T"HH24:MI:SS') AS data_fim,
         e.id_empresa AS empresa_id,
         e.nome_fantasia AS empresa_nome,
         pr.id_produto AS produto_id,
         pr.nome AS produto_nome,
         pr.tipo_item,
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
       LEFT JOIN enderecos en ON en.empresa_id = e.id_empresa
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

// CRIAR uma nova promoção (protegida)
router.post('/', verificarToken, verificarDonoEmpresa, async (req, res) => {
  try {
    const { produto_id, tipo, titulo, descricao, condicao, desconto_percentual } = req.body;
    const data_inicio = normalizarData(req.body.data_inicio);
    const data_fim = normalizarData(req.body.data_fim);
    const empresa_id = req.empresa.id_empresa;

    if (typeof titulo !== 'string' || !titulo.trim()) {
      return res.status(400).json({ erro: 'titulo é obrigatório.' });
    }

    const erroDeValidacao = validarCamposPorTipo({ tipo, desconto_percentual, condicao, data_inicio, data_fim });
    if (erroDeValidacao) {
      return res.status(400).json({ erro: erroDeValidacao });
    }

    // Produto precisa ser da mesma empresa
    if (produto_id) {
      const produto = await pool.query(
        'SELECT 1 FROM produtos WHERE id_produto = $1 AND empresa_id = $2',
        [produto_id, empresa_id]
      );
      if (!produto.rows[0]) {
        return res.status(400).json({ erro: 'O produto informado não pertence a esta empresa.' });
      }
    }

    const novaPromocao = await pool.query(
      `INSERT INTO promocoes
        (empresa_id, produto_id, tipo, titulo, descricao, condicao, desconto_percentual, data_inicio, data_fim, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'agendada') RETURNING *`,
      [empresa_id, produto_id || null, tipo, titulo.trim(), descricao, condicao || null, desconto_percentual || null, data_inicio, data_fim]
    );

    return res.status(201).json(novaPromocao.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao criar promoção.' });
  }
});

module.exports = router;