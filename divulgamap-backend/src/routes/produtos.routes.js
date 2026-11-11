const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');
const verificarDonoEmpresa = require('../middlewares/donoEmpresa');
const idValido = require('../utils/id');

const router = express.Router();

// LISTAR produtos de uma empresa específica
router.get('/empresa/:empresaId', async (req, res) => {
  try {
    const empresaId = idValido(req.params.empresaId);
    if (!empresaId) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }
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
router.post('/', verificarToken, verificarDonoEmpresa, async (req, res) => {
  try {
    const corpo = req.body || {};
    if (corpo.nome === undefined || corpo.preco === undefined) {
      return res.status(400).json({ erro: 'nome e preco são obrigatórios.' });
    }
    const { campos, erro } = await validarEdicaoProduto(corpo);
    if (erro) {
      return res.status(400).json({ erro });
    }
    const { tipo_item, nome, categoria_id, descricao, preco, unidade_medida, foto_url } = campos;
    const empresa_id = req.empresa.id_empresa;

    const novoProduto = await pool.query(
      `INSERT INTO produtos (empresa_id, tipo_item, nome, categoria_id, descricao, preco, unidade_medida, foto_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [empresa_id, tipo_item || 'produto', nome, categoria_id ?? null, descricao ?? null, preco, unidade_medida || 'un', foto_url ?? null]
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
router.post('/:empresaId/planilha', verificarToken, verificarDonoEmpresa, upload.single('planilha'), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo enviado, ou o formato não é .xlsx/.xls/.csv.' });
    }

    const planilha = xlsx.read(req.file.buffer, { type: 'buffer' });
    const primeiraAba = planilha.Sheets[planilha.SheetNames[0]];
    const linhas = xlsx.utils.sheet_to_json(primeiraAba);
    // Prévia para o app mostrar a planilha (cabeçalho + até 50 linhas)
    const previa = xlsx.utils.sheet_to_json(primeiraAba, { header: 1, defval: '' }).slice(0, 51);

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
      return res.status(400).json({ erro: 'A planilha tem linhas inválidas.', totalLinhas: linhas.length, detalhes: erros, previa });
    }

    // Tudo ou nada
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      for (const produto of produtosValidos) {
        await cliente.query(
          `INSERT INTO produtos (empresa_id, tipo_item, nome, categoria_id, preco, unidade_medida)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.empresa.id_empresa, produto.tipo_item, produto.nome, produto.categoria_id, produto.preco, produto.unidade_medida]
        );
      }
      await cliente.query('COMMIT');
    } catch (erroGravacao) {
      await cliente.query('ROLLBACK');
      throw erroGravacao;
    } finally {
      cliente.release();
    }

    return res.status(201).json({ mensagem: `${produtosValidos.length} itens importados com sucesso.`, previa });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: erro.message || 'Erro ao processar planilha.' });
  }
});

// Produto pelo id; a empresa dele passa para a verificação do dono
async function carregarProduto(req, res, next) {
  try {
    const id = idValido(req.params.id);
    if (!id) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }
    const resultado = await pool.query('SELECT * FROM produtos WHERE id_produto = $1', [id]);
    if (!resultado.rows[0] || !resultado.rows[0].disponivel) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }
    req.produto = resultado.rows[0];
    req.empresaIdAlvo = req.produto.empresa_id;
    next();
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar o produto.' });
  }
}

// Campos editáveis do produto, validados; devolve { campos } ou { erro }
async function validarEdicaoProduto(corpo) {
  const campos = {};

  if (corpo.nome !== undefined) {
    const nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : '';
    if (!nome || nome.length > 150) return { erro: 'nome não pode ficar vazio e pode ter até 150 letras.' };
    campos.nome = nome;
  }
  if (corpo.preco !== undefined) {
    const preco = Number(corpo.preco);
    if (corpo.preco === null || corpo.preco === '' || !Number.isFinite(preco) || preco <= 0 || preco >= 100000000) {
      return { erro: 'preco deve ser um número maior que zero.' };
    }
    campos.preco = preco;
  }
  if (corpo.tipo_item !== undefined) {
    if (!['produto', 'servico'].includes(corpo.tipo_item)) return { erro: 'tipo_item deve ser "produto" ou "servico".' };
    campos.tipo_item = corpo.tipo_item;
  }
  if (corpo.unidade_medida !== undefined) {
    const unidade = typeof corpo.unidade_medida === 'string' ? corpo.unidade_medida.trim() : '';
    if (!unidade || unidade.length > 20) return { erro: 'unidade_medida não pode ficar vazia e pode ter até 20 letras.' };
    campos.unidade_medida = unidade;
  }
  if (corpo.descricao !== undefined) {
    if (corpo.descricao !== null && typeof corpo.descricao !== 'string') return { erro: 'descricao precisa ser texto.' };
    campos.descricao = corpo.descricao?.trim() || null;
  }
  if (corpo.foto_url !== undefined) {
    if (corpo.foto_url !== null && typeof corpo.foto_url !== 'string') return { erro: 'foto_url precisa ser texto.' };
    const foto = corpo.foto_url?.trim() || null;
    if (foto && foto.length > 500) return { erro: 'foto_url pode ter até 500 letras.' };
    campos.foto_url = foto;
  }
  if (corpo.categoria_id !== undefined) {
    if (corpo.categoria_id === null || corpo.categoria_id === '') {
      campos.categoria_id = null;
    } else {
      const categoriaId = idValido(corpo.categoria_id);
      const existe = categoriaId
        ? await pool.query('SELECT 1 FROM categorias WHERE id_categoria = $1', [categoriaId])
        : { rows: [] };
      if (!existe.rows[0]) return { erro: 'categoria_id não existe.' };
      campos.categoria_id = categoriaId;
    }
  }

  if (Object.keys(campos).length === 0) {
    return { erro: 'Envie ao menos um campo: nome, preco, tipo_item, unidade_medida, descricao, foto_url ou categoria_id.' };
  }
  return { campos };
}

// EDITAR um produto (só o dono); só os campos enviados mudam
router.put('/:id', verificarToken, carregarProduto, verificarDonoEmpresa, async (req, res) => {
  try {
    const { campos, erro } = await validarEdicaoProduto(req.body || {});
    if (erro) {
      return res.status(400).json({ erro });
    }

    const colunas = Object.keys(campos);
    const atribuicoes = colunas.map((coluna, indice) => `${coluna} = $${indice + 2}`);
    const resultado = await pool.query(
      `UPDATE produtos SET ${atribuicoes.join(', ')}, atualizado_em = NOW()
       WHERE id_produto = $1 RETURNING *`,
      [req.produto.id_produto, ...colunas.map((coluna) => campos[coluna])]
    );
    return res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao editar o produto.' });
  }
});

// REMOVER um produto (só o dono): some do app, mas continua no banco
router.delete('/:id', verificarToken, carregarProduto, verificarDonoEmpresa, async (req, res) => {
  try {
    await pool.query(
      'UPDATE produtos SET disponivel = FALSE, atualizado_em = NOW() WHERE id_produto = $1',
      [req.produto.id_produto]
    );
    return res.json({ mensagem: 'Produto removido.' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao remover o produto.' });
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