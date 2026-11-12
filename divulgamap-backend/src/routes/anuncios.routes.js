const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');
const verificarDonoEmpresa = require('../middlewares/donoEmpresa');
const idValido = require('../utils/id');

const router = express.Router();

const FUSO_HORARIO = 'America/Sao_Paulo';
const FORMATOS = ['banner', 'faixa'];
const DIAS_MINIMO = 1;
const DIAS_MAXIMO = 30;
const VALOR_MINIMO_POR_DIA = 1;
const VALOR_MAXIMO = 10000;
const LIMITE_ATIVOS = 10;

// :id que não é número válido não chega ao banco
router.param('id', (req, res, next, valor) => {
  if (!idValido(valor)) {
    return res.status(404).json({ erro: 'Anúncio não encontrado.' });
  }
  next();
});

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

// URL http(s) limpa, ou null se inválida
function urlValida(valor) {
  if (typeof valor !== 'string') return null;
  const limpa = valor.trim();
  if (!limpa || limpa.length > 500) return null;
  try {
    const url = new URL(limpa);
    return ['http:', 'https:'].includes(url.protocol) ? limpa : null;
  } catch {
    return null;
  }
}

// Oferta em vigor (mesma regra de GET /promocoes/ativas)
const OFERTA_EM_VIGOR = `pr.status <> 'expirada'
  AND pr.data_inicio <= (NOW() AT TIME ZONE '${FUSO_HORARIO}')
  AND pr.data_fim >= (NOW() AT TIME ZONE '${FUSO_HORARIO}')`;

// Situação do anúncio pelas datas
const SITUACAO = `CASE
  WHEN a.status <> 'ativo' THEN a.status
  WHEN NOW() < a.data_inicio THEN 'agendado'
  WHEN NOW() >= a.data_fim THEN 'encerrado'
  ELSE 'no_ar' END`;

// Confere os dados de um anúncio novo; devolve { dados } ou { erro }
async function validarAnuncio(corpo, empresaId) {
  const formato = corpo.formato ?? 'banner';
  if (!FORMATOS.includes(formato)) return { erro: 'formato deve ser "banner" ou "faixa".' };

  const imagem = urlValida(corpo.imagem_url);
  if (!imagem) return { erro: 'imagem_url precisa ser um link http(s) de até 500 caracteres.' };

  const dias = Number(corpo.dias);
  if (!Number.isInteger(dias) || dias < DIAS_MINIMO || dias > DIAS_MAXIMO) {
    return { erro: `dias deve ser um número inteiro de ${DIAS_MINIMO} a ${DIAS_MAXIMO}.` };
  }

  const valor = Number(corpo.valor_investido);
  const centavos = valor * 100;
  if (!Number.isFinite(valor) || Math.abs(Math.round(centavos) - centavos) > 1e-6 || valor > VALOR_MAXIMO) {
    return { erro: `valor_investido deve ser um valor em reais de até R$ ${VALOR_MAXIMO}.` };
  }
  if (valor < dias * VALOR_MINIMO_POR_DIA) {
    return { erro: `O valor mínimo é R$ ${VALOR_MINIMO_POR_DIA} por dia (R$ ${dias * VALOR_MINIMO_POR_DIA} para ${dias} dias).` };
  }

  const temOferta = corpo.promocao_id !== undefined && corpo.promocao_id !== null && corpo.promocao_id !== '';
  const temLink = corpo.link_externo !== undefined && corpo.link_externo !== null && corpo.link_externo !== '';
  if (temOferta && temLink) return { erro: 'Escolha uma oferta ou um link externo, não os dois.' };

  let promocaoId = null;
  if (temOferta) {
    promocaoId = idValido(corpo.promocao_id);
    const oferta = promocaoId
      ? await pool.query(
        `SELECT 1 FROM promocoes pr WHERE pr.id_promocao = $1 AND pr.empresa_id = $2 AND pr.status <> 'expirada'
           AND pr.data_fim >= (NOW() AT TIME ZONE '${FUSO_HORARIO}')`,
        [promocaoId, empresaId]
      )
      : { rows: [] };
    if (!oferta.rows[0]) return { erro: 'A oferta precisa ser desta empresa e ainda não ter acabado.' };
  }

  let link = null;
  if (temLink) {
    link = urlValida(corpo.link_externo);
    if (!link) return { erro: 'link_externo precisa ser um link http(s) de até 500 caracteres.' };
  }

  return { dados: { formato, imagem, dias, valor, promocaoId, link } };
}

// CRIAR anúncio com pagamento (simulado: aprovado na hora)
router.post('/', verificarToken, verificarDonoEmpresa, async (req, res) => {
  if (req.empresa.status !== 'aprovada') {
    return res.status(400).json({ erro: 'Só empresas aprovadas podem anunciar.' });
  }
  const { dados, erro } = await validarAnuncio(req.body ?? {}, req.empresa.id_empresa).catch((e) => {
    console.error(e);
    return { erro: null };
  });
  if (!dados) {
    return erro
      ? res.status(400).json({ erro })
      : res.status(500).json({ erro: 'Erro ao criar anúncio.' });
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const anuncio = await cliente.query(
      `INSERT INTO anuncios (empresa_id, formato, imagem_url, promocao_id, link_externo, valor_investido, dias,
                             data_inicio, data_fim)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW() + make_interval(days => $7))
       RETURNING *`,
      [req.empresa.id_empresa, dados.formato, dados.imagem, dados.promocaoId, dados.link, dados.valor, dados.dias]
    );
    const idAnuncio = anuncio.rows[0].id_anuncio;

    // Pagamento simulado; aqui entraria a cobrança no gateway (ex.: Mercado Pago, M30)
    const pagamento = await cliente.query(
      `INSERT INTO pagamentos (anuncio_id, valor, status, gateway_id)
       VALUES ($1, $2, 'aprovado', $3) RETURNING *`,
      [idAnuncio, dados.valor, `simulado-${crypto.randomUUID()}`]
    );
    const ativado = await cliente.query(
      `UPDATE anuncios SET status = 'ativo' WHERE id_anuncio = $1 RETURNING *`,
      [idAnuncio]
    );
    await cliente.query('COMMIT');

    return res.status(201).json({ ...ativado.rows[0], pagamento: pagamento.rows[0] });
  } catch (erroBanco) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error(erroBanco);
    return res.status(500).json({ erro: 'Erro ao criar anúncio.' });
  } finally {
    cliente.release();
  }
});

// ANÚNCIOS EM VIGOR (pública): peso = valor ÷ dias, sorteio entre pesos iguais; destino do clique já resolvido
router.get('/ativos', async (req, res) => {
  try {
    const { formato } = req.query;
    if (formato !== undefined && !FORMATOS.includes(formato)) {
      return res.status(400).json({ erro: 'formato deve ser "banner" ou "faixa".' });
    }

    const resultado = await pool.query(
      `SELECT a.id_anuncio, a.formato, a.imagem_url, a.empresa_id, e.nome_fantasia AS empresa_nome,
              ROUND(a.valor_investido / a.dias, 2)::float8 AS peso,
              CASE WHEN a.link_externo IS NOT NULL THEN 'link'
                   WHEN o.id_promocao IS NOT NULL THEN 'oferta'
                   ELSE 'empresa' END AS destino,
              a.link_externo, o.id_promocao AS promocao_id
       FROM anuncios a
       JOIN empresas e ON e.id_empresa = a.empresa_id AND e.status = 'aprovada'
       LEFT JOIN LATERAL (
         SELECT pr.id_promocao FROM promocoes pr
         WHERE pr.id_promocao = a.promocao_id AND ${OFERTA_EM_VIGOR}
       ) o ON TRUE
       WHERE a.status = 'ativo' AND a.data_inicio <= NOW() AND a.data_fim > NOW()
         AND ($1::text IS NULL OR a.formato = $1)
       ORDER BY a.valor_investido / a.dias DESC, random()
       LIMIT $2`,
      [formato ?? null, LIMITE_ATIVOS * (formato ? 1 : FORMATOS.length)]
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar anúncios.' });
  }
});

// ANÚNCIOS das empresas do usuário logado, com os totais
router.get('/minhas', verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT a.*, e.nome_fantasia AS empresa_nome, ${SITUACAO} AS situacao,
              ROUND(a.valor_investido / a.dias, 2)::float8 AS peso,
              (SELECT COUNT(*)::int FROM eventos_anuncio ev WHERE ev.anuncio_id = a.id_anuncio AND ev.tipo = 'impressao') AS impressoes,
              (SELECT COUNT(*)::int FROM eventos_anuncio ev WHERE ev.anuncio_id = a.id_anuncio AND ev.tipo = 'clique') AS cliques
       FROM anuncios a
       JOIN empresas e ON e.id_empresa = a.empresa_id
       WHERE e.id_usuario = $1
       ORDER BY a.criado_em DESC`,
      [req.usuario.id]
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao listar seus anúncios.' });
  }
});

// Registro de impressão ou clique; só conta anúncio no ar, e o próprio dono não conta
function registrarEvento(tipo) {
  return async (req, res) => {
    try {
      const anuncio = await pool.query(
        `SELECT a.id_anuncio, e.id_usuario AS id_dono
         FROM anuncios a JOIN empresas e ON e.id_empresa = a.empresa_id
         WHERE a.id_anuncio = $1 AND a.status = 'ativo' AND a.data_inicio <= NOW() AND a.data_fim > NOW()
           AND e.status = 'aprovada'`,
        [req.params.id]
      );
      if (!anuncio.rows[0]) {
        return res.status(404).json({ erro: 'Anúncio não encontrado ou fora do ar.' });
      }

      const usuario = usuarioOpcional(req);
      if (usuario?.id === anuncio.rows[0].id_dono) {
        return res.json({ registrado: false });
      }

      // Usuário de conta já excluída fica como anônimo
      await pool.query(
        `INSERT INTO eventos_anuncio (anuncio_id, tipo, id_usuario)
         VALUES ($1, $2, (SELECT id_usuario FROM usuarios WHERE id_usuario = $3))`,
        [req.params.id, tipo, usuario?.id ?? null]
      );
      return res.status(201).json({ registrado: true });
    } catch (erro) {
      console.error(erro);
      return res.status(500).json({ erro: 'Erro ao registrar o evento.' });
    }
  };
}

router.post('/:id/impressao', registrarEvento('impressao'));
router.post('/:id/clique', registrarEvento('clique'));

// Empresa do anúncio, para a verificação do dono
async function carregarAnuncio(req, res, next) {
  try {
    const resultado = await pool.query(`SELECT a.*, ${SITUACAO} AS situacao FROM anuncios a WHERE a.id_anuncio = $1`, [req.params.id]);
    if (!resultado.rows[0]) {
      return res.status(404).json({ erro: 'Anúncio não encontrado.' });
    }
    req.anuncio = resultado.rows[0];
    req.empresaIdAlvo = resultado.rows[0].empresa_id;
    next();
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar anúncio.' });
  }
}

// MÉTRICAS (só o dono): impressões e cliques por dia, do início até hoje ou até o fim
router.get('/:id/metricas', verificarToken, carregarAnuncio, verificarDonoEmpresa, async (req, res) => {
  try {
    const porDia = await pool.query(
      `WITH dias AS (
         SELECT generate_series(
           (a.data_inicio AT TIME ZONE '${FUSO_HORARIO}')::date,
           (LEAST(NOW(), a.data_fim) AT TIME ZONE '${FUSO_HORARIO}')::date,
           INTERVAL '1 day'
         )::date AS dia
         FROM anuncios a WHERE a.id_anuncio = $1
       )
       SELECT to_char(d.dia, 'YYYY-MM-DD') AS dia,
              COUNT(ev.*) FILTER (WHERE ev.tipo = 'impressao')::int AS impressoes,
              COUNT(ev.*) FILTER (WHERE ev.tipo = 'clique')::int AS cliques
       FROM dias d
       LEFT JOIN eventos_anuncio ev
         ON ev.anuncio_id = $1 AND (ev.criado_em AT TIME ZONE '${FUSO_HORARIO}')::date = d.dia
       GROUP BY d.dia
       ORDER BY d.dia`,
      [req.anuncio.id_anuncio]
    );

    const impressoes = porDia.rows.reduce((soma, d) => soma + d.impressoes, 0);
    const cliques = porDia.rows.reduce((soma, d) => soma + d.cliques, 0);
    return res.json({
      anuncio: req.anuncio,
      totais: {
        impressoes,
        cliques,
        taxa_de_cliques: impressoes ? Math.round((cliques / impressoes) * 10000) / 100 : 0,
      },
      por_dia: porDia.rows,
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar as métricas.' });
  }
});

module.exports = router;
