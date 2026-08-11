const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');

const router = express.Router();

// GET /usuarios/me — dados do usuário logado (nome, email, telefone, biografia, etc.)
router.get('/me', verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id_usuario AS id, nome, email, tipo, telefone, foto_perfil_url, biografia
       FROM usuarios WHERE id_usuario = $1`,
      [req.usuario.id]
    );
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

// PUT /usuarios/me — atualiza só dados "simples": nome, telefone, biografia
router.put('/me', verificarToken, async (req, res) => {
  try {
    const { nome, telefone, biografia } = req.body;

    const resultado = await pool.query(
      `UPDATE usuarios SET
        nome = COALESCE($1, nome),
        telefone = COALESCE($2, telefone),
        biografia = COALESCE($3, biografia)
       WHERE id_usuario = $4
       RETURNING id_usuario AS id, nome, email, telefone, biografia`,
      [nome, telefone, biografia, req.usuario.id]
    );

    return res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao atualizar usuário.' });
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