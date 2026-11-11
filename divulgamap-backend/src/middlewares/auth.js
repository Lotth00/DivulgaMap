const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Token válido e conta ainda existente; o tipo vem do banco (vale na hora, sem novo login)
async function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ erro: 'Token não fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  let dadosDoToken;
  try {
    dadosDoToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (erro) {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }

  try {
    const usuario = await pool.query(
      `SELECT nome, tipo, EXTRACT(EPOCH FROM sessoes_validas_desde) AS validas_desde
       FROM usuarios WHERE id_usuario = $1`,
      [dadosDoToken.id]
    );
    if (!usuario.rows[0]) {
      return res.status(401).json({ erro: 'Conta não encontrada. Faça login de novo.' });
    }
    // Login feito antes de "desconectar outros dispositivos"
    const validasDesde = usuario.rows[0].validas_desde;
    if (validasDesde && dadosDoToken.iat < Math.floor(Number(validasDesde))) {
      return res.status(401).json({ erro: 'Sua senha foi alterada. Faça login de novo.' });
    }
    req.usuario = { ...dadosDoToken, nome: usuario.rows[0].nome, tipo: usuario.rows[0].tipo };
    next();
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao verificar a sessão.' });
  }
}

module.exports = verificarToken;
