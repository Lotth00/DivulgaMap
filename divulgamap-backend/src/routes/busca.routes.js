const express = require('express');
const pool = require('../config/db');

const router = express.Router();

const FUSO_HORARIO = 'America/Sao_Paulo';
const SEMELHANCA_MINIMA = 0.3;
const LIMITE = 20;
const TAMANHO_MAXIMO_BUSCA = 100;

// Pontuação de um texto na busca: 1 se contém o termo, senão a semelhança entre as palavras
function pontuacao(coluna) {
  const texto = `unaccent(lower(${coluna}))`;
  const termo = 'unaccent(lower($1::text))';
  return `GREATEST(strict_word_similarity(${termo}, ${texto}), CASE WHEN strpos(${texto}, ${termo}) > 0 THEN 1 ELSE 0 END)`;
}

// Categoria do item: a do produto ou, sem ela, a primeira da empresa
const CATEGORIA_DO_ITEM = `COALESCE(cp.nome, (
  SELECT c.nome FROM empresa_categoria ec
  JOIN categorias c ON c.id_categoria = ec.categoria_id
  WHERE ec.empresa_id = e.id_empresa
  ORDER BY c.nome LIMIT 1
))`;

// GET pública — produtos, serviços e ofertas em vigor que combinam com a busca e/ou a categoria
router.get('/itens', async (req, res) => {
  try {
    const busca = typeof req.query.busca === 'string' ? req.query.busca.trim() : '';
    const categoria = typeof req.query.categoria === 'string' ? req.query.categoria.trim() : '';

    if (!busca && !categoria) {
      return res.status(400).json({ erro: 'Envie busca ou categoria.' });
    }
    if (busca.length > TAMANHO_MAXIMO_BUSCA) {
      return res.status(400).json({ erro: `busca pode ter até ${TAMANHO_MAXIMO_BUSCA} letras.` });
    }

    // $1 busca, $2 semelhança mínima, $3 categoria (e $4 fuso, só nas ofertas)
    const valores = [busca || null, SEMELHANCA_MINIMA, categoria || null];

    const [produtos, ofertas] = await Promise.all([
      pool.query(
        `SELECT * FROM (
           SELECT
             p.id_produto AS id,
             p.nome,
             p.tipo_item,
             p.preco,
             p.unidade_medida,
             p.foto_url AS foto,
             e.id_empresa AS empresa_id,
             e.nome_fantasia AS empresa_nome,
             ${CATEGORIA_DO_ITEM} AS categoria,
             CASE WHEN $1::text IS NULL THEN 1 ELSE ${pontuacao('p.nome')} END AS relevancia
           FROM produtos p
           JOIN empresas e ON e.id_empresa = p.empresa_id
           LEFT JOIN categorias cp ON cp.id_categoria = p.categoria_id
           WHERE e.status = 'aprovada' AND p.disponivel = TRUE
         ) item
         WHERE item.relevancia >= $2::float8 AND ($3::text IS NULL OR item.categoria = $3::text)
         ORDER BY item.relevancia DESC, item.nome
         LIMIT ${LIMITE}`,
        valores
      ),
      pool.query(
        `SELECT * FROM (
           SELECT
             p.id_promocao AS id,
             p.tipo,
             p.titulo,
             p.condicao,
             p.desconto_percentual,
             pr.nome AS produto_nome,
             pr.tipo_item,
             CASE WHEN pr.preco IS NOT NULL AND p.desconto_percentual IS NOT NULL
                  THEN ROUND(pr.preco * (100 - p.desconto_percentual) / 100, 2)
             END AS preco_promocional,
             COALESCE(pr.foto_url, (
               SELECT f.url FROM fotos_empresa f
               WHERE f.empresa_id = e.id_empresa
               ORDER BY f.ordem, f.id_foto LIMIT 1
             )) AS foto,
             e.id_empresa AS empresa_id,
             e.nome_fantasia AS empresa_nome,
             ${CATEGORIA_DO_ITEM} AS categoria,
             CASE WHEN $1::text IS NULL THEN 1
                  ELSE GREATEST(${pontuacao('p.titulo')}, COALESCE(${pontuacao('pr.nome')}, 0)) END AS relevancia
           FROM promocoes p
           JOIN empresas e ON e.id_empresa = p.empresa_id
           LEFT JOIN produtos pr ON pr.id_produto = p.produto_id
           LEFT JOIN categorias cp ON cp.id_categoria = pr.categoria_id
           WHERE e.status = 'aprovada'
             AND p.data_inicio <= (NOW() AT TIME ZONE $4::text)
             AND p.data_fim >= (NOW() AT TIME ZONE $4::text)
             AND (p.produto_id IS NULL OR pr.disponivel = TRUE)
         ) oferta
         WHERE oferta.relevancia >= $2::float8 AND ($3::text IS NULL OR oferta.categoria = $3::text)
         ORDER BY oferta.relevancia DESC, oferta.titulo
         LIMIT ${LIMITE}`,
        [...valores, FUSO_HORARIO]
      ),
    ]);

    return res.json({
      produtos: produtos.rows.map(({ relevancia, ...item }) => item),
      ofertas: ofertas.rows.map(({ relevancia, ...item }) => item),
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar itens.' });
  }
});

module.exports = router;
