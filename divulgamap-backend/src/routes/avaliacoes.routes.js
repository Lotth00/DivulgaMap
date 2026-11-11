const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');
const verificarAdmin = require('../middlewares/admin');

const router = express.Router();

const TAMANHO_MAXIMO_COMENTARIO = 1000;
const MAXIMO_FOTOS = 5;

// Fotos da avaliação (URLs https): lista, undefined se não enviadas, ou null se inválidas
function validarFotos(fotos) {
  if (fotos === undefined) return undefined;
  if (!Array.isArray(fotos) || fotos.length > MAXIMO_FOTOS) return null;
  const urls = fotos.map((url) => (typeof url === 'string' ? url.trim() : ''));
  return urls.every((url) => /^https:\/\/\S+$/.test(url) && url.length <= 500) ? urls : null;
}

const ERRO_FOTOS = `fotos deve ser uma lista de até ${MAXIMO_FOTOS} endereços https.`;

// Troca as fotos da avaliação pelas da lista
async function gravarFotos(cliente, avaliacaoId, urls) {
  await cliente.query('DELETE FROM fotos_avaliacao WHERE avaliacao_id = $1', [avaliacaoId]);
  for (const [ordem, url] of urls.entries()) {
    await cliente.query('INSERT INTO fotos_avaliacao (avaliacao_id, url, ordem) VALUES ($1, $2, $3)', [avaliacaoId, url, ordem]);
  }
}

// Fotos de uma avaliação, na ordem
async function buscarFotos(avaliacaoId) {
  const fotos = await pool.query('SELECT url FROM fotos_avaliacao WHERE avaliacao_id = $1 ORDER BY ordem, id_foto', [avaliacaoId]);
  return fotos.rows.map((foto) => foto.url);
}

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
      `SELECT a.*, u.nome AS usuario_nome, u.conta_privada AS usuario_conta_privada,
              COALESCE((SELECT json_agg(f.url ORDER BY f.ordem, f.id_foto)
                        FROM fotos_avaliacao f WHERE f.avaliacao_id = a.id_avaliacao), '[]') AS fotos
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
    const fotos = validarFotos(req.body?.fotos);

    if (!nota) {
      return res.status(400).json({ erro: 'nota deve ser um número inteiro de 1 a 5.' });
    }
    if (comentario === undefined) {
      return res.status(400).json({ erro: `comentario deve ser um texto de até ${TAMANHO_MAXIMO_COMENTARIO} letras.` });
    }
    if (fotos === null) {
      return res.status(400).json({ erro: ERRO_FOTOS });
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

    // Avaliação e fotos juntas (tudo ou nada)
    const cliente = await pool.connect();
    let nova;
    try {
      await cliente.query('BEGIN');
      nova = await cliente.query(
        'INSERT INTO avaliacoes (usuario_id, empresa_id, nota, comentario) VALUES ($1, $2, $3, $4) RETURNING *',
        [req.usuario.id, empresaId, nota, comentario]
      );
      await gravarFotos(cliente, nova.rows[0].id_avaliacao, fotos || []);
      await cliente.query('COMMIT');
    } catch (erroTransacao) {
      await cliente.query('ROLLBACK').catch(() => {});
      throw erroTransacao;
    } finally {
      cliente.release();
    }
    await recalcularNotaDaEmpresa(empresaId);

    return res.status(201).json({ ...nova.rows[0], fotos: fotos || [] });
  } catch (erro) {
    // Avaliação repetida barrada pela trava do banco
    if (erro.code === '23505') {
      return res.status(409).json({ erro: 'Você já avaliou esta empresa. Edite a sua avaliação em vez de criar outra.' });
    }
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao criar avaliação.' });
  }
});

// Avaliação do usuário logado: 404 se não existe, 403 se é de outra pessoa (a admin pode, se permitido)
async function buscarAvaliacaoDoUsuario(req, res, adminPode = false) {
  const id = paraId(req.params.id);
  const avaliacao = id ? await pool.query('SELECT * FROM avaliacoes WHERE id_avaliacao = $1', [id]) : { rows: [] };
  if (!avaliacao.rows[0]) {
    res.status(404).json({ erro: 'Avaliação não encontrada.' });
    return null;
  }
  const ehAdmin = adminPode && req.usuario.tipo === 'admin';
  if (avaliacao.rows[0].usuario_id !== req.usuario.id && !ehAdmin) {
    res.status(403).json({ erro: 'Você não pode alterar esta avaliação.' });
    return null;
  }
  return avaliacao.rows[0];
}

// PUT protegida — edita a própria avaliação e recalcula a média
router.put('/:id', verificarToken, async (req, res) => {
  try {
    // Só os campos enviados mudam: sem "comentario" ou "fotos", os atuais ficam
    const corpo = req.body ?? {};
    const nota = validarNota(corpo.nota);
    const comentario = 'comentario' in corpo ? validarComentario(corpo.comentario) : null;
    const fotos = validarFotos(corpo.fotos);
    if (!nota) {
      return res.status(400).json({ erro: 'nota deve ser um número inteiro de 1 a 5.' });
    }
    if (comentario === undefined) {
      return res.status(400).json({ erro: `comentario deve ser um texto de até ${TAMANHO_MAXIMO_COMENTARIO} letras.` });
    }
    if (fotos === null) {
      return res.status(400).json({ erro: ERRO_FOTOS });
    }

    const avaliacao = await buscarAvaliacaoDoUsuario(req, res);
    if (!avaliacao) return;
    const comentarioFinal = 'comentario' in corpo ? comentario : avaliacao.comentario;

    const cliente = await pool.connect();
    let atualizada;
    try {
      await cliente.query('BEGIN');
      atualizada = await cliente.query(
        'UPDATE avaliacoes SET nota = $1, comentario = $2, editado_em = NOW() WHERE id_avaliacao = $3 RETURNING *',
        [nota, comentarioFinal, avaliacao.id_avaliacao]
      );
      if (fotos !== undefined) {
        await gravarFotos(cliente, avaliacao.id_avaliacao, fotos);
      }
      await cliente.query('COMMIT');
    } catch (erroTransacao) {
      await cliente.query('ROLLBACK').catch(() => {});
      throw erroTransacao;
    } finally {
      cliente.release();
    }
    await recalcularNotaDaEmpresa(avaliacao.empresa_id);

    return res.json({ ...atualizada.rows[0], fotos: await buscarFotos(avaliacao.id_avaliacao) });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao editar avaliação.' });
  }
});

// DELETE protegida — apaga a avaliação (autor ou admin) e recalcula a média
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const avaliacao = await buscarAvaliacaoDoUsuario(req, res, true);
    if (!avaliacao) return;

    await pool.query('DELETE FROM avaliacoes WHERE id_avaliacao = $1', [avaliacao.id_avaliacao]);
    await recalcularNotaDaEmpresa(avaliacao.empresa_id);

    return res.json({ mensagem: 'Avaliação excluída.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao excluir avaliação.' });
  }
});

// DELETE protegida — remove uma foto da avaliação (autor ou admin)
router.delete('/:id/fotos/:fotoId', verificarToken, async (req, res) => {
  try {
    const avaliacao = await buscarAvaliacaoDoUsuario(req, res, true);
    if (!avaliacao) return;

    const fotoId = paraId(req.params.fotoId);
    const removida = fotoId
      ? await pool.query('DELETE FROM fotos_avaliacao WHERE id_foto = $1 AND avaliacao_id = $2', [fotoId, avaliacao.id_avaliacao])
      : { rowCount: 0 };
    if (!removida.rowCount) {
      return res.status(404).json({ erro: 'Foto não encontrada nesta avaliação.' });
    }
    return res.json({ mensagem: 'Foto removida.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao remover foto.' });
  }
});

const MOTIVOS_DENUNCIA = ['ofensiva', 'falsa', 'spam', 'outro'];

// POST protegida — denuncia uma avaliação de outra pessoa
router.post('/:id/denunciar', verificarToken, async (req, res) => {
  try {
    const id = paraId(req.params.id);
    const { motivo } = req.body ?? {};
    const mensagem = typeof req.body?.mensagem === 'string' ? req.body.mensagem.trim() : '';

    if (!MOTIVOS_DENUNCIA.includes(motivo)) {
      return res.status(400).json({ erro: `motivo deve ser um destes: ${MOTIVOS_DENUNCIA.join(', ')}.` });
    }
    if (mensagem.length > TAMANHO_MAXIMO_COMENTARIO) {
      return res.status(400).json({ erro: `mensagem pode ter até ${TAMANHO_MAXIMO_COMENTARIO} letras.` });
    }

    const avaliacao = id ? await pool.query('SELECT usuario_id FROM avaliacoes WHERE id_avaliacao = $1', [id]) : { rows: [] };
    if (!avaliacao.rows[0]) {
      return res.status(404).json({ erro: 'Avaliação não encontrada.' });
    }
    if (avaliacao.rows[0].usuario_id === req.usuario.id) {
      return res.status(403).json({ erro: 'Você não pode denunciar a sua própria avaliação.' });
    }

    const denuncia = await pool.query(
      `INSERT INTO denuncias_avaliacao (avaliacao_id, denunciante_id, motivo, mensagem)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, req.usuario.id, motivo, mensagem || null]
    );
    return res.status(201).json(denuncia.rows[0]);
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(409).json({ erro: 'Você já denunciou esta avaliação.' });
    }
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao registrar denúncia.' });
  }
});

// GET admin — denúncias pendentes, com a avaliação e quantas denúncias ela já tem
router.get('/denuncias/pendentes', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT d.id_denuncia, d.motivo, d.mensagem, d.criado_em,
              a.id_avaliacao, a.nota, a.comentario, a.usuario_id AS autor_id, u.nome AS autor_nome,
              a.empresa_id, e.nome_fantasia AS empresa_nome,
              (SELECT COUNT(*)::int FROM denuncias_avaliacao d2
               WHERE d2.avaliacao_id = a.id_avaliacao AND d2.status = 'pendente') AS total_denuncias,
              COALESCE((SELECT json_agg(json_build_object('id_foto', f.id_foto, 'url', f.url) ORDER BY f.ordem, f.id_foto)
                        FROM fotos_avaliacao f WHERE f.avaliacao_id = a.id_avaliacao), '[]') AS fotos
       FROM denuncias_avaliacao d
       JOIN avaliacoes a ON a.id_avaliacao = d.avaliacao_id
       JOIN usuarios u ON u.id_usuario = a.usuario_id
       JOIN empresas e ON e.id_empresa = a.empresa_id
       WHERE d.status = 'pendente'
       ORDER BY total_denuncias DESC, d.criado_em ASC`
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao listar denúncias.' });
  }
});

// PATCH admin — denúncia procedente: apaga a avaliação (e as denúncias dela) e recalcula a média
router.patch('/denuncias/:id/aceitar', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const id = paraId(req.params.id);
    const denuncia = id
      ? await pool.query(
          `SELECT d.avaliacao_id, a.empresa_id FROM denuncias_avaliacao d
           JOIN avaliacoes a ON a.id_avaliacao = d.avaliacao_id
           WHERE d.id_denuncia = $1 AND d.status = 'pendente'`,
          [id]
        )
      : { rows: [] };
    if (!denuncia.rows[0]) {
      return res.status(404).json({ erro: 'Denúncia pendente não encontrada.' });
    }

    await pool.query('DELETE FROM avaliacoes WHERE id_avaliacao = $1', [denuncia.rows[0].avaliacao_id]);
    await recalcularNotaDaEmpresa(denuncia.rows[0].empresa_id);
    return res.json({ mensagem: 'Avaliação removida.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao aceitar denúncia.' });
  }
});

// PATCH admin — denúncia sem fundamento: a avaliação continua
router.patch('/denuncias/:id/recusar', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const id = paraId(req.params.id);
    const atualizada = id
      ? await pool.query(
          `UPDATE denuncias_avaliacao SET status = 'recusada' WHERE id_denuncia = $1 AND status = 'pendente' RETURNING *`,
          [id]
        )
      : { rows: [] };
    if (!atualizada.rows[0]) {
      return res.status(404).json({ erro: 'Denúncia pendente não encontrada.' });
    }
    return res.json(atualizada.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao recusar denúncia.' });
  }
});

module.exports = router;
