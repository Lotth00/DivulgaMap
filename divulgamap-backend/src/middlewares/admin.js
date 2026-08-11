function verificarAdmin(req, res, next) {
  if (req.usuario?.tipo !== 'admin') {
    return res.status(403).json({ erro: 'Apenas administradores podem fazer isso.' });
  }
  next();
}

module.exports = verificarAdmin;