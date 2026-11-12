const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const registrarLog = require('../utils/registrarLog');

const router = express.Router();

// Limite de logins errados por e-mail e aparelho (contra quem tenta adivinhar a senha)
const MAXIMO_FALHAS = 8;
const JANELA_FALHAS = 15 * 60 * 1000;
const falhasDeLogin = new Map();

function chaveDeLogin(req, email) {
  return `${email}|${req.ip}`;
}

function bloqueado(chave) {
  const agora = Date.now();
  const recentes = (falhasDeLogin.get(chave) || []).filter((momento) => agora - momento < JANELA_FALHAS);
  if (recentes.length) falhasDeLogin.set(chave, recentes);
  else falhasDeLogin.delete(chave);
  return recentes.length >= MAXIMO_FALHAS;
}

function registrarFalha(chave) {
  falhasDeLogin.set(chave, [...(falhasDeLogin.get(chave) || []), Date.now()]);
}

// E-mail em minúsculas e sem espaços nas pontas
function normalizarEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : email;
}

// ROTA DE CADASTRO
router.post('/cadastro', async (req, res) => {
  try {
    const { nome, senha } = req.body ?? {};
    const email = normalizarEmail(req.body?.email);

    // Campos obrigatórios e senha com tamanho mínimo
    if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 100) {
      return res.status(400).json({ erro: 'Informe o seu nome (até 100 letras).' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ erro: 'Informe um e-mail válido.' });
    }
    if (typeof senha !== 'string' || senha.length < 6) {
      return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });
    }

    // 1. Verifica se já existe um usuário com esse e-mail
    const usuarioExistente = await pool.query(
      'SELECT * FROM usuarios WHERE LOWER(email) = $1',
      [email]
    );

    if (usuarioExistente.rows.length > 0) {
      return res.status(400).json({ erro: 'E-mail já cadastrado.' });
    }

    // 2. Criptografa a senha antes de guardar
    const senhaHash = await bcrypt.hash(senha, 10);

    // 3. Insere o usuário e as listas padrão juntos (tudo ou nada)
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      const novoUsuario = await cliente.query(
        'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id_usuario AS id, nome, email',
        [nome.trim(), email, senhaHash]
      );
      await cliente.query(
        `INSERT INTO listas (usuario_id, nome) VALUES ($1, 'Favoritos'), ($1, 'Lugares salvos')`,
        [novoUsuario.rows[0].id]
      );
      await cliente.query('COMMIT');
      await registrarLog(req, { acao: 'cadastro', usuarioId: novoUsuario.rows[0].id });
      return res.status(201).json(novoUsuario.rows[0]);
    } catch (erroTransacao) {
      await cliente.query('ROLLBACK');
      throw erroTransacao;
    } finally {
      cliente.release();
    }
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
  }
});

// ROTA DE LOGIN
router.post('/login', async (req, res) => {
  try {
    const senha = req.body?.senha;
    const email = normalizarEmail(req.body?.email);
    if (typeof email !== 'string' || !email || typeof senha !== 'string' || !senha) {
      return res.status(400).json({ erro: 'Informe o e-mail e a senha.' });
    }
    const chave = chaveDeLogin(req, email);
    if (bloqueado(chave)) {
      await registrarLog(req, { acao: 'login_falhou', detalhes: { email_tentado: email.slice(0, 150), motivo: 'bloqueado_por_tentativas' } });
      return res.status(429).json({ erro: 'Muitas tentativas erradas. Espere 15 minutos e tente de novo.' });
    }

    // 1. Busca o usuário pelo e-mail
    const resultado = await pool.query(
      'SELECT * FROM usuarios WHERE LOWER(email) = $1',
      [email]
    );
    const usuario = resultado.rows[0];

    if (!usuario) {
      registrarFalha(chave);
      await registrarLog(req, { acao: 'login_falhou', detalhes: { email_tentado: email.slice(0, 150), motivo: 'conta_inexistente' } });
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    // 2. Compara a senha digitada com o hash guardado
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaCorreta) {
      registrarFalha(chave);
      await registrarLog(req, { acao: 'login_falhou', usuarioId: usuario.id_usuario, detalhes: { motivo: 'senha_errada' } });
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    // 3. Gera o token JWT (o "crachá" do usuário logado)
    const token = jwt.sign(
      { id: usuario.id_usuario, nome: usuario.nome,  tipo: usuario.tipo },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    falhasDeLogin.delete(chave);
    await registrarLog(req, { acao: 'login', usuarioId: usuario.id_usuario });
    return res.json({
      token,
      usuario: { id: usuario.id_usuario, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo },
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao fazer login.' });
  }
});

module.exports = router;