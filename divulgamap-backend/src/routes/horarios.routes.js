const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');

const router = express.Router();

// GET pública — horário de funcionamento
router.get('/empresa/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const resultado = await pool.query(
      'SELECT * FROM horarios WHERE empresa_id = $1 ORDER BY dia_semana',
      [empresaId]
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar horários.' });
  }
});

// POST protegida — cadastra (ou substitui) o horário de um dia específico
router.post('/', verificarToken, async (req, res) => {
  try {
    const { empresa_id, dia_semana, abertura, fechamento, fechado } = req.body;

    const existente = await pool.query(
      'SELECT * FROM horarios WHERE empresa_id = $1 AND dia_semana = $2',
      [empresa_id, dia_semana]
    );

    let resultado;
    if (existente.rows[0]) {
      resultado = await pool.query(
        `UPDATE horarios SET abertura = $1, fechamento = $2, fechado = $3
         WHERE empresa_id = $4 AND dia_semana = $5 RETURNING *`,
        [abertura, fechamento, fechado || false, empresa_id, dia_semana]
      );
    } else {
      resultado = await pool.query(
        `INSERT INTO horarios (empresa_id, dia_semana, abertura, fechamento, fechado)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [empresa_id, dia_semana, abertura, fechamento, fechado || false]
      );
    }

    return res.status(201).json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao salvar horário.' });
  }
});

module.exports = router;