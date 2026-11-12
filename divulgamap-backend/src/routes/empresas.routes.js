const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');
const verificarAdmin = require('../middlewares/admin');
const verificarDonoEmpresa = require('../middlewares/donoEmpresa');
const idValido = require('../utils/id');

const router = express.Router();

// :id que não é número válido não chega ao banco
router.param('id', (req, res, next, valor) => {
  if (!idValido(valor)) {
    return res.status(404).json({ erro: 'Não encontrado.' });
  }
  next();
});

// Nível mínimo de semelhança da busca (0 a 1)
const SEMELHANCA_MINIMA = 0.3;

const FUSO_HORARIO = 'America/Sao_Paulo';
const DIAS_PROCURANDO_ABERTURA = 30;

// Pontuação de um texto na busca: 1 se contém o termo, senão a semelhança entre as palavras
function pontuacaoDaBusca(coluna, termo) {
  const texto = `unaccent(lower(${coluna}))`;
  return `GREATEST(strict_word_similarity(${termo}, ${texto}), CASE WHEN strpos(${texto}, ${termo}) > 0 THEN 1 ELSE 0 END)`;
}

// Data e minutos do dia no fuso da empresa
function momentoNoFuso(agora) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO_HORARIO,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(agora)
      .map((parte) => [parte.type, parte.value])
  );
  return {
    data: `${partes.year}-${partes.month}-${partes.day}`,
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
  };
}

function somarDias(data, dias) {
  const resultado = new Date(`${data}T00:00:00Z`);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado.toISOString().slice(0, 10);
}

function diaDaSemana(data) {
  return new Date(`${data}T00:00:00Z`).getUTCDay();
}

function paraMinutos(horario) {
  const [horas, minutos] = horario.split(':').map(Number);
  return horas * 60 + minutos;
}

// Dia sem atendimento: fechado, sem horário ou com exceção em vigor
function estaFechadoNaData(horario, data) {
  if (horario.fechado || !horario.abertura || !horario.fechamento) return true;
  const excecaoEmVigor = !horario.data_fim || data <= horario.data_fim;
  return horario.status !== 'normal' && excecaoEmVigor;
}

// Situação atual da empresa, inclusive com horário que vira a noite
function calcularFuncionamento(horarios, agora = new Date()) {
  const { data, minutos } = momentoNoFuso(agora);
  const ontem = somarDias(data, -1);

  const abertoAgora = horarios.some((horario) => {
    if (horario.dia_semana === diaDaSemana(data) && !estaFechadoNaData(horario, data)) {
      const abertura = paraMinutos(horario.abertura);
      const fechamento = paraMinutos(horario.fechamento);
      if (abertura > fechamento ? minutos >= abertura : minutos >= abertura && minutos < fechamento) {
        return true;
      }
    }
    if (horario.dia_semana === diaDaSemana(ontem) && !estaFechadoNaData(horario, ontem)) {
      const abertura = paraMinutos(horario.abertura);
      const fechamento = paraMinutos(horario.fechamento);
      return abertura > fechamento && minutos < fechamento;
    }
    return false;
  });

  if (abertoAgora) {
    return { aberto_agora: true, proxima_abertura: null };
  }

  for (let dias = 0; dias <= DIAS_PROCURANDO_ABERTURA; dias++) {
    const dataTestada = somarDias(data, dias);
    const proximo = horarios.find(
      (horario) =>
        horario.dia_semana === diaDaSemana(dataTestada) &&
        !estaFechadoNaData(horario, dataTestada) &&
        (dias > 0 || paraMinutos(horario.abertura) > minutos)
    );
    if (proximo) {
      return {
        aberto_agora: false,
        proxima_abertura: {
          data: dataTestada,
          dia_semana: proximo.dia_semana,
          hora: proximo.abertura.slice(0, 5),
        },
      };
    }
  }

  return { aberto_agora: false, proxima_abertura: null };
}

