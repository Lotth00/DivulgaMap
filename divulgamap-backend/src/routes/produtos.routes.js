const express = require('express');
const pool = require('../config/db');
const verificarToken = require('../middlewares/auth');
const verificarDonoEmpresa = require('../middlewares/donoEmpresa');
const idValido = require('../utils/id');
const jwt = require('jsonwebtoken');

// Usuário do token, se houver um válido (rotas públicas)
function usuarioOpcional(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

const router = express.Router();

// LISTAR produtos de uma empresa específica
router.get('/empresa/:empresaId', async (req, res) => {
  try {
    const empresaId = idValido(req.params.empresaId);
    if (!empresaId) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }
    // Empresa ainda não aprovada: só o dono ou o admin veem os itens
    const empresa = await pool.query('SELECT status, id_usuario FROM empresas WHERE id_empresa = $1', [empresaId]);
    if (!empresa.rows[0]) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }
    if (empresa.rows[0].status !== 'aprovada') {
      const usuario = usuarioOpcional(req);
      if (!usuario || (usuario.id !== empresa.rows[0].id_usuario && usuario.tipo !== 'admin')) {
        return res.status(404).json({ erro: 'Empresa não encontrada.' });
      }
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

const LIMITE_SERVICOS = 20;

// SERVIÇOS disponíveis de empresas aprovadas, com nota, foto do serviço, bairro e oferta ativa; com lat/lng, dos mais perto
router.get('/servicos-proximos', async (req, res) => {
  try {
    const { lat, lng, categoria } = req.query;
    const valores = ['America/Sao_Paulo'];
    const filtros = [];

    if (categoria) {
      valores.push(categoria);
      filtros.push(`AND COALESCE(cp.nome, ce.nome) = $${valores.length}`);
    }

    let distancia = 'NULL::float8';
    const temLat = lat !== undefined && lat !== '';
    if (temLat !== (lng !== undefined && lng !== '')) {
      return res.status(400).json({ erro: 'Envie lat e lng juntos.' });
    }
    if (temLat) {
      const latitude = Number(lat);
      const longitude = Number(lng);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        return res.status(400).json({ erro: 'lat e lng precisam ser coordenadas válidas.' });
      }
      valores.push(latitude, longitude);
      const pLat = `$${valores.length - 1}::float8`;
      const pLng = `$${valores.length}::float8`;
      distancia = `ROUND((6371 * 2 * ASIN(SQRT(
          POWER(SIN(RADIANS(en.latitude::float8 - ${pLat}) / 2), 2) +
          COS(RADIANS(${pLat})) * COS(RADIANS(en.latitude::float8)) *
          POWER(SIN(RADIANS(en.longitude::float8 - ${pLng}) / 2), 2)
        )))::numeric, 2)::float8`;
    }
    valores.push(LIMITE_SERVICOS);

    const resultado = await pool.query(
      `SELECT p.id_produto, p.nome, p.descricao, p.preco, p.unidade_medida, p.forma_cobranca,
              e.id_empresa AS empresa_id, e.nome_fantasia AS empresa_nome, e.nota_media, e.total_avaliacoes,
              p.foto_url AS foto, en.bairro,
              COALESCE(cp.nome, ce.nome) AS categoria,
              o.id_promocao AS oferta_id, o.desconto_percentual, o.condicao,
              CASE WHEN p.preco IS NOT NULL AND o.desconto_percentual IS NOT NULL
                   THEN ROUND(p.preco * (100 - o.desconto_percentual) / 100, 2) END AS preco_promocional,
              ${distancia} AS distancia_km
       FROM produtos p
       JOIN empresas e ON e.id_empresa = p.empresa_id
       LEFT JOIN categorias cp ON cp.id_categoria = p.categoria_id
       LEFT JOIN LATERAL (
         SELECT c.nome FROM empresa_categoria ec JOIN categorias c ON c.id_categoria = ec.categoria_id
         WHERE ec.empresa_id = e.id_empresa ORDER BY c.nome LIMIT 1
       ) ce ON TRUE
       LEFT JOIN LATERAL (
         SELECT bairro, latitude, longitude FROM enderecos WHERE empresa_id = e.id_empresa ORDER BY id_endereco LIMIT 1
       ) en ON TRUE
       LEFT JOIN LATERAL (
         SELECT pr.id_promocao, pr.desconto_percentual, pr.condicao FROM promocoes pr
         WHERE pr.produto_id = p.id_produto AND pr.status <> 'expirada'
           AND pr.data_inicio <= (NOW() AT TIME ZONE $1) AND pr.data_fim >= (NOW() AT TIME ZONE $1)
         ORDER BY pr.data_fim LIMIT 1
       ) o ON TRUE
       WHERE p.tipo_item = 'servico' AND p.disponivel = TRUE AND e.status = 'aprovada'
         ${filtros.join(' ')}
       ORDER BY ${temLat ? 'distancia_km ASC NULLS LAST, ' : ''}(o.id_promocao IS NULL), e.nota_media DESC, p.id_produto DESC
       LIMIT $${valores.length}`,
      valores
    );
    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao buscar serviços.' });
  }
});

// CRIAR um novo produto/serviço manualmente (protegida)
router.post('/', verificarToken, verificarDonoEmpresa, async (req, res) => {
  try {
    const corpo = req.body || {};
    const forma = corpo.forma_cobranca ?? 'preco';
    if (corpo.nome === undefined || (forma === 'preco' && corpo.preco === undefined)) {
      return res.status(400).json({ erro: 'nome e preco são obrigatórios (preco só pode faltar em sob_consulta ou orcamento_gratuito).' });
    }
    const { campos, erro } = await validarEdicaoProduto(corpo);
    if (erro) {
      return res.status(400).json({ erro });
    }
    const { tipo_item, nome, categoria_id, descricao, preco, unidade_medida, foto_url, forma_cobranca } = campos;
    const empresa_id = req.empresa.id_empresa;

    const novoProduto = await pool.query(
      `INSERT INTO produtos (empresa_id, tipo_item, nome, categoria_id, descricao, preco, unidade_medida, foto_url, forma_cobranca)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [empresa_id, tipo_item || 'produto', nome, categoria_id ?? null, descricao ?? null, preco ?? null, unidade_medida || 'un', foto_url ?? null, forma_cobranca || 'preco']
    );

    return res.status(201).json(novoProduto.rows[0]);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao criar produto.' });
  }
});

const multer = require('multer');
const xlsx = require('xlsx');

const TAMANHO_MAXIMO_PLANILHA = 2 * 1024 * 1024;
const MAXIMO_LINHAS_PLANILHA = 500;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO_PLANILHA },
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
    if (linhas.length > MAXIMO_LINHAS_PLANILHA) {
      return res.status(400).json({ erro: `A planilha pode ter até ${MAXIMO_LINHAS_PLANILHA} itens.` });
    }
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
      } else if (nomeDigitado.length > 150) {
        problemasDaLinha.push({ coluna: COLUNA_NOME, motivo: 'pode ter até 150 letras' });
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
      if (!linha[COLUNA_PRECO] || isNaN(precoDigitado) || precoDigitado <= 0 || precoDigitado >= 100000000) {
        problemasDaLinha.push({ coluna: COLUNA_PRECO, motivo: 'deve ser um número maior que zero' });
      }

      // Unidade de Medida: obrigatória (un, kg, hora, etc.)
      const unidadeDigitada = String(linha[COLUNA_UNIDADE] || '').trim();
      if (!unidadeDigitada) {
        problemasDaLinha.push({ coluna: COLUNA_UNIDADE, motivo: 'não pode ficar vazia (ex: un, kg, hora)' });
      } else if (unidadeDigitada.length > 20) {
        problemasDaLinha.push({ coluna: COLUNA_UNIDADE, motivo: 'pode ter até 20 letras' });
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
    return res.status(500).json({ erro: 'Erro ao processar a planilha. Confira o arquivo e tente de novo.' });
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

const FORMAS_COBRANCA = ['preco', 'sob_consulta', 'orcamento_gratuito'];

// Campos editáveis do produto, validados; devolve { campos } ou { erro }
async function validarEdicaoProduto(corpo, formaAtual = 'preco') {
  const campos = {};

  if (corpo.nome !== undefined) {
    const nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : '';
    if (!nome || nome.length > 150) return { erro: 'nome não pode ficar vazio e pode ter até 150 letras.' };
    campos.nome = nome;
  }
  if (corpo.forma_cobranca !== undefined) {
    if (!FORMAS_COBRANCA.includes(corpo.forma_cobranca)) {
      return { erro: 'forma_cobranca deve ser "preco", "sob_consulta" ou "orcamento_gratuito".' };
    }
    campos.forma_cobranca = corpo.forma_cobranca;
  }
  if (corpo.preco !== undefined) {
    const semPreco = corpo.preco === null || corpo.preco === '';
    const preco = Number(corpo.preco);
    if (semPreco && (campos.forma_cobranca ?? formaAtual) !== 'preco') {
      campos.preco = null;
    } else if (semPreco || !Number.isFinite(preco) || preco <= 0 || preco >= 100000000) {
      return { erro: 'preco deve ser um número maior que zero.' };
    } else {
      campos.preco = preco;
    }
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
    return { erro: 'Envie ao menos um campo: nome, preco, forma_cobranca, tipo_item, unidade_medida, descricao, foto_url ou categoria_id.' };
  }
  return { campos };
}

// EDITAR um produto (só o dono); só os campos enviados mudam
router.put('/:id', verificarToken, carregarProduto, verificarDonoEmpresa, async (req, res) => {
  try {
    const { campos, erro } = await validarEdicaoProduto(req.body || {}, req.produto.forma_cobranca);
    if (erro) {
      return res.status(400).json({ erro });
    }

    const precoFinal = campos.preco !== undefined ? campos.preco : req.produto.preco;
    if ((campos.forma_cobranca ?? req.produto.forma_cobranca) === 'preco' && precoFinal === null) {
      return res.status(400).json({ erro: 'Com forma_cobranca "preco", o preco é obrigatório.' });
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
    const mensagem = erro.code === 'LIMIT_FILE_SIZE' ? 'A planilha pode ter até 2 MB.' : erro.message;
    return res.status(400).json({ erro: mensagem || 'Erro ao processar o arquivo enviado.' });
  }
  next();
});

module.exports = router;