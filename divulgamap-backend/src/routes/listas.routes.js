const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');

const router = express.Router();

// GET protegida — só as listas do próprio usuário logado
router.get('/minhas', verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT * FROM listas WHERE usuario_id = $1 ORDER BY criado_em DESC',
      [req.usuario.id]
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar listas.' });
  }
});

// POST protegida — cria uma lista nova (ex: "Favoritos", "Quero visitar")
router.post('/', verificarToken, async (req, res) => {
  try {
    const { nome, privacidade } = req.body;
    const novaLista = await pool.query(
      'INSERT INTO listas (usuario_id, nome, privacidade) VALUES ($1, $2, $3) RETURNING *',
      [req.usuario.id, nome, privacidade || 'privada']
    );
    return res.status(201).json(novaLista.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao criar lista.' });
  }
});

module.exports = router;