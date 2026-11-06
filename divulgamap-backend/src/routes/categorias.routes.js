const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// LISTAR categorias (pública), em ordem alfabética
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT id_categoria, nome, icone FROM categorias ORDER BY nome');
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar categorias.' });
  }
});

module.exports = router;
