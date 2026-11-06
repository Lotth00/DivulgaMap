const pool = require('../config/db');

// Confere se a empresa existe e pertence ao usuário logado (admin sempre passa)
async function verificarDonoEmpresa(req, res, next) {
  try {
    const idRecebido = req.params.empresaId ?? req.params.id ?? req.body?.empresa_id;

    if (idRecebido === undefined || idRecebido === null || idRecebido === '') {
      return res.status(400).json({ erro: 'empresa_id é obrigatório.' });
    }

    const id = Number(idRecebido);
    if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }

    const resultado = await pool.query('SELECT * FROM empresas WHERE id_empresa = $1', [id]);
    const empresa = resultado.rows[0];

    if (!empresa) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }
    if (empresa.id_usuario !== req.usuario.id && req.usuario.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Você não pode alterar esta empresa.' });
    }

    req.empresa = empresa;
    next();
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao verificar a empresa.' });
  }
}

module.exports = verificarDonoEmpresa;
