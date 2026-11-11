const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');

const router = express.Router();

const FUSO_HORARIO = 'America/Sao_Paulo';
const MAXIMO_POR_USUARIO = 100;
const LIMITE_PADRAO = 20;
const LIMITE_MAXIMO = 50;
const TAMANHO_MAXIMO_TERMO = 100;

// Item visível: empresa aprovada, produto disponível de empresa aprovada ou promoção de empresa aprovada
const CONSULTA_ITEM = {
  empresa: `SELECT 1 FROM empresas WHERE id_empresa = $1 AND status = 'aprovada'`,
  produto: `SELECT 1 FROM produtos p JOIN empresas e ON e.id_empresa = p.empresa_id
            WHERE p.id_produto = $1 AND p.disponivel = TRUE AND e.status = 'aprovada'`,
  promocao: `SELECT 1 FROM promocoes pm JOIN empresas e ON e.id_empresa = pm.empresa_id
             WHERE pm.id_promocao = $1 AND e.status = 'aprovada'`,
};

function paraId(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST — registra uma busca ou um item visto (o registro anterior do mesmo item ou termo é substituído)
router.post('/', verificarToken, async (req, res) => {
  const { tipo_acao, tipo_item } = req.body ?? {};
  let itemId = null;
  let termo = null;

  if (tipo_acao === 'busca') {
    termo = typeof req.body.termo === 'string' ? req.body.termo.trim() : '';
    if (!termo || termo.length > TAMANHO_MAXIMO_TERMO) {
      return res.status(400).json({ erro: `termo é obrigatório na busca e pode ter até ${TAMANHO_MAXIMO_TERMO} letras.` });
    }
  } else if (tipo_acao === 'visualizacao') {
    if (!CONSULTA_ITEM[tipo_item]) {
      return res.status(400).json({ erro: 'tipo_item deve ser "empresa", "produto" ou "promocao".' });
    }
    itemId = paraId(req.body.item_id);
    if (!itemId) {
      return res.status(400).json({ erro: 'item_id é obrigatório na visualização.' });
    }
  } else {
    return res.status(400).json({ erro: 'tipo_acao deve ser "busca" ou "visualizacao".' });
  }

  const cliente = await pool.connect();
  try {
    if (tipo_acao === 'visualizacao') {
      const existe = await cliente.query(CONSULTA_ITEM[tipo_item], [itemId]);
      if (!existe.rows[0]) {
        return res.status(404).json({ erro: 'Item não encontrado.' });
      }
    }

    await cliente.query('BEGIN');

    // Remove o registro anterior do mesmo item ou termo
    if (tipo_acao === 'busca') {
      await cliente.query(
        `DELETE FROM historico WHERE usuario_id = $1 AND tipo_acao = 'busca' AND LOWER(termo) = LOWER($2)`,
        [req.usuario.id, termo]
      );
    } else {
      await cliente.query(
        `DELETE FROM historico WHERE usuario_id = $1 AND tipo_acao = 'visualizacao' AND tipo_item = $2 AND item_id = $3`,
        [req.usuario.id, tipo_item, itemId]
      );
    }

    const novo = await cliente.query(
      `INSERT INTO historico (usuario_id, tipo_acao, tipo_item, item_id, termo, criado_em)
       VALUES ($1, $2, $3, $4, $5, NOW() AT TIME ZONE 'UTC')
       RETURNING id_historico, tipo_acao, tipo_item, item_id, termo, (criado_em AT TIME ZONE 'UTC') AS criado_em`,
      [req.usuario.id, tipo_acao, tipo_acao === 'busca' ? null : tipo_item, itemId, termo]
    );

    // Mantém só os registros mais recentes
    await cliente.query(
      `DELETE FROM historico
       WHERE usuario_id = $1 AND id_historico NOT IN (
         SELECT id_historico FROM historico WHERE usuario_id = $1
         ORDER BY criado_em DESC, id_historico DESC LIMIT $2
       )`,
      [req.usuario.id, MAXIMO_POR_USUARIO]
    );

    await cliente.query('COMMIT');
    return res.status(201).json(novo.rows[0]);
  } catch (erro) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao registrar histórico.' });
  } finally {
    cliente.release();
  }
});

// GET — histórico do usuário logado, do mais recente para o mais antigo
router.get('/meus', verificarToken, async (req, res) => {
  try {
    const { tipo, limite } = req.query;
    const valores = [req.usuario.id, FUSO_HORARIO];
    let filtroTipo = '';

    if (tipo !== undefined && tipo !== '') {
      if (!['busca', 'visualizacao'].includes(tipo)) {
        return res.status(400).json({ erro: 'tipo deve ser "busca" ou "visualizacao".' });
      }
      valores.push(tipo);
      filtroTipo = `AND h.tipo_acao = $${valores.length}`;
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
         h.id_historico,
         h.tipo_acao,
         h.tipo_item,
         h.item_id,
         h.termo,
         (h.criado_em AT TIME ZONE 'UTC') AS criado_em,
         CASE h.tipo_item
           WHEN 'empresa' THEN e.nome_fantasia
           WHEN 'produto' THEN p.nome
           WHEN 'promocao' THEN pm.titulo
           ELSE h.termo
         END AS nome,
         CASE h.tipo_item
           WHEN 'produto' THEN p.foto_url
           WHEN 'promocao' THEN COALESCE(ppm.foto_url, foto.url)
           WHEN 'empresa' THEN foto.url
         END AS foto,
         empresa.id AS empresa_id,
         CASE WHEN h.tipo_item IN ('produto', 'promocao') THEN COALESCE(pe.nome_fantasia, pme.nome_fantasia) END AS empresa_nome,
         COALESCE(cp.nome, (
           SELECT c.nome FROM empresa_categoria ec
           JOIN categorias c ON c.id_categoria = ec.categoria_id
           WHERE ec.empresa_id = empresa.id
           ORDER BY c.nome LIMIT 1
         )) AS categoria,
         CASE WHEN h.tipo_item = 'promocao' THEN pm.data_fim < (NOW() AT TIME ZONE $2) END AS encerrada,
         CASE WHEN h.tipo_item IN ('empresa', 'produto') THEN EXISTS (
           SELECT 1 FROM salvos s
           WHERE s.usuario_id = h.usuario_id AND s.tipo_item = h.tipo_item AND s.item_id = h.item_id
         ) ELSE FALSE END AS salvo
       FROM historico h
       LEFT JOIN empresas e ON h.tipo_item = 'empresa' AND e.id_empresa = h.item_id
       LEFT JOIN produtos p ON h.tipo_item = 'produto' AND p.id_produto = h.item_id
       LEFT JOIN empresas pe ON pe.id_empresa = p.empresa_id
       LEFT JOIN promocoes pm ON h.tipo_item = 'promocao' AND pm.id_promocao = h.item_id
       LEFT JOIN empresas pme ON pme.id_empresa = pm.empresa_id
       LEFT JOIN produtos ppm ON ppm.id_produto = pm.produto_id
       LEFT JOIN categorias cp ON cp.id_categoria = COALESCE(p.categoria_id, ppm.categoria_id)
       CROSS JOIN LATERAL (SELECT COALESCE(e.id_empresa, pe.id_empresa, pme.id_empresa) AS id) empresa
       LEFT JOIN LATERAL (
         SELECT f.url FROM fotos_empresa f
         WHERE f.empresa_id = empresa.id
         ORDER BY f.ordem, f.id_foto LIMIT 1
       ) foto ON TRUE
       WHERE h.usuario_id = $1
         AND (
           h.tipo_acao = 'busca'
           OR e.status = 'aprovada'
           OR (p.disponivel = TRUE AND pe.status = 'aprovada')
           OR pme.status = 'aprovada'
         )
         ${filtroTipo}
       ORDER BY h.criado_em DESC, h.id_historico DESC
       LIMIT $${valores.length}`,
      valores
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar histórico.' });
  }
});

// DELETE — apaga um registro (só o dono)
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const id = paraId(req.params.id);
    const registro = id ? await pool.query('SELECT usuario_id FROM historico WHERE id_historico = $1', [id]) : { rows: [] };
    if (!registro.rows[0]) {
      return res.status(404).json({ erro: 'Registro não encontrado.' });
    }
    if (registro.rows[0].usuario_id !== req.usuario.id) {
      return res.status(403).json({ erro: 'Você não pode apagar este registro.' });
    }
    await pool.query('DELETE FROM historico WHERE id_historico = $1', [id]);
    return res.json({ mensagem: 'Registro apagado.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao apagar registro.' });
  }
});

// DELETE — limpa todo o histórico do usuário logado
router.delete('/', verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query('DELETE FROM historico WHERE usuario_id = $1', [req.usuario.id]);
    return res.json({ mensagem: 'Histórico limpo.', removidos: resultado.rowCount });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao limpar histórico.' });
  }
});

module.exports = router;
