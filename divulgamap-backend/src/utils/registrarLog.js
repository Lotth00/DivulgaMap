const pool = require('../config/db');

const DIAS_GUARDADOS = 90;
const UM_DIA = 24 * 60 * 60 * 1000;
const TAMANHO_APARELHO = 200;

// Chaves que nunca vão para o registro, mesmo se alguém passar por engano
const PROIBIDAS = /senha|codigo|token|hash|secret/i;

let ultimaLimpeza = 0;

// Tira dos detalhes qualquer campo sensível
function limparDetalhes(detalhes) {
  if (!detalhes || typeof detalhes !== 'object') return null;
  const limpos = Object.fromEntries(Object.entries(detalhes).filter(([chave]) => !PROIBIDAS.test(chave)));
  return Object.keys(limpos).length ? limpos : null;
}

// Apaga os registros antigos, no máximo uma vez por dia
async function limparAntigos() {
  if (Date.now() - ultimaLimpeza < UM_DIA) return;
  ultimaLimpeza = Date.now();
  await pool.query(`DELETE FROM logs_atividade WHERE criado_em < NOW() - make_interval(days => $1)`, [DIAS_GUARDADOS]);
}

// Grava uma atividade; falhar aqui nunca atrapalha a rota
async function registrarLog(req, { acao, usuarioId, alvoTipo = null, alvoId = null, detalhes = null }) {
  try {
    const aparelho = String(req.headers?.['user-agent'] ?? '').slice(0, TAMANHO_APARELHO) || null;
    await pool.query(
      `INSERT INTO logs_atividade (id_usuario, acao, alvo_tipo, alvo_id, detalhes, ip, aparelho)
       VALUES ((SELECT id_usuario FROM usuarios WHERE id_usuario = $1), $2, $3, $4, $5, $6, $7)`,
      [usuarioId ?? req.usuario?.id ?? null, acao, alvoTipo, alvoId, limparDetalhes(detalhes), req.ip ?? null, aparelho]
    );
    await limparAntigos();
  } catch (erro) {
    console.error('Registro de atividade não gravado:', erro.message);
  }
}

module.exports = registrarLog;
