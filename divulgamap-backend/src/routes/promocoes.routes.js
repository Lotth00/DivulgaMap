const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');

const router = express.Router();

// Confere se os campos certos vieram para cada tipo de promoção
function validarCamposPorTipo({ tipo, desconto_percentual, condicao, data_inicio, data_fim }) {
  if (!['normal', 'especial', 'relampago'].includes(tipo)) {
    return 'Tipo inválido. Use "normal", "especial" ou "relampago".';
  }
  if (!data_inicio || !data_fim) {
    return 'data_inicio e data_fim são obrigatórios para qualquer tipo de promoção.';
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
    const horasDeDuracao = (new Date(data_fim) - new Date(data_inicio)) / (1000 * 60 * 60);
    if (horasDeDuracao <= 0) return 'data_fim precisa ser depois de data_inicio.';
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

// LISTAR só as promoções relâmpago ativas AGORA (em qualquer empresa)
router.get('/relampago/ativas', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT * FROM promocoes
       WHERE tipo = 'relampago' AND data_inicio <= NOW() AND data_fim >= NOW()
       ORDER BY data_fim ASC`
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar promoções relâmpago.' });
  }
});

// CRIAR uma nova promoção (protegida)
router.post('/', verificarToken, async (req, res) => {
  try {
    const { empresa_id, produto_id, tipo, titulo, descricao, condicao, desconto_percentual, data_inicio, data_fim } = req.body;

    const erroDeValidacao = validarCamposPorTipo({ tipo, desconto_percentual, condicao, data_inicio, data_fim });
    if (erroDeValidacao) {
      return res.status(400).json({ erro: erroDeValidacao });
    }

    const novaPromocao = await pool.query(
      `INSERT INTO promocoes
        (empresa_id, produto_id, tipo, titulo, descricao, condicao, desconto_percentual, data_inicio, data_fim, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'agendada') RETURNING *`,
      [empresa_id, produto_id || null, tipo, titulo, descricao, condicao || null, desconto_percentual || null, data_inicio, data_fim]
    );

    return res.status(201).json(novaPromocao.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao criar promoção.' });
  }
});

module.exports = router;