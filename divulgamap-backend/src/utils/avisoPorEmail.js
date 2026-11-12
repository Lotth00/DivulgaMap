const nodemailer = require('nodemailer');

// Aviso de segurança por e-mail; uma falha no envio não atrapalha a rota
async function avisoPorEmail(para, assunto, texto) {
  if (!para || !process.env.EMAIL_USER || !process.env.EMAIL_SENHA_APP) return;
  try {
    const transportador = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_SENHA_APP },
    });
    await transportador.sendMail({
      from: process.env.EMAIL_USER,
      to: para,
      subject: `${assunto} — DivulgaMap`,
      text: `${texto}\n\nSe não foi você, troque sua senha no app (Gerenciar sua Conta > Senha e segurança) e responda este e-mail.`,
    });
  } catch (erro) {
    console.error('Aviso por e-mail não enviado:', erro.message);
  }
}

module.exports = avisoPorEmail;
