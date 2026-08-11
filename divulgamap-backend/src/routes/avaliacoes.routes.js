const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');

const router = express.Router();

// GET pública — lista avaliações de uma empresa
router.get('/empresa/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const resultado = await pool.query(
      `SELECT a.*, u.nome AS usuario_nome
       FROM avaliacoes a
       JOIN usuarios u ON u.id_usuario = a.usuario_id
       WHERE a.empresa_id = $1
       ORDER BY a.criado_em DESC`,
      [empresaId]
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar avaliações.' });
  }
});

// POST protegida — cria a avaliação e recalcula a média da empresa
router.post('/', verificarToken, async (req, res) => {
  try {
    const { empresa_id, nota, comentario } = req.body;

    const jaAvaliou = await pool.query(
      'SELECT 1 FROM avaliacoes WHERE usuario_id = $1 AND empresa_id = $2',
      [req.usuario.id, empresa_id]
    );
    if (jaAvaliou.rows.length > 0) {
      return res.status(400).json({ erro: 'Você já avaliou esta empresa. Edite sua avaliação em vez de criar outra.' });
    }

    await pool.query(
      'INSERT INTO avaliacoes (usuario_id, empresa_id, nota, comentario) VALUES ($1, $2, $3, $4)',
      [req.usuario.id, empresa_id, nota, comentario]
    );

    // Recalcula nota_media e total_avaliacoes da empresa, direto no banco (AVG e COUNT)
    await pool.query(
      `UPDATE empresas SET
         nota_media = (SELECT AVG(nota) FROM avaliacoes WHERE empresa_id = $1),
         total_avaliacoes = (SELECT COUNT(*) FROM avaliacoes WHERE empresa_id = $1)
       WHERE id_empresa = $1`,
      [empresa_id]
    );

    return res.status(201).json({ mensagem: 'Avaliação registrada.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao criar avaliação.' });
  }
});

module.exports = router;