// LISTAR empresas (rota pública) — só empresas já APROVADAS aparecem aqui
router.get('/', async (req, res) => {
  try {
    const { categoria } = req.query;
    const busca = typeof req.query.busca === 'string' ? req.query.busca.trim() : '';
    const valores = [];

    let juncaoDaBusca = '';
    if (busca) {
      valores.push(busca, SEMELHANCA_MINIMA);
      const termo = 'unaccent(lower($1::text))';
      juncaoDaBusca = `
      CROSS JOIN LATERAL (
        SELECT GREATEST(
          ${pontuacaoDaBusca('e.nome_fantasia', termo)},
          COALESCE((
            SELECT MAX(${pontuacaoDaBusca('c3.nome', termo)})
            FROM empresa_categoria ec3
            JOIN categorias c3 ON c3.id_categoria = ec3.categoria_id
            WHERE ec3.empresa_id = e.id_empresa
          ), 0),
          COALESCE((
            SELECT MAX(${pontuacaoDaBusca('p.nome', termo)})
            FROM produtos p
            WHERE p.empresa_id = e.id_empresa AND p.disponivel = TRUE
          ), 0)
        ) AS relevancia
      ) pontuacao`;
    }

    let sql = `
      SELECT
        e.id_empresa,
        e.nome_fantasia,
        e.tipo,
        e.descricao,
        e.telefone,
        e.site,
        e.google_maps_url,
        e.nota_media,
        e.total_avaliacoes,
        e.foto_perfil_url,
        en.endereco,
        en.bairro,
        en.latitude,
        en.longitude,
        STRING_AGG(DISTINCT c.nome, ', ') AS categorias,
        ARRAY(SELECT f.url FROM fotos_empresa f WHERE f.empresa_id = e.id_empresa
              ORDER BY f.ordem, f.id_foto LIMIT 2) AS fotos
      FROM empresas e
      LEFT JOIN enderecos en ON en.empresa_id = e.id_empresa
      LEFT JOIN empresa_categoria ec ON ec.empresa_id = e.id_empresa
      LEFT JOIN categorias c ON c.id_categoria = ec.categoria_id
      ${juncaoDaBusca}
      WHERE e.status = 'aprovada'
    `;

    if (busca) {
      sql += ` AND pontuacao.relevancia >= $2`;
    }

    if (categoria) {
      valores.push(categoria);
      sql += ` AND e.id_empresa IN (
        SELECT ec2.empresa_id FROM empresa_categoria ec2
        JOIN categorias c2 ON c2.id_categoria = ec2.categoria_id
        WHERE c2.nome = $${valores.length}
      )`;
    }

    sql += ` GROUP BY e.id_empresa, en.endereco, en.bairro, en.latitude, en.longitude`;

    if (busca) {
      sql += `, pontuacao.relevancia ORDER BY pontuacao.relevancia DESC, e.nome_fantasia`;
    }

    const resultado = await pool.query(sql, valores);
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar empresas.' });
  }
});

// Devolve o rascunho mais recente (ainda não enviado para aprovação) do usuário logado
router.get('/rascunho-atual', verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT e.*, en.endereco, en.bairro, en.referencia, en.latitude, en.longitude,
              COALESCE((SELECT json_agg(c.nome ORDER BY c.nome)
                        FROM empresa_categoria ec JOIN categorias c ON c.id_categoria = ec.categoria_id
                        WHERE ec.empresa_id = e.id_empresa), '[]') AS categorias
       FROM empresas e
       LEFT JOIN enderecos en ON en.empresa_id = e.id_empresa
       WHERE e.id_usuario = $1 AND e.status = 'rascunho'
       ORDER BY e.data_cadastro DESC LIMIT 1`,
      [req.usuario.id]
    );

    if (!resultado.rows[0]) {
      return res.json({ existeRascunho: false });
    }

    return res.json({ existeRascunho: true, empresa: resultado.rows[0] });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar rascunho.' });
  }
});

// Fila de aprovação: empresas esperando, com os dados do cadastro e o dono
router.get('/pendentes', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT e.id_empresa, e.nome_fantasia, e.tipo, e.descricao, e.telefone, e.site, e.foto_perfil_url,
              e.verificado_em, e.metodo_verificacao, e.data_cadastro, e.enviada_para_aprovacao_em,
              en.endereco, en.bairro, en.referencia,
              u.nome AS dono_nome, u.email AS dono_email,
              COALESCE((SELECT json_agg(c.nome ORDER BY c.nome)
                        FROM empresa_categoria ec JOIN categorias c ON c.id_categoria = ec.categoria_id
                        WHERE ec.empresa_id = e.id_empresa), '[]') AS categorias,
              COALESCE((SELECT json_agg(f.url ORDER BY f.ordem, f.id_foto)
                        FROM fotos_empresa f WHERE f.empresa_id = e.id_empresa), '[]') AS fotos,
              (SELECT COUNT(*)::int FROM produtos p
               WHERE p.empresa_id = e.id_empresa AND p.disponivel = TRUE) AS total_produtos
       FROM empresas e
       JOIN usuarios u ON u.id_usuario = e.id_usuario
       LEFT JOIN LATERAL (
         SELECT endereco, bairro, referencia FROM enderecos
         WHERE empresa_id = e.id_empresa ORDER BY id_endereco LIMIT 1
       ) en ON TRUE
       WHERE e.status = 'pendente_aprovacao'
       ORDER BY e.enviada_para_aprovacao_em ASC`
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao listar empresas pendentes.' });
  }
});

// Empresas do usuário logado, em qualquer status
router.get('/minhas', verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT e.id_empresa, e.nome_fantasia, e.tipo, e.status, e.motivo_rejeicao,
              e.status_verificacao, e.nota_media, e.total_avaliacoes, e.data_cadastro,
              e.enviada_para_aprovacao_em,
              en.endereco, en.bairro,
              (SELECT f.url FROM fotos_empresa f
               WHERE f.empresa_id = e.id_empresa
               ORDER BY f.ordem, f.id_foto LIMIT 1) AS foto,
              COALESCE((SELECT json_agg(c.nome ORDER BY c.nome)
                        FROM empresa_categoria ec JOIN categorias c ON c.id_categoria = ec.categoria_id
                        WHERE ec.empresa_id = e.id_empresa), '[]') AS categorias
       FROM empresas e
       LEFT JOIN LATERAL (
         SELECT endereco, bairro FROM enderecos
         WHERE empresa_id = e.id_empresa ORDER BY id_endereco LIMIT 1
       ) en ON TRUE
       WHERE e.id_usuario = $1
       ORDER BY e.data_cadastro DESC`,
      [req.usuario.id]
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao listar suas empresas.' });
  }
});

// Detalhe completo da empresa (só aprovada, ou em qualquer situação) ou null
async function detalheEmpresa(id, apenasAprovada = true) {
  const resultado = await pool.query(
    `SELECT e.id_empresa, e.nome_fantasia, e.tipo, e.descricao, e.telefone, e.site, e.status, e.motivo_rejeicao,
            e.google_maps_url, e.nota_media, e.total_avaliacoes, e.data_cadastro, e.foto_perfil_url,
            en.endereco, en.bairro, en.referencia, en.latitude, en.longitude
     FROM empresas e
     LEFT JOIN LATERAL (
       SELECT endereco, bairro, referencia, latitude, longitude FROM enderecos
       WHERE empresa_id = e.id_empresa ORDER BY id_endereco LIMIT 1
     ) en ON TRUE
     WHERE e.id_empresa = $1 AND ($2 = FALSE OR e.status = 'aprovada')`,
    [id, apenasAprovada]
  );
  if (!resultado.rows[0]) return null;

  const [categorias, fotos, horarios] = await Promise.all([
    pool.query(
      `SELECT c.nome
       FROM empresa_categoria ec
       JOIN categorias c ON c.id_categoria = ec.categoria_id
       WHERE ec.empresa_id = $1
       ORDER BY c.nome`,
      [id]
    ),
    pool.query('SELECT id_foto, url, ordem FROM fotos_empresa WHERE empresa_id = $1 ORDER BY ordem, id_foto', [id]),
    pool.query(
      `SELECT id_horario, empresa_id, dia_semana, abertura, fechamento, fechado,
              to_char(data_fim, 'YYYY-MM-DD') AS data_fim, status
       FROM horarios
       WHERE empresa_id = $1
       ORDER BY dia_semana, abertura`,
      [id]
    ),
  ]);

  return {
    ...resultado.rows[0],
    categorias: categorias.rows.map((categoria) => categoria.nome),
    fotos: fotos.rows,
    horarios: horarios.rows,
    ...calcularFuncionamento(horarios.rows),
  };
}

// DETALHE de uma empresa (pública, mas só se estiver aprovada)
router.get('/:id', async (req, res) => {
  try {
    const empresa = await detalheEmpresa(req.params.id);
    if (!empresa) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }
    return res.json(empresa);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar empresa.' });
  }
});

// Detalhe para o dono ou o admin, em qualquer situação (edição e reenvio)
router.get('/:id/edicao', verificarToken, verificarDonoEmpresa, async (req, res) => {
  try {
    return res.json(await detalheEmpresa(req.empresa.id_empresa, false));
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar empresa.' });
  }
});

const TIPOS_EMPRESA = ['comercio', 'servico', 'ambos'];

// Nome da empresa limpo, ou null se inválido
function validarNomeEmpresa(nome) {
  if (typeof nome !== 'string') return null;
  const limpo = nome.trim();
  return limpo && limpo.length <= 150 ? limpo : null;
}

// Ids das categorias pelos nomes (só as que existem)
async function idsDasCategorias(cliente, nomes) {
  const resultado = await cliente.query('SELECT id_categoria FROM categorias WHERE nome = ANY($1::text[])', [nomes]);
  return resultado.rows.map((linha) => linha.id_categoria);
}

// PASSO 1: cria o rascunho com nome + categorias
router.post('/rascunho', verificarToken, async (req, res) => {
  const nome = validarNomeEmpresa(req.body?.nome_fantasia);
  const categorias = Array.isArray(req.body?.categorias) ? req.body.categorias.filter((c) => typeof c === 'string') : [];
  if (!nome) {
    return res.status(400).json({ erro: 'O nome da empresa é obrigatório e pode ter até 150 letras.' });
  }
  if (!categorias.length) {
    return res.status(400).json({ erro: 'Escolha pelo menos uma categoria.' });
  }

  const cliente = await pool.connect();
  try {
    const ids = await idsDasCategorias(cliente, categorias);
    if (!ids.length) {
      return res.status(400).json({ erro: 'Categoria inválida.' });
    }

    // Empresa e categorias juntas (tudo ou nada)
    await cliente.query('BEGIN');
    const novaEmpresa = await cliente.query(
      `INSERT INTO empresas (id_usuario, nome_fantasia, status)
       VALUES ($1, $2, 'rascunho') RETURNING *`,
      [req.usuario.id, nome]
    );
    const empresa = novaEmpresa.rows[0];
    for (const idCategoria of ids) {
      await cliente.query('INSERT INTO empresa_categoria (empresa_id, categoria_id) VALUES ($1, $2)', [empresa.id_empresa, idCategoria]);
    }
    await cliente.query('COMMIT');

    return res.status(201).json({ ...empresa, categorias });
  } catch (erro) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao criar rascunho de empresa.' });
  } finally {
    cliente.release();
  }
});

// Área de Taquara aceita na busca do endereço (oeste, norte, leste, sul)
const AREA_TAQUARA = '-50.86,-29.58,-50.70,-29.72';
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

async function buscarCoordenadas(consulta) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br`
    + `&viewbox=${AREA_TAQUARA}&bounded=1&q=${encodeURIComponent(consulta)}`;
  const resposta = await fetch(url, {
    headers: { 'User-Agent': 'DivulgaMap (divulgamap.oficial@gmail.com)' },
  });
  const dados = await resposta.json();
  return dados[0] ? { latitude: parseFloat(dados[0].lat), longitude: parseFloat(dados[0].lon) } : null;
}

// Coordenadas do endereço em Taquara: completo, sem o bairro e, por último, só a rua (sem o número)
async function geocodificarEndereco(endereco, bairro) {
  const rua = endereco.replace(/[,\s]*(n[º°o.]?\s*)?\d+.*$/i, '').trim();
  const tentativas = [`${endereco}, ${bairro}, Taquara, RS`, `${endereco}, Taquara, RS`];
  if (rua && rua !== endereco) tentativas.push(`${rua}, Taquara, RS`);

  for (const [indice, consulta] of tentativas.entries()) {
    if (indice > 0) await esperar(1000); // limite do Nominatim: 1 consulta por segundo
    const coordenadas = await buscarCoordenadas(consulta);
    if (coordenadas) return coordenadas;
  }
  return null;
}

// Texto opcional: undefined (não enviado), null (apagar) ou o texto limpo; erro se grande demais
function textoOpcional(valor, maximo) {
  if (valor === undefined) return { valor: undefined };
  if (valor === null || (typeof valor === 'string' && !valor.trim())) return { valor: null };
  if (typeof valor !== 'string' || valor.trim().length > maximo) return { erro: true };
  return { valor: valor.trim() };
}

// PASSOS 1/2/3/5/8/9: atualiza qualquer campo do rascunho, um pedaço por vez
router.patch('/:id', verificarToken, verificarDonoEmpresa, async (req, res) => {
  try {
    const { id } = req.params;
    const corpo = req.body ?? {};
    const { tipo, horarios, descricao } = corpo;

    if (tipo !== undefined && !TIPOS_EMPRESA.includes(tipo)) {
      return res.status(400).json({ erro: 'tipo deve ser "comercio", "servico" ou "ambos".' });
    }
    let nome;
    if (corpo.nome_fantasia !== undefined) {
      nome = validarNomeEmpresa(corpo.nome_fantasia);
      if (!nome) return res.status(400).json({ erro: 'O nome da empresa é obrigatório e pode ter até 150 letras.' });
    }

    const campos = {
      telefone: textoOpcional(corpo.telefone, 20),
      site: textoOpcional(corpo.site, 255),
      google_maps_url: textoOpcional(corpo.google_maps_url, 500),
      endereco: textoOpcional(corpo.endereco, 255),
      bairro: textoOpcional(corpo.bairro, 100),
      referencia: textoOpcional(corpo.referencia, 150),
      foto_perfil_url: textoOpcional(corpo.foto_perfil_url, 500),
    };
    const LIMITES = { telefone: 20, site: 255, google_maps_url: 500, endereco: 255, bairro: 100, referencia: 150, foto_perfil_url: 500 };
    for (const [campo, resultado] of Object.entries(campos)) {
      if (resultado.erro) return res.status(400).json({ erro: `${campo} pode ter até ${LIMITES[campo]} caracteres.` });
    }

    // Categorias novas substituem as antigas
    if (corpo.categorias !== undefined) {
      const nomes = Array.isArray(corpo.categorias) ? corpo.categorias.filter((c) => typeof c === 'string') : [];
      const ids = await idsDasCategorias(pool, nomes);
      if (!ids.length) return res.status(400).json({ erro: 'Escolha pelo menos uma categoria.' });
      await pool.query('DELETE FROM empresa_categoria WHERE empresa_id = $1', [id]);
      for (const idCategoria of ids) {
        await pool.query('INSERT INTO empresa_categoria (empresa_id, categoria_id) VALUES ($1, $2)', [id, idCategoria]);
      }
    }

    // Contatos: enviado com valor grava, enviado vazio apaga, não enviado mantém
    const contato = (campo) => campos[campo].valor;
    const atualizada = await pool.query(
      `UPDATE empresas SET
        tipo = COALESCE($1, tipo),
        telefone = CASE WHEN $2 THEN $3 ELSE telefone END,
        site = CASE WHEN $4 THEN $5 ELSE site END,
        google_maps_url = CASE WHEN $6 THEN $7 ELSE google_maps_url END,
        descricao = COALESCE($8, descricao),
        nome_fantasia = COALESCE($9, nome_fantasia),
        foto_perfil_url = CASE WHEN $11 THEN $12 ELSE foto_perfil_url END
       WHERE id_empresa = $10
       RETURNING *`,
      [
        tipo ?? null,
        contato('telefone') !== undefined, contato('telefone') ?? null,
        contato('site') !== undefined, contato('site') ?? null,
        contato('google_maps_url') !== undefined, contato('google_maps_url') ?? null,
        descricao ?? null, nome ?? null, id,
        contato('foto_perfil_url') !== undefined, contato('foto_perfil_url') ?? null,
      ]
    );

    // Endereço: novo ou alterado procura de novo o ponto no mapa
    const endereco = contato('endereco');
    const bairro = contato('bairro');
    const referencia = contato('referencia');
    if (endereco !== undefined || bairro !== undefined || referencia !== undefined) {
      const existente = (await pool.query('SELECT * FROM enderecos WHERE empresa_id = $1', [id])).rows[0];
      const enderecoFinal = endereco !== undefined ? endereco : existente?.endereco;
      const bairroFinal = bairro !== undefined ? bairro : existente?.bairro;
      const referenciaFinal = referencia !== undefined ? referencia : existente?.referencia ?? null;
      if (!enderecoFinal || !bairroFinal) {
        return res.status(400).json({ erro: 'Endereço e bairro são obrigatórios.' });
      }

      let coordenadas = existente ? { latitude: existente.latitude, longitude: existente.longitude } : null;
      const mudou = !existente || enderecoFinal !== existente.endereco || bairroFinal !== existente.bairro;
      if (mudou) {
        coordenadas = await geocodificarEndereco(enderecoFinal, bairroFinal);
        if (!coordenadas) {
          return res.status(400).json({ erro: 'Não achamos esse endereço em Taquara. Confira o nome da rua e o bairro.' });
        }
      }

      if (existente) {
        await pool.query(
          `UPDATE enderecos SET endereco = $1, bairro = $2, referencia = $3, latitude = $4, longitude = $5
           WHERE empresa_id = $6`,
          [enderecoFinal, bairroFinal, referenciaFinal, coordenadas.latitude, coordenadas.longitude, id]
        );
      } else {
        await pool.query(
          `INSERT INTO enderecos (empresa_id, endereco, bairro, referencia, latitude, longitude)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, enderecoFinal, bairroFinal, referenciaFinal, coordenadas.latitude, coordenadas.longitude]
        );
      }
      atualizada.rows[0] = {
        ...atualizada.rows[0],
        endereco: enderecoFinal, bairro: bairroFinal, referencia: referenciaFinal,
        latitude: coordenadas.latitude, longitude: coordenadas.longitude,
      };
    }

    // Horários
    if (Array.isArray(horarios)) {
      for (const dia of horarios) {
        const horarioExistente = await pool.query(
          'SELECT * FROM horarios WHERE empresa_id = $1 AND dia_semana = $2',
          [id, dia.dia_semana]
        );

        if (horarioExistente.rows[0]) {
          await pool.query(
            `UPDATE horarios SET
              abertura = $1, fechamento = $2, fechado = $3
             WHERE empresa_id = $4 AND dia_semana = $5`,
            [dia.abertura, dia.fechamento, dia.fechado || false, id, dia.dia_semana]
          );
        } else {
          await pool.query(
            `INSERT INTO horarios (empresa_id, dia_semana, abertura, fechamento, fechado)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, dia.dia_semana, dia.abertura, dia.fechamento, dia.fechado || false]
          );
        }
      }
    }

    return res.json(atualizada.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao atualizar empresa.' });
  }
});

// PASSO 4: empresas aprovadas com nome parecido ou no mesmo endereço
router.post('/verificar-duplicidade', verificarToken, async (req, res) => {
  try {
    const nome = typeof req.body?.nome_fantasia === 'string' ? req.body.nome_fantasia.trim() : '';
    const endereco = typeof req.body?.endereco === 'string' ? req.body.endereco.trim() : '';
    if (!nome && endereco.length < 5) {
      return res.json({ possivelDuplicata: false, correspondencias: [] });
    }

    const nomeNormal = 'unaccent(lower(e.nome_fantasia))';
    const resultado = await pool.query(
      `SELECT e.id_empresa, e.nome_fantasia, en.endereco, en.bairro, en.referencia
       FROM empresas e
       LEFT JOIN enderecos en ON en.empresa_id = e.id_empresa
       WHERE e.status = 'aprovada'
         AND (
           ($1 <> '' AND (similarity(${nomeNormal}, unaccent(lower($1))) >= 0.4
                          OR strpos(${nomeNormal}, unaccent(lower($1))) > 0))
           OR (length($2) >= 5 AND unaccent(lower(en.endereco)) = unaccent(lower($2)))
         )
       ORDER BY similarity(${nomeNormal}, unaccent(lower($1))) DESC
       LIMIT 5`,
      [nome, endereco]
    );

    return res.json({
      possivelDuplicata: resultado.rows.length > 0,
      correspondencias: resultado.rows,
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao verificar duplicidade.' });
  }
});

// Apaga um rascunho do próprio usuário (empresas enviadas ou aprovadas não)
router.delete('/:id', verificarToken, verificarDonoEmpresa, async (req, res) => {
  try {
    if (req.empresa.status !== 'rascunho') {
      return res.status(400).json({ erro: 'Só rascunhos podem ser apagados por aqui.' });
    }
    await pool.query('DELETE FROM empresas WHERE id_empresa = $1', [req.empresa.id_empresa]);
    return res.json({ mensagem: 'Rascunho apagado.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao apagar rascunho.' });
  }
});

// Passo 4 (opcional): "essa empresa já cadastrada é minha" → pede pra assumir o cadastro
router.post('/:id/reivindicar', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { mensagem } = req.body; // ex: "sou o dono, meu CNPJ é..."

    const empresa = await pool.query(`SELECT * FROM empresas WHERE id_empresa = $1 AND status = 'aprovada'`, [id]);
    if (!empresa.rows[0]) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }

    const solicitacao = await pool.query(
      `INSERT INTO solicitacoes_empresa (empresa_id, id_usuario, tipo, mensagem)
       VALUES ($1, $2, 'reivindicacao', $3) RETURNING *`,
      [id, req.usuario.id, mensagem]
    );

    await notificarAdminPorEmail(
      'Nova reivindicação de empresa',
      `A empresa "${empresa.rows[0].nome_fantasia}" (id ${id}) foi reivindicada por outro usuário. Mensagem: ${mensagem || '(nenhuma)'}`
    );

    return res.status(201).json(solicitacao.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao registrar reivindicação.' });
  }
});

// Passo 4: "essa empresa parece errada/duplicada/falsa" → denúncia
router.post('/:id/denunciar', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, mensagem } = req.body ?? {};
    if (!['duplicada', 'informacoes_incorretas', 'nao_existe', 'outro'].includes(motivo)) {
      return res.status(400).json({ erro: 'motivo deve ser "duplicada", "informacoes_incorretas", "nao_existe" ou "outro".' });
    }

    const empresa = await pool.query('SELECT * FROM empresas WHERE id_empresa = $1', [id]);
    if (!empresa.rows[0]) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }

    const solicitacao = await pool.query(
      `INSERT INTO solicitacoes_empresa (empresa_id, id_usuario, tipo, motivo, mensagem)
       VALUES ($1, $2, 'denuncia', $3, $4) RETURNING *`,
      [id, req.usuario.id, motivo, mensagem]
    );

    await notificarAdminPorEmail(
      'Nova denúncia de empresa',
      `A empresa "${empresa.rows[0].nome_fantasia}" (id ${id}) foi denunciada. Motivo: ${motivo}. Mensagem: ${mensagem || '(nenhuma)'}`
    );

    return res.status(201).json(solicitacao.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao registrar denúncia.' });
  }
});

// Aviso por e-mail ao admin; uma falha no envio não desfaz o pedido já gravado
async function notificarAdminPorEmail(assunto, texto) {
  try {
    const nodemailer = require('nodemailer');
    const transportador = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_SENHA_APP },
    });

    await transportador.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `[DivulgaMap] ${assunto}`,
      text: texto,
    });
  } catch (erro) {
    console.error('Aviso ao admin não enviado:', erro.message);
  }
}

// PASSO 6: gera e envia o código (por e-mail)
router.post('/:id/enviar-codigo', verificarToken, verificarDonoEmpresa, async (req, res) => {
  try {
    const { id } = req.params;
    const { metodo } = req.body; // 'email' ou 'sms'
    if (!['email', 'sms'].includes(metodo)) return res.status(400).json({ erro: 'Escolha SMS ou e-mail.' });

    const codigo = String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos

    await pool.query(
      `INSERT INTO codigos_verificacao (empresa_id, codigo, metodo, expira_em)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
      [id, codigo, metodo]
    );

    if (metodo === 'email') {
      const nodemailer = require('nodemailer');
      const transportador = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_SENHA_APP },
      });

      const usuario = await pool.query('SELECT email FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);

      await transportador.sendMail({
        from: process.env.EMAIL_USER,
        to: usuario.rows[0].email,
        subject: 'Seu código de verificação — DivulgaMap',
        text: `Seu código é: ${codigo}. Ele expira em 10 minutos.`,
      });
    } else if (metodo === 'sms') {
      // TODO: integrar com um serviço de SMS pago (ex: Twilio) quando o app tiver receita
      console.log(`[SMS simulado] Código para empresa ${id}: ${codigo}`);
    }

    return res.json({ mensagem: 'Código enviado.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao enviar código.' });
  }
});

// PASSO 7: confirma o código digitado
router.post('/:id/confirmar-codigo', verificarToken, verificarDonoEmpresa, async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo } = req.body;

    const resultado = await pool.query(
      `SELECT * FROM codigos_verificacao
       WHERE empresa_id = $1 AND codigo = $2 AND usado = FALSE AND expira_em > NOW()
       ORDER BY criado_em DESC LIMIT 1`,
      [id, codigo]
    );

    const registro = resultado.rows[0];
    if (!registro) {
      return res.status(400).json({ erro: 'Código inválido ou expirado.' });
    }

    await pool.query('UPDATE codigos_verificacao SET usado = TRUE WHERE id_codigo = $1', [registro.id_codigo]);
    await pool.query(
      'UPDATE empresas SET verificado_em = NOW(), metodo_verificacao = $1 WHERE id_empresa = $2',
      [registro.metodo, id]
    );

    return res.json({ verificado: true });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao confirmar código.' });
  }
});

// PASSO 10: guarda a URL de uma foto (upload do app pro Cloudinary)
router.post('/:id/fotos', verificarToken, verificarDonoEmpresa, async (req, res) => {
  try {
    const { id } = req.params;
    const { url, ordem } = req.body;

    const foto = await pool.query(
      'INSERT INTO fotos_empresa (empresa_id, url, ordem) VALUES ($1, $2, $3) RETURNING *',
      [id, url, ordem || 0]
    );

    return res.status(201).json(foto.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao salvar foto.' });
  }
});

// Remove uma foto do ambiente (só o dono)
router.delete('/:id/fotos/:fotoId', verificarToken, verificarDonoEmpresa, async (req, res) => {
  try {
    const fotoId = idValido(req.params.fotoId);
    const removida = fotoId
      ? await pool.query('DELETE FROM fotos_empresa WHERE id_foto = $1 AND empresa_id = $2 RETURNING id_foto', [fotoId, req.empresa.id_empresa])
      : { rows: [] };
    if (!removida.rows[0]) {
      return res.status(404).json({ erro: 'Foto não encontrada.' });
    }
    return res.json({ mensagem: 'Foto removida.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao remover a foto.' });
  }
});

// PASSO 13: muda o status de rascunho para "esperando aprovação"
router.post('/:id/submeter', verificarToken, verificarDonoEmpresa, async (req, res) => {
  try {
    const { id } = req.params;
    const dadosEmpresa = req.empresa;

    // Só rascunho ou rejeitada podem ir para aprovação
    if (!['rascunho', 'rejeitada'].includes(dadosEmpresa.status)) {
      return res.status(400).json({ erro: 'Esta empresa já foi enviada para aprovação ou já está aprovada.' });
    }
    if (!dadosEmpresa.verificado_em) {
      return res.status(400).json({ erro: 'Complete a verificação (SMS/e-mail) antes de enviar.' });
    }

    // CORREÇÃO: antes, nada aqui checava se a empresa já tinha um endereço cadastrado —
    // como latitude/longitude moram na tabela enderecos (não em empresas), era possível
    // aprovar uma empresa sem endereço, e ela nunca apareceria no mapa da ExplorarScreen
    // (que filtra quem não tem latitude/longitude). Endereço é essencial pro propósito
    // do app, então vira uma checagem obrigatória do passo 13, igual nome/tipo/telefone.
    const endereco = await pool.query('SELECT 1 FROM enderecos WHERE empresa_id = $1', [id]);
    if (!endereco.rows[0]) {
      return res.status(400).json({ erro: 'Cadastre o endereço (passo 3) antes de enviar para aprovação.' });
    }

    const camposObrigatorios = ['nome_fantasia', 'tipo', 'telefone'];
    const faltando = camposObrigatorios.filter((campo) => !dadosEmpresa[campo]);
    if (faltando.length > 0) {
      return res.status(400).json({ erro: `Campos obrigatórios faltando: ${faltando.join(', ')}` });
    }

    // Propositalmente FORA dessa checagem (ou seja, opcionais e podem ser preenchidos
    // depois de aprovada): site, google_maps_url, horarios, descricao, fotos e a
    // planilha de produtos. Endereço, nome_fantasia, tipo e telefone bloqueiam o envio
    // para aprovação.

    const atualizada = await pool.query(
      `UPDATE empresas SET status = 'pendente_aprovacao', enviada_para_aprovacao_em = NOW()
       WHERE id_empresa = $1 RETURNING *`,
      [id]
    );

    return res.json(atualizada.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao enviar empresa para aprovação.' });
  }
});

// Resposta quando a mudança de status não se aplica: 404 se a empresa não existe, 400 se o status não permite
async function responderStatusInvalido(res, id, mensagem) {
  const existe = await pool.query('SELECT 1 FROM empresas WHERE id_empresa = $1', [id]);
  if (!existe.rows[0]) {
    return res.status(404).json({ erro: 'Empresa não encontrada.' });
  }
  return res.status(400).json({ erro: mensagem });
}

// Aprovação: só empresas esperando aprovação
router.patch('/:id/aprovar', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }
    const atualizada = await pool.query(
      `UPDATE empresas SET status = 'aprovada', motivo_rejeicao = NULL
       WHERE id_empresa = $1 AND status = 'pendente_aprovacao' RETURNING *`,
      [id]
    );
    if (!atualizada.rows[0]) {
      return responderStatusInvalido(res, id, 'Só empresas esperando aprovação podem ser aprovadas.');
    }
    return res.json(atualizada.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao aprovar empresa.' });
  }
});

// Rejeição: empresas esperando aprovação ou já aprovadas
router.patch('/:id/rejeitar', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }
    const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
    if (!motivo || motivo.length > 500) {
      return res.status(400).json({ erro: 'Escreva o motivo da rejeição (até 500 letras).' });
    }
    const atualizada = await pool.query(
      `UPDATE empresas SET status = 'rejeitada', motivo_rejeicao = $1
       WHERE id_empresa = $2 AND status IN ('pendente_aprovacao', 'aprovada') RETURNING *`,
      [motivo, id]
    );
    if (!atualizada.rows[0]) {
      return responderStatusInvalido(res, id, 'Só empresas esperando aprovação ou aprovadas podem ser rejeitadas.');
    }
    return res.json(atualizada.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao rejeitar empresa.' });
  }
});

// Lista tudo que está esperando revisão (reivindicações e denúncias)
router.get('/solicitacoes/pendentes', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT s.*, e.nome_fantasia, e.status AS status_empresa,
              u.nome AS solicitante_nome, u.email AS solicitante_email
       FROM solicitacoes_empresa s
       JOIN empresas e ON e.id_empresa = s.empresa_id
       JOIN usuarios u ON u.id_usuario = s.id_usuario
       WHERE s.status = 'pendente'
       ORDER BY s.criado_em ASC`
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao listar solicitações pendentes.' });
  }
});

// Aprovação: reivindicação troca o dono (e encerra as outras do mesmo cadastro); denúncia rejeita a empresa
router.patch('/solicitacoes/:id/aprovar', verificarToken, verificarAdmin, async (req, res) => {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const solicitacao = await cliente.query(
      'SELECT * FROM solicitacoes_empresa WHERE id_solicitacao = $1 FOR UPDATE',
      [req.params.id]
    );
    if (!solicitacao.rows[0]) {
      await cliente.query('ROLLBACK');
      return res.status(404).json({ erro: 'Solicitação não encontrada.' });
    }
    const { id_solicitacao, status, tipo, empresa_id, id_usuario, motivo } = solicitacao.rows[0];
    if (status !== 'pendente') {
      await cliente.query('ROLLBACK');
      return res.status(400).json({ erro: 'Esta solicitação já foi analisada.' });
    }

    if (tipo === 'reivindicacao') {
      await cliente.query('UPDATE empresas SET id_usuario = $1 WHERE id_empresa = $2', [id_usuario, empresa_id]);
      await cliente.query(
        `UPDATE solicitacoes_empresa SET status = 'rejeitada'
         WHERE empresa_id = $1 AND tipo = 'reivindicacao' AND status = 'pendente' AND id_solicitacao <> $2`,
        [empresa_id, id_solicitacao]
      );
    } else if (tipo === 'denuncia') {
      await cliente.query(
        `UPDATE empresas SET status = 'rejeitada', motivo_rejeicao = $1 WHERE id_empresa = $2`,
        [`Denúncia procedente: ${motivo || 'sem motivo especificado'}`, empresa_id]
      );
    }

    const atualizada = await cliente.query(
      `UPDATE solicitacoes_empresa SET status = 'aprovada' WHERE id_solicitacao = $1 RETURNING *`,
      [id_solicitacao]
    );
    await cliente.query('COMMIT');
    return res.json(atualizada.rows[0]);
  } catch (erro) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao aprovar solicitação.' });
  } finally {
    cliente.release();
  }
});

router.patch('/solicitacoes/:id/rejeitar', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const atualizada = await pool.query(
      `UPDATE solicitacoes_empresa SET status = 'rejeitada'
       WHERE id_solicitacao = $1 AND status = 'pendente' RETURNING *`,
      [id]
    );
    if (!atualizada.rows[0]) {
      const existe = await pool.query('SELECT 1 FROM solicitacoes_empresa WHERE id_solicitacao = $1', [id]);
      return existe.rows[0]
        ? res.status(400).json({ erro: 'Esta solicitação já foi analisada.' })
        : res.status(404).json({ erro: 'Solicitação não encontrada.' });
    }
    return res.json(atualizada.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao rejeitar solicitação.' });
  }
});

module.exports = router;