const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');

const router = express.Router();

// GET protegida — itens salvos dentro de uma lista específica
router.get('/lista/:listaId', verificarToken, async (req, res) => {
  try {
    const { listaId } = req.params;

    // Confirma que a lista é do usuário logado antes de mostrar o conteúdo
    const lista = await pool.query('SELECT * FROM listas WHERE id_lista = $1', [listaId]);
    if (!lista.rows[0] || lista.rows[0].usuario_id !== req.usuario.id) {
      return res.status(403).json({ erro: 'Você não pode ver esta lista.' });
    }

    const resultado = await pool.query('SELECT * FROM salvos WHERE lista_id = $1', [listaId]);
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar itens salvos.' });
  }
});

// POST protegida — salva uma empresa OU produto dentro de uma lista
router.post('/', verificarToken, async (req, res) => {
  try {
    const { lista_id, tipo_item, item_id } = req.body;

    const lista = await pool.query('SELECT * FROM listas WHERE id_lista = $1', [lista_id]);
    if (!lista.rows[0] || lista.rows[0].usuario_id !== req.usuario.id) {
      return res.status(403).json({ erro: 'Você não pode adicionar nesta lista.' });
    }

    // Validação polimórfica: "empresa" e "produto" - tabelas diferentes
    const tabela = tipo_item === 'empresa' ? 'empresas' : 'produtos';
    const coluna = tipo_item === 'empresa' ? 'id_empresa' : 'id_produto';
    const itemExiste = await pool.query(`SELECT 1 FROM ${tabela} WHERE ${coluna} = $1`, [item_id]);
    if (itemExiste.rows.length === 0) {
      return res.status(400).json({ erro: 'Item não encontrado.' });
    }

    const novoSalvo = await pool.query(
      'INSERT INTO salvos (lista_id, usuario_id, tipo_item, item_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [lista_id, req.usuario.id, tipo_item, item_id]
    );
    return res.status(201).json(novoSalvo.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao salvar item.' });
  }
});

module.exports = router;