const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');

const router = express.Router();

// LISTAR produtos de uma empresa específica
router.get('/empresa/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const resultado = await pool.query(
      `SELECT p.*, c.nome AS categoria_nome
       FROM produtos p
       LEFT JOIN categorias c ON c.id_categoria = p.categoria_id
       WHERE p.empresa_id = $1 AND p.disponivel = TRUE
       ORDER BY p.nome`,
      [empresaId]
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar produtos.' });
  }
});

// CRIAR um novo produto/serviço manualmente (protegida)
router.post('/', verificarToken, async (req, res) => {
  try {
    const { empresa_id, tipo_item, nome, categoria_id, descricao, preco, unidade_medida } = req.body;

    const novoProduto = await pool.query(
      `INSERT INTO produtos (empresa_id, tipo_item, nome, categoria_id, descricao, preco, unidade_medida)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [empresa_id, tipo_item || 'produto', nome, categoria_id || null, descricao, preco, unidade_medida || 'un']
    );

    return res.status(201).json(novoProduto.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao criar produto.' });
  }
});

const multer = require('multer');
const xlsx = require('xlsx');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, callback) => {
    const extensoesAceitas = ['.xlsx', '.xls', '.csv'];
    const extensaoDoArquivo = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();

    if (!extensoesAceitas.includes(extensaoDoArquivo)) {
      return callback(new Error('Formato de arquivo não suportado. Envie .xlsx, .xls ou .csv.'));
    }
    callback(null, true);
  },
});

// As colunas esperadas
const COLUNA_TIPO = 'Tipo de Item';
const COLUNA_NOME = 'Nome do Item';
const COLUNA_CATEGORIA = 'Categoria';
const COLUNA_PRECO = 'Preço Regular';
const COLUNA_UNIDADE = 'Unidade de Medida';

// PASSO 11+12: recebe a planilha, valida e só grava se estiver ok
router.post('/:empresaId/planilha', verificarToken, upload.single('planilha'), async (req, res) => {
  try {
    const { empresaId } = req.params;

    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo enviado, ou o formato não é .xlsx/.xls/.csv.' });
    }

    const planilha = xlsx.read(req.file.buffer, { type: 'buffer' });
    const primeiraAba = planilha.Sheets[planilha.SheetNames[0]];
    const linhas = xlsx.utils.sheet_to_json(primeiraAba);

    const categoriasCadastradas = await pool.query('SELECT id_categoria, nome FROM categorias');
    const mapaDeCategorias = new Map(
      categoriasCadastradas.rows.map((c) => [c.nome.toLowerCase().trim(), c.id_categoria])
    );

    const erros = [];
    const produtosValidos = [];

    linhas.forEach((linha, indice) => {
      const numeroDaLinha = indice + 2;
      const problemasDaLinha = [];

      // Tipo: "Produto" ou "Serviço"
      const tipoDigitado = String(linha[COLUNA_TIPO] || '').trim().toLowerCase();
      let tipoItem = null;
      if (tipoDigitado === 'produto') {
        tipoItem = 'produto';
      } else if (tipoDigitado === 'serviço' || tipoDigitado === 'servico') {
        tipoItem = 'servico';
      } else {
        problemasDaLinha.push({ coluna: COLUNA_TIPO, motivo: 'deve ser exatamente "Produto" ou "Serviço"' });
      }

      // Nome: obrigatório
      const nomeDigitado = String(linha[COLUNA_NOME] || '').trim();
      if (!nomeDigitado) {
        problemasDaLinha.push({ coluna: COLUNA_NOME, motivo: 'não pode ficar vazio' });
      }

      // Categoria: precisa existir no cadastro de categorias do app
      const categoriaDigitada = String(linha[COLUNA_CATEGORIA] || '').trim();
      const categoriaId = mapaDeCategorias.get(categoriaDigitada.toLowerCase());
      if (!categoriaDigitada) {
        problemasDaLinha.push({ coluna: COLUNA_CATEGORIA, motivo: 'não pode ficar vazia' });
      } else if (!categoriaId) {
        problemasDaLinha.push({
          coluna: COLUNA_CATEGORIA,
          motivo: `"${categoriaDigitada}" não existe. Categorias válidas: ${[...mapaDeCategorias.keys()].join(', ')}`,
        });
      }

      // Preço Regular: obrigatório, numérico, maior que zero
      const precoDigitado = Number(linha[COLUNA_PRECO]);
      if (!linha[COLUNA_PRECO] || isNaN(precoDigitado) || precoDigitado <= 0) {
        problemasDaLinha.push({ coluna: COLUNA_PRECO, motivo: 'deve ser um número maior que zero' });
      }

      // Unidade de Medida: obrigatória (un, kg, hora, etc.)
      const unidadeDigitada = String(linha[COLUNA_UNIDADE] || '').trim();
      if (!unidadeDigitada) {
        problemasDaLinha.push({ coluna: COLUNA_UNIDADE, motivo: 'não pode ficar vazia (ex: un, kg, hora)' });
      }

      if (problemasDaLinha.length > 0) {
        erros.push({ linha: numeroDaLinha, problemas: problemasDaLinha });
      } else {
        produtosValidos.push({
          tipo_item: tipoItem,
          nome: nomeDigitado,
          categoria_id: categoriaId,
          preco: precoDigitado,
          unidade_medida: unidadeDigitada,
        });
      }
    });

    if (erros.length > 0) {
      return res.status(400).json({ erro: 'A planilha tem linhas inválidas.', totalLinhas: linhas.length, detalhes: erros });
    }

    for (const produto of produtosValidos) {
      await pool.query(
        `INSERT INTO produtos (empresa_id, tipo_item, nome, categoria_id, preco, unidade_medida)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [empresaId, produto.tipo_item, produto.nome, produto.categoria_id, produto.preco, produto.unidade_medida]
      );
    }

    return res.status(201).json({ mensagem: `${produtosValidos.length} itens importados com sucesso.` });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: erro.message || 'Erro ao processar planilha.' });
  }
});

router.use((erro, req, res, next) => {
  if (erro) {
    console.error(erro);
    return res.status(400).json({ erro: erro.message || 'Erro ao processar o arquivo enviado.' });
  }
  next();
});

module.exports = router;