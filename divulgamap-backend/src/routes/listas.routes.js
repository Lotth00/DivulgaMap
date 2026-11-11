const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');

const router = express.Router();

const TAMANHO_MAXIMO_NOME = 100;

// Nome da lista sem espaços nas pontas, ou null se inválido
function validarNome(nome) {
  if (typeof nome !== 'string') return null;
  const limpo = nome.trim();
  return limpo && limpo.length <= TAMANHO_MAXIMO_NOME ? limpo : null;
}

// Lista do usuário logado: 404 se não existe, 403 se é de outra pessoa
async function buscarListaDoUsuario(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(404).json({ erro: 'Lista não encontrada.' });
    return null;
  }
  const lista = await pool.query('SELECT * FROM listas WHERE id_lista = $1', [id]);
  if (!lista.rows[0]) {
    res.status(404).json({ erro: 'Lista não encontrada.' });
    return null;
  }
  if (lista.rows[0].usuario_id !== req.usuario.id) {
    res.status(403).json({ erro: 'Você não pode alterar esta lista.' });
    return null;
  }
  return lista.rows[0];
}

// GET protegida — só as listas do próprio usuário logado, com a quantidade de itens
router.get('/minhas', verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT l.*, COUNT(valido.id_salvo)::int AS total_itens
       FROM listas l
       LEFT JOIN (
         -- Só itens que ainda existem e estão visíveis (mesma regra da lista de itens)
         SELECT s.id_salvo, s.lista_id
         FROM salvos s
         LEFT JOIN empresas e ON s.tipo_item = 'empresa' AND e.id_empresa = s.item_id
         LEFT JOIN produtos p ON s.tipo_item = 'produto' AND p.id_produto = s.item_id
         LEFT JOIN empresas ep ON ep.id_empresa = p.empresa_id
         WHERE (e.status = 'aprovada') OR (p.disponivel = TRUE AND ep.status = 'aprovada')
       ) valido ON valido.lista_id = l.id_lista
       WHERE l.usuario_id = $1
       GROUP BY l.id_lista
       ORDER BY l.criado_em DESC, l.id_lista ASC`,
      [req.usuario.id]
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar listas.' });
  }
});

// POST protegida — cria uma lista nova (ex: "Favoritos", "Quero visitar")
router.post('/', verificarToken, async (req, res) => {
  try {
    const nome = validarNome(req.body?.nome);
    const privacidade = req.body?.privacidade || 'privada';
    if (!nome) {
      return res.status(400).json({ erro: `nome é obrigatório e pode ter até ${TAMANHO_MAXIMO_NOME} letras.` });
    }
    if (!['privada', 'publica'].includes(privacidade)) {
      return res.status(400).json({ erro: 'privacidade deve ser "privada" ou "publica".' });
    }
    const novaLista = await pool.query(
      'INSERT INTO listas (usuario_id, nome, privacidade) VALUES ($1, $2, $3) RETURNING *',
      [req.usuario.id, nome, privacidade]
    );
    return res.status(201).json(novaLista.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao criar lista.' });
  }
});

// PUT protegida — renomeia a lista
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const nome = validarNome(req.body?.nome);
    if (!nome) {
      return res.status(400).json({ erro: `nome é obrigatório e pode ter até ${TAMANHO_MAXIMO_NOME} letras.` });
    }
    const lista = await buscarListaDoUsuario(req, res);
    if (!lista) return;

    const atualizada = await pool.query(
      'UPDATE listas SET nome = $1, atualizado_em = NOW() WHERE id_lista = $2 RETURNING *',
      [nome, lista.id_lista]
    );
    return res.json(atualizada.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao renomear lista.' });
  }
});

// DELETE protegida — apaga a lista e os itens dela
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const lista = await buscarListaDoUsuario(req, res);
    if (!lista) return;

    await pool.query('DELETE FROM listas WHERE id_lista = $1', [lista.id_lista]);
    return res.json({ mensagem: 'Lista excluída.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao excluir lista.' });
  }
});

module.exports = router;
