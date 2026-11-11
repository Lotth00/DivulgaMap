const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');

const router = express.Router();

function paraId(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET protegida — em quais listas do usuário logado um item está salvo
router.get('/item', verificarToken, async (req, res) => {
  try {
    const { tipo_item } = req.query;
    const itemId = paraId(req.query.item_id);
    if (!['empresa', 'produto', 'promocao'].includes(tipo_item) || !itemId) {
      return res.status(400).json({ erro: 'Envie tipo_item ("empresa", "produto" ou "promocao") e item_id.' });
    }
    const resultado = await pool.query(
      `SELECT s.id_salvo, s.lista_id FROM salvos s
       JOIN listas l ON l.id_lista = s.lista_id
       WHERE l.usuario_id = $1 AND s.tipo_item = $2 AND s.item_id = $3`,
      [req.usuario.id, tipo_item, itemId]
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar o item salvo.' });
  }
});

// GET protegida — itens salvos dentro de uma lista do usuário logado
router.get('/lista/:listaId', verificarToken, async (req, res) => {
  try {
    const listaId = paraId(req.params.listaId);
    const lista = listaId ? await pool.query('SELECT usuario_id FROM listas WHERE id_lista = $1', [listaId]) : { rows: [] };
    if (!lista.rows[0]) {
      return res.status(404).json({ erro: 'Lista não encontrada.' });
    }
    if (lista.rows[0].usuario_id !== req.usuario.id) {
      return res.status(403).json({ erro: 'Você não pode ver esta lista.' });
    }

    // Nome, foto e categoria de cada item (empresa, produto ou oferta)
    const resultado = await pool.query(
      `SELECT
         s.id_salvo,
         s.lista_id,
         s.tipo_item,
         s.item_id,
         s.criado_em,
         COALESCE(e.nome_fantasia, p.nome, pm.titulo) AS nome,
         CASE WHEN s.tipo_item = 'empresa'
              THEN (SELECT f.url FROM fotos_empresa f
                    WHERE f.empresa_id = e.id_empresa
                    ORDER BY f.ordem, f.id_foto LIMIT 1)
              WHEN s.tipo_item = 'promocao'
              THEN COALESCE(ppm.foto_url, (SELECT f.url FROM fotos_empresa f
                    WHERE f.empresa_id = pme.id_empresa
                    ORDER BY f.ordem, f.id_foto LIMIT 1))
              ELSE p.foto_url
         END AS foto,
         COALESCE(ep.nome_fantasia, pme.nome_fantasia) AS empresa_nome,
         COALESCE(e.id_empresa, ep.id_empresa, pme.id_empresa) AS empresa_id,
         COALESCE(cp.nome, (
           SELECT c.nome FROM empresa_categoria ec
           JOIN categorias c ON c.id_categoria = ec.categoria_id
           WHERE ec.empresa_id = COALESCE(e.id_empresa, ep.id_empresa, pme.id_empresa)
           ORDER BY c.nome LIMIT 1
         )) AS categoria,
         CASE WHEN s.tipo_item = 'promocao' THEN pm.data_fim < (NOW() AT TIME ZONE 'America/Sao_Paulo') END AS encerrada
       FROM salvos s
       LEFT JOIN empresas e ON s.tipo_item = 'empresa' AND e.id_empresa = s.item_id
       LEFT JOIN produtos p ON s.tipo_item = 'produto' AND p.id_produto = s.item_id
       LEFT JOIN empresas ep ON ep.id_empresa = p.empresa_id
       LEFT JOIN promocoes pm ON s.tipo_item = 'promocao' AND pm.id_promocao = s.item_id
       LEFT JOIN empresas pme ON pme.id_empresa = pm.empresa_id
       LEFT JOIN produtos ppm ON ppm.id_produto = pm.produto_id
       LEFT JOIN categorias cp ON cp.id_categoria = COALESCE(p.categoria_id, ppm.categoria_id)
       WHERE s.lista_id = $1
         AND ((e.status = 'aprovada') OR (p.disponivel = TRUE AND ep.status = 'aprovada')
              OR (pme.status = 'aprovada' AND (pm.produto_id IS NULL OR ppm.disponivel = TRUE)))
       ORDER BY s.criado_em DESC, s.id_salvo DESC`,
      [listaId]
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar itens salvos.' });
  }
});

// POST protegida — salva uma empresa, produto OU oferta dentro de uma lista
router.post('/', verificarToken, async (req, res) => {
  try {
    const { tipo_item } = req.body ?? {};
    const listaId = paraId(req.body?.lista_id);
    const itemId = paraId(req.body?.item_id);

    if (!['empresa', 'produto', 'promocao'].includes(tipo_item)) {
      return res.status(400).json({ erro: 'tipo_item deve ser "empresa", "produto" ou "promocao".' });
    }

    const lista = listaId ? await pool.query('SELECT usuario_id FROM listas WHERE id_lista = $1', [listaId]) : { rows: [] };
    if (!lista.rows[0]) {
      return res.status(404).json({ erro: 'Lista não encontrada.' });
    }
    if (lista.rows[0].usuario_id !== req.usuario.id) {
      return res.status(403).json({ erro: 'Você não pode adicionar nesta lista.' });
    }

    // Só empresa aprovada, produto disponível ou oferta de empresa aprovada
    const consultaItem = {
      empresa: `SELECT 1 FROM empresas WHERE id_empresa = $1 AND status = 'aprovada'`,
      produto: `SELECT 1 FROM produtos p JOIN empresas e ON e.id_empresa = p.empresa_id
                WHERE p.id_produto = $1 AND p.disponivel = TRUE AND e.status = 'aprovada'`,
      promocao: `SELECT 1 FROM promocoes pm JOIN empresas e ON e.id_empresa = pm.empresa_id
                 LEFT JOIN produtos pr ON pr.id_produto = pm.produto_id
                 WHERE pm.id_promocao = $1 AND e.status = 'aprovada' AND (pm.produto_id IS NULL OR pr.disponivel = TRUE)`,
    }[tipo_item];
    const itemExiste = itemId ? await pool.query(consultaItem, [itemId]) : { rows: [] };
    if (!itemExiste.rows[0]) {
      return res.status(400).json({ erro: 'Item não encontrado.' });
    }

    const repetido = await pool.query(
      'SELECT 1 FROM salvos WHERE lista_id = $1 AND tipo_item = $2 AND item_id = $3',
      [listaId, tipo_item, itemId]
    );
    if (repetido.rows[0]) {
      return res.status(409).json({ erro: 'Este item já está nesta lista.' });
    }

    const novoSalvo = await pool.query(
      'INSERT INTO salvos (lista_id, usuario_id, tipo_item, item_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [listaId, req.usuario.id, tipo_item, itemId]
    );
    return res.status(201).json(novoSalvo.rows[0]);
  } catch (erro) {
    // Item repetido barrado pela trava do banco
    if (erro.code === '23505') {
      return res.status(409).json({ erro: 'Este item já está nesta lista.' });
    }
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao salvar item.' });
  }
});

// DELETE protegida — remove um item salvo (só o dono)
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const id = paraId(req.params.id);
    const salvo = id ? await pool.query('SELECT usuario_id FROM salvos WHERE id_salvo = $1', [id]) : { rows: [] };
    if (!salvo.rows[0]) {
      return res.status(404).json({ erro: 'Item salvo não encontrado.' });
    }
    if (salvo.rows[0].usuario_id !== req.usuario.id) {
      return res.status(403).json({ erro: 'Você não pode remover este item.' });
    }

    await pool.query('DELETE FROM salvos WHERE id_salvo = $1', [id]);
    return res.json({ mensagem: 'Item removido.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao remover item.' });
  }
});

module.exports = router;
