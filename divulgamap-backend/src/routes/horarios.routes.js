const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');
const verificarDonoEmpresa = require('../middlewares/donoEmpresa');
const idValido = require('../utils/id');

const HORA = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const router = express.Router();

// GET pública — horário de funcionamento
router.get('/empresa/:empresaId', async (req, res) => {
  try {
    const empresaId = idValido(req.params.empresaId);
    if (!empresaId) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }
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
router.post('/', verificarToken, verificarDonoEmpresa, async (req, res) => {
  try {
    const { abertura, fechamento } = req.body ?? {};
    const dia_semana = Number(req.body?.dia_semana);
    const fechado = req.body?.fechado === true;
    const empresa_id = req.empresa.id_empresa;
    if (!Number.isInteger(dia_semana) || dia_semana < 0 || dia_semana > 6) {
      return res.status(400).json({ erro: 'dia_semana deve ser de 0 (domingo) a 6 (sábado).' });
    }
    if (!fechado && (!HORA.test(abertura ?? '') || !HORA.test(fechamento ?? ''))) {
      return res.status(400).json({ erro: 'abertura e fechamento precisam estar no formato 08:00.' });
    }

    const existente = await pool.query(
      'SELECT * FROM horarios WHERE empresa_id = $1 AND dia_semana = $2',
      [empresa_id, dia_semana]
    );

    let resultado;
    if (existente.rows[0]) {
      resultado = await pool.query(
        `UPDATE horarios SET abertura = $1, fechamento = $2, fechado = $3
         WHERE empresa_id = $4 AND dia_semana = $5 RETURNING *`,
        [fechado ? null : abertura, fechado ? null : fechamento, fechado, empresa_id, dia_semana]
      );
    } else {
      resultado = await pool.query(
        `INSERT INTO horarios (empresa_id, dia_semana, abertura, fechamento, fechado)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [empresa_id, dia_semana, fechado ? null : abertura, fechado ? null : fechamento, fechado]
      );
    }

    return res.status(201).json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao salvar horário.' });
  }
});

module.exports = router;