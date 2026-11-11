const express = require('express');
const nodemailer = require('nodemailer');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');

const router = express.Router();

const TAMANHO_MAXIMO_MENSAGEM = 2000;
const TITULOS = { problema: 'Problema relatado', sugestao: 'Sugestão' };
const LIMITE_POR_HORA = 5;
const UMA_HORA = 60 * 60 * 1000;

// Envios recentes de cada conta (protege a cota diária do Gmail, usada também pelos códigos)
const enviosPorUsuario = new Map();

function podeEnviar(usuarioId) {
  const agora = Date.now();
  const recentes = (enviosPorUsuario.get(usuarioId) || []).filter((momento) => agora - momento < UMA_HORA);
  enviosPorUsuario.set(usuarioId, recentes);
  return recentes.length < LIMITE_POR_HORA;
}

// POST /feedback — envia um problema ou uma sugestão para o e-mail do DivulgaMap
router.post('/', verificarToken, async (req, res) => {
  try {
    const { tipo } = req.body ?? {};
    const mensagem = typeof req.body?.mensagem === 'string' ? req.body.mensagem.trim() : '';

    if (!TITULOS[tipo]) {
      return res.status(400).json({ erro: 'tipo deve ser "problema" ou "sugestao".' });
    }
    if (!mensagem || mensagem.length > TAMANHO_MAXIMO_MENSAGEM) {
      return res.status(400).json({ erro: `mensagem é obrigatória e pode ter até ${TAMANHO_MAXIMO_MENSAGEM} letras.` });
    }
    if (!podeEnviar(req.usuario.id)) {
      return res.status(429).json({ erro: `Você já enviou ${LIMITE_POR_HORA} mensagens na última hora. Tente mais tarde.` });
    }
    if (!process.env.EMAIL_USER || !process.env.EMAIL_SENHA_APP) {
      return res.status(500).json({ erro: 'Envio de e-mail não configurado no servidor.' });
    }

    const usuario = await pool.query('SELECT nome, email FROM usuarios WHERE id_usuario = $1', [req.usuario.id]);
    const { nome, email } = usuario.rows[0] || { nome: '(conta não encontrada)', email: null };

    const transportador = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_SENHA_APP },
    });
    await transportador.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      replyTo: email || undefined,
      subject: `[DivulgaMap] ${TITULOS[tipo]}`,
      text: `${TITULOS[tipo]} de ${nome} (${email || 'sem e-mail'}, conta ${req.usuario.id}):\n\n${mensagem}`,
    });
    enviosPorUsuario.get(req.usuario.id).push(Date.now());

    return res.json({ mensagem: 'Obrigado! Sua mensagem foi enviada.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao enviar a mensagem.' });
  }
});

module.exports = router;
