const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');

const router = express.Router();

const TAMANHO_MAXIMO_COMENTARIO = 1000;

function paraId(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Nota inteira de 1 a 5, ou null se inválida
function validarNota(nota) {
  const numero = Number(nota);
  return Number.isInteger(numero) && numero >= 1 && numero <= 5 ? numero : null;
}

// Comentário sem espaços nas pontas: texto, null se vazio, ou undefined se inválido
function validarComentario(comentario) {
  if (comentario === undefined || comentario === null) return null;
  if (typeof comentario !== 'string') return undefined;
  const limpo = comentario.trim();
  return limpo.length > TAMANHO_MAXIMO_COMENTARIO ? undefined : limpo || null;
}

// Recalcula nota_media e total_avaliacoes da empresa, direto no banco (AVG e COUNT)
async function recalcularNotaDaEmpresa(empresaId) {
  await pool.query(
    `UPDATE empresas SET
       nota_media = COALESCE((SELECT AVG(nota) FROM avaliacoes WHERE empresa_id = $1), 0),
       total_avaliacoes = (SELECT COUNT(*) FROM avaliacoes WHERE empresa_id = $1)
     WHERE id_empresa = $1`,
    [empresaId]
  );
}

// GET pública — lista avaliações de uma empresa
router.get('/empresa/:empresaId', async (req, res) => {
  try {
    const empresaId = paraId(req.params.empresaId);
    if (!empresaId) {
      return res.json([]);
    }
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
    const empresaId = paraId(req.body?.empresa_id);
    const nota = validarNota(req.body?.nota);
    const comentario = validarComentario(req.body?.comentario);

    if (!nota) {
      return res.status(400).json({ erro: 'nota deve ser um número inteiro de 1 a 5.' });
    }
    if (comentario === undefined) {
      return res.status(400).json({ erro: `comentario deve ser um texto de até ${TAMANHO_MAXIMO_COMENTARIO} letras.` });
    }

    // Só empresas aprovadas, e nunca a própria empresa
    const empresa = empresaId
      ? await pool.query(`SELECT id_usuario FROM empresas WHERE id_empresa = $1 AND status = 'aprovada'`, [empresaId])
      : { rows: [] };
    if (!empresa.rows[0]) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }
    if (empresa.rows[0].id_usuario === req.usuario.id) {
      return res.status(403).json({ erro: 'Você não pode avaliar a sua própria empresa.' });
    }

    const jaAvaliou = await pool.query(
      'SELECT 1 FROM avaliacoes WHERE usuario_id = $1 AND empresa_id = $2',
      [req.usuario.id, empresaId]
    );
    if (jaAvaliou.rows.length > 0) {
      return res.status(409).json({ erro: 'Você já avaliou esta empresa. Edite a sua avaliação em vez de criar outra.' });
    }

    const nova = await pool.query(
      'INSERT INTO avaliacoes (usuario_id, empresa_id, nota, comentario) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.usuario.id, empresaId, nota, comentario]
    );
    await recalcularNotaDaEmpresa(empresaId);

    return res.status(201).json(nova.rows[0]);
  } catch (erro) {
    // Avaliação repetida barrada pela trava do banco
    if (erro.code === '23505') {
      return res.status(409).json({ erro: 'Você já avaliou esta empresa. Edite a sua avaliação em vez de criar outra.' });
    }
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao criar avaliação.' });
  }
});

// Avaliação do usuário logado: 404 se não existe, 403 se é de outra pessoa
async function buscarAvaliacaoDoUsuario(req, res) {
  const id = paraId(req.params.id);
  const avaliacao = id ? await pool.query('SELECT * FROM avaliacoes WHERE id_avaliacao = $1', [id]) : { rows: [] };
  if (!avaliacao.rows[0]) {
    res.status(404).json({ erro: 'Avaliação não encontrada.' });
    return null;
  }
  if (avaliacao.rows[0].usuario_id !== req.usuario.id) {
    res.status(403).json({ erro: 'Você não pode alterar esta avaliação.' });
    return null;
  }
  return avaliacao.rows[0];
}

// PUT protegida — edita a própria avaliação e recalcula a média
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const nota = validarNota(req.body?.nota);
    const comentario = validarComentario(req.body?.comentario);
    if (!nota) {
      return res.status(400).json({ erro: 'nota deve ser um número inteiro de 1 a 5.' });
    }
    if (comentario === undefined) {
      return res.status(400).json({ erro: `comentario deve ser um texto de até ${TAMANHO_MAXIMO_COMENTARIO} letras.` });
    }

    const avaliacao = await buscarAvaliacaoDoUsuario(req, res);
    if (!avaliacao) return;

    const atualizada = await pool.query(
      'UPDATE avaliacoes SET nota = $1, comentario = $2, editado_em = NOW() WHERE id_avaliacao = $3 RETURNING *',
      [nota, comentario, avaliacao.id_avaliacao]
    );
    await recalcularNotaDaEmpresa(avaliacao.empresa_id);

    return res.json(atualizada.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao editar avaliação.' });
  }
});

// DELETE protegida — apaga a própria avaliação e recalcula a média
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const avaliacao = await buscarAvaliacaoDoUsuario(req, res);
    if (!avaliacao) return;

    await pool.query('DELETE FROM avaliacoes WHERE id_avaliacao = $1', [avaliacao.id_avaliacao]);
    await recalcularNotaDaEmpresa(avaliacao.empresa_id);

    return res.json({ mensagem: 'Avaliação excluída.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao excluir avaliação.' });
  }
});

module.exports = router;
