const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

// ROTA DE CADASTRO
router.post('/cadastro', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    // 1. Verifica se já existe um usuário com esse e-mail
    const usuarioExistente = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );

    if (usuarioExistente.rows.length > 0) {
      return res.status(400).json({ erro: 'E-mail já cadastrado.' });
    }

    // 2. Criptografa a senha antes de guardar
    const senhaHash = await bcrypt.hash(senha, 10);

    // 3. Insere o novo usuário no banco
    const novoUsuario = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id_usuario AS id, nome, email',
      [nome, email, senhaHash]
    );

    return res.status(201).json(novoUsuario.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
  }
});

// ROTA DE LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    // 1. Busca o usuário pelo e-mail
    const resultado = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );
    const usuario = resultado.rows[0];

    if (!usuario) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    // 2. Compara a senha digitada com o hash guardado
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    // 3. Gera o token JWT (o "crachá" do usuário logado)
    const token = jwt.sign(
      { id: usuario.id_usuario, nome: usuario.nome,  tipo: usuario.tipo },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

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