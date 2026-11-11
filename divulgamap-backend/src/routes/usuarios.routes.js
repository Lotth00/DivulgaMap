const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');

const router = express.Router();

// Campos devolvidos do usuário (nunca a senha)
const CAMPOS_USUARIO = `id_usuario AS id, nome, email, tipo, telefone, foto_perfil_url, biografia,
  to_char(data_nascimento, 'YYYY-MM-DD') AS data_nascimento, conta_privada, notificacoes_ativas, data_cadastro`;

function textoOpcional(valor, tamanhoMaximo) {
  if (valor === null) return { valor: null };
  if (typeof valor !== 'string' || valor.trim().length > tamanhoMaximo) return { erro: true };
  return { valor: valor.trim() || null };
}

// Regras de cada campo editável: devolve { valor } ou { erro: mensagem }
const REGRAS_PERFIL = {
  nome: (v) =>
    typeof v === 'string' && v.trim() && v.trim().length <= 100 ? { valor: v.trim() } : { erro: 'nome é obrigatório e pode ter até 100 letras.' },
  telefone: (v) => (textoOpcional(v, 20).erro ? { erro: 'telefone pode ter até 20 caracteres.' } : textoOpcional(v, 20)),
  biografia: (v) => (textoOpcional(v, 500).erro ? { erro: 'biografia pode ter até 500 letras.' } : textoOpcional(v, 500)),
  foto_perfil_url: (v) => {
    if (v === null) return { valor: null };
    return typeof v === 'string' && /^https:\/\/\S+$/.test(v.trim()) && v.trim().length <= 255
      ? { valor: v.trim() }
      : { erro: 'foto_perfil_url precisa ser um endereço https de até 255 caracteres.' };
  },
  data_nascimento: (v) => {
    if (v === null) return { valor: null };
    const certo = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const data = certo ? new Date(`${v}T00:00:00Z`) : null;
    const valida = data && !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === v;
    return valida && data <= new Date() && data.getUTCFullYear() >= 1900
      ? { valor: v }
      : { erro: 'data_nascimento precisa ser uma data válida no passado (AAAA-MM-DD).' };
  },
  conta_privada: (v) => (typeof v === 'boolean' ? { valor: v } : { erro: 'conta_privada deve ser true ou false.' }),
  notificacoes_ativas: (v) => (typeof v === 'boolean' ? { valor: v } : { erro: 'notificacoes_ativas deve ser true ou false.' }),
};

// GET /usuarios/me — dados do usuário logado
router.get('/me', verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT ${CAMPOS_USUARIO} FROM usuarios WHERE id_usuario = $1`, [req.usuario.id]);
    const usuario = resultado.rows[0];
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    return res.json(usuario);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar usuário.' });
  }
});

// PUT /usuarios/me — só os campos enviados mudam; null apaga (menos o nome)
router.put('/me', verificarToken, async (req, res) => {
  try {
    const corpo = req.body ?? {};
    const sets = [];
    const valores = [];

    for (const [campo, regra] of Object.entries(REGRAS_PERFIL)) {
      if (!(campo in corpo)) continue;
      const resultadoRegra = regra(corpo[campo]);
      if (resultadoRegra.erro) {
        return res.status(400).json({ erro: resultadoRegra.erro });
      }
      valores.push(resultadoRegra.valor);
      sets.push(`${campo} = $${valores.length}`);
    }

    if (sets.length === 0) {
      return res.status(400).json({ erro: `Envie ao menos um destes campos: ${Object.keys(REGRAS_PERFIL).join(', ')}.` });
    }

    valores.push(req.usuario.id);
    const resultado = await pool.query(
      `UPDATE usuarios SET ${sets.join(', ')} WHERE id_usuario = $${valores.length} RETURNING ${CAMPOS_USUARIO}`,
      valores
    );
    if (!resultado.rows[0]) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    return res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao atualizar usuário.' });
  }
});

// Avaliações e fotos feitas por um usuário (só de empresas aprovadas)
async function montarPerfil(usuarioId) {
  const [avaliacoes, fotos] = await Promise.all([
      pool.query(
        `SELECT a.id_avaliacao, a.empresa_id, e.nome_fantasia AS empresa_nome, a.nota, a.comentario,
                a.criado_em, a.editado_em,
                COALESCE((SELECT json_agg(f.url ORDER BY f.ordem, f.id_foto)
                          FROM fotos_avaliacao f WHERE f.avaliacao_id = a.id_avaliacao), '[]') AS fotos
         FROM avaliacoes a
         JOIN empresas e ON e.id_empresa = a.empresa_id
         WHERE a.usuario_id = $1 AND e.status = 'aprovada'
         ORDER BY a.criado_em DESC`,
        [usuarioId]
      ),
      pool.query(
        `SELECT f.id_foto, f.url, f.avaliacao_id, a.empresa_id, e.nome_fantasia AS empresa_nome, f.criado_em
         FROM fotos_avaliacao f
         JOIN avaliacoes a ON a.id_avaliacao = f.avaliacao_id
         JOIN empresas e ON e.id_empresa = a.empresa_id
         WHERE a.usuario_id = $1 AND e.status = 'aprovada'
         ORDER BY f.criado_em DESC, f.id_foto DESC`,
        [usuarioId]
      ),
    ]);

  return {
    total_avaliacoes: avaliacoes.rows.length,
    total_fotos: fotos.rows.length,
    avaliacoes: avaliacoes.rows,
    fotos: fotos.rows,
  };
}

// GET /usuarios/me/perfil — o próprio perfil (sempre completo)
router.get('/me/perfil', verificarToken, async (req, res) => {
  try {
    return res.json(await montarPerfil(req.usuario.id));
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar perfil.' });
  }
});

// Id de quem está logado, se houver token válido (rota pública não exige login)
function usuarioOpcional(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return null;
  }
}

// GET /usuarios/:id/perfil — perfil de outra pessoa; conta privada mostra só nome e foto
router.get('/:id/perfil', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const usuario = Number.isInteger(id) && id > 0
      ? await pool.query(
          'SELECT id_usuario AS id, nome, foto_perfil_url, biografia, conta_privada FROM usuarios WHERE id_usuario = $1',
          [id]
        )
      : { rows: [] };
    if (!usuario.rows[0]) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const { biografia, conta_privada, ...basico } = usuario.rows[0];
    if (conta_privada && usuarioOpcional(req) !== id) {
      return res.json({ ...basico, conta_privada: true });
    }
    return res.json({ ...basico, biografia, conta_privada, ...(await montarPerfil(id)) });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar perfil.' });
  }
});

// DELETE /usuarios/me — confere a senha e apaga a conta com tudo o que é dela (empresas incluídas)
router.delete('/me', verificarToken, async (req, res) => {
  const senha = req.body?.senha;
  if (typeof senha !== 'string' || !senha) {
    return res.status(400).json({ erro: 'senha é obrigatória para excluir a conta.' });
  }

  const cliente = await pool.connect();
  try {
    const resultado = await cliente.query('SELECT senha_hash, tipo FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);
    const usuario = resultado.rows[0];
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    if (usuario.tipo === 'admin') {
      return res.status(403).json({ erro: 'A conta de administradora não pode ser excluída por aqui.' });
    }
    // Senha errada responde 403 (o 401 faria o app encerrar a sessão)
    if (!(await bcrypt.compare(senha, usuario.senha_hash))) {
      return res.status(403).json({ erro: 'Senha incorreta.' });
    }

    await cliente.query('BEGIN');

    // Empresas de outras pessoas que esta conta avaliou (a nota delas muda)
    const avaliadas = await cliente.query(
      `SELECT DISTINCT a.empresa_id FROM avaliacoes a
       JOIN empresas e ON e.id_empresa = a.empresa_id
       WHERE a.usuario_id = $1 AND e.id_usuario <> $1`,
      [req.usuario.id]
    );

    // O banco apaga em cascata empresas, avaliações, listas, salvos, histórico e códigos
    await cliente.query('DELETE FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);

    for (const { empresa_id } of avaliadas.rows) {
      await cliente.query(
        `UPDATE empresas SET
           nota_media = COALESCE((SELECT AVG(nota) FROM avaliacoes WHERE empresa_id = $1), 0),
           total_avaliacoes = (SELECT COUNT(*) FROM avaliacoes WHERE empresa_id = $1)
         WHERE id_empresa = $1`,
        [empresa_id]
      );
    }

    await cliente.query('COMMIT');
    return res.json({ mensagem: 'Conta excluída.' });
  } catch (erro) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao excluir conta.' });
  } finally {
    cliente.release();
  }
});

// PASSO 1 da troca de senha: gera um código de 6 dígitos e envia para o e-mail
router.post('/me/solicitar-codigo-senha', verificarToken, async (req, res) => {
  try {
    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const expiraEm = new Date(Date.now() + 10 * 60 * 1000); // válido por 10 minutos

    await pool.query(
      `INSERT INTO codigos_verificacao_senha (usuario_id, codigo, expira_em)
       VALUES ($1, $2, $3)`,
      [req.usuario.id, codigo, expiraEm]
    );

    const nodemailer = require('nodemailer');
    const transportador = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_SENHA_APP },
    });

    const usuario = await pool.query('SELECT email FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);

    await transportador.sendMail({
      from: process.env.EMAIL_USER,
      to: usuario.rows[0].email,
      subject: 'Código para trocar sua senha — DivulgaMap',
      text: `Seu código é: ${codigo}. Se você não pediu essa troca de senha, ignore este e-mail.`,
    });

    return res.json({ mensagem: 'Código enviado para o seu e-mail.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao enviar código.' });
  }
});

// PASSO 2 da troca de senha: confirma o código e só então troca a senha
router.put('/me/senha', verificarToken, async (req, res) => {
  try {
    const { codigo, novaSenha } = req.body;

    if (!codigo || !novaSenha) {
      return res.status(400).json({ erro: 'codigo e novaSenha são obrigatórios.' });
    }

    const resultado = await pool.query(
      `SELECT * FROM codigos_verificacao_senha
       WHERE usuario_id = $1 AND codigo = $2 AND usado = FALSE AND expira_em > NOW()
       ORDER BY criado_em DESC LIMIT 1`,
      [req.usuario.id, codigo]
    );

    const registro = resultado.rows[0];
    if (!registro) {
      return res.status(400).json({ erro: 'Código inválido ou expirado.' });
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id_usuario = $2', [senhaHash, req.usuario.id]);
    await pool.query('UPDATE codigos_verificacao_senha SET usado = TRUE WHERE id_codigo = $1', [registro.id_codigo]);

    return res.json({ mensagem: 'Senha alterada com sucesso.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao trocar senha.' });
  }
});

module.exports = router;