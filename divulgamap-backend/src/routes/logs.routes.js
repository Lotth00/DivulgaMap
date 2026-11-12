const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');
const verificarAdmin = require('../middlewares/admin');
const idValido = require('../utils/id');

const router = express.Router();

const LIMITE_PADRAO = 50;
const LIMITE_MAXIMO = 100;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

// Registro de atividades (só admin), do mais novo ao mais antigo, com filtros e páginas
router.get('/', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { usuario, acao, de, ate } = req.query;
    const filtros = [];
    const valores = [];

    if (usuario !== undefined && usuario !== '') {
      const id = idValido(usuario);
      if (!id) return res.status(400).json({ erro: 'usuario precisa ser o número da conta.' });
      valores.push(id);
      filtros.push(`l.id_usuario = $${valores.length}`);
    }
    if (acao !== undefined && acao !== '') {
      if (typeof acao !== 'string' || !/^[a-z_]{1,40}$/.test(acao)) return res.status(400).json({ erro: 'acao inválida.' });
      valores.push(acao);
      filtros.push(`l.acao = $${valores.length}`);
    }
    for (const [nome, valor, operador] of [['de', de, '>='], ['ate', ate, '<']]) {
      if (valor === undefined || valor === '') continue;
      if (typeof valor !== 'string' || !DATA.test(valor) || Number.isNaN(new Date(`${valor}T00:00:00Z`).getTime())) {
        return res.status(400).json({ erro: `${nome} precisa ser uma data AAAA-MM-DD.` });
      }
      valores.push(valor);
      // "ate" inclui o dia inteiro (horário de Brasília)
      const dia = nome === 'ate' ? `($${valores.length}::date + 1)` : `$${valores.length}::date`;
      filtros.push(`l.criado_em ${operador} (${dia}::timestamp AT TIME ZONE 'America/Sao_Paulo')`);
    }

    const limite = req.query.limite === undefined ? LIMITE_PADRAO : Number(req.query.limite);
    const pagina = req.query.pagina === undefined ? 1 : Number(req.query.pagina);
    if (!Number.isInteger(limite) || limite < 1 || limite > LIMITE_MAXIMO) {
      return res.status(400).json({ erro: `limite precisa ser de 1 a ${LIMITE_MAXIMO}.` });
    }
    if (!Number.isInteger(pagina) || pagina < 1) {
      return res.status(400).json({ erro: 'pagina precisa ser 1 ou mais.' });
    }

    const onde = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
    const [linhas, total] = await Promise.all([
      pool.query(
        `SELECT l.id_log, l.acao, l.alvo_tipo, l.alvo_id, l.detalhes, l.ip, l.aparelho, l.criado_em,
                l.id_usuario, u.nome AS usuario_nome, u.email AS usuario_email
         FROM logs_atividade l
         LEFT JOIN usuarios u ON u.id_usuario = l.id_usuario
         ${onde}
         ORDER BY l.criado_em DESC, l.id_log DESC
         LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
        [...valores, limite, (pagina - 1) * limite]
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM logs_atividade l ${onde}`, valores),
    ]);

    return res.json({ total: total.rows[0].total, pagina, limite, registros: linhas.rows });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar o registro de atividades.' });
  }
});

module.exports = router;
