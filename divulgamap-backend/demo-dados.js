// Dados de demonstração completos (empresas, cardápios, ofertas, avaliações e anúncios) no banco da DATABASE_URL
// node demo-dados.js                 → cria (apagando a demonstração anterior)
// node demo-dados.js --limpar        → apaga só a demonstração
// node demo-dados.js --sem-cloudinary → usa as fotos direto do Unsplash, sem copiar para o Cloudinary

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { foto, RUAS, DONOS, CLIENTES, EMPRESAS, AVALIACOES, ANUNCIOS } = require('./demo/dados');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no .env.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const DOMINIO = '@demo.divulgamap';
const SENHA_DEMO = 'demo1234';
const FUSO = 'America/Sao_Paulo';
const ARQUIVO_FOTOS = path.join(__dirname, 'demo', 'fotos-cloudinary.json');
const DIAS_ANUNCIO = 7;
const DIAS_PASSADOS_ANUNCIO = 2;

// ---------- Fotos: Unsplash direto ou cópia no Cloudinary (guardada para não enviar de novo) ----------

// Nome da nuvem e preset: do .env do servidor ou do .env.local do app
function configuracaoCloudinary() {
  let nuvem = process.env.CLOUDINARY_CLOUD_NAME;
  let preset = process.env.CLOUDINARY_PRESET;
  const envApp = path.join(__dirname, '..', 'divulgamap-app', '.env.local');
  if ((!nuvem || !preset) && fs.existsSync(envApp)) {
    const linhas = fs.readFileSync(envApp, 'utf8').split(/\r?\n/);
    const ler = (nome) => linhas.find((l) => l.startsWith(`${nome}=`))?.split('=').slice(1).join('=').trim();
    nuvem = nuvem || ler('EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME');
    preset = preset || ler('EXPO_PUBLIC_CLOUDINARY_PRESET');
  }
  return nuvem && preset ? { nuvem, preset } : null;
}

const fotosGuardadas = fs.existsSync(ARQUIVO_FOTOS) ? JSON.parse(fs.readFileSync(ARQUIVO_FOTOS, 'utf8')) : {};
let cloudinary = null;
let envios = 0;

// Copia a foto para o Cloudinary (uma vez); se falhar, fica o link do Unsplash
async function urlDaFoto(urlUnsplash) {
  if (!cloudinary) return urlUnsplash;
  if (fotosGuardadas[urlUnsplash]) return fotosGuardadas[urlUnsplash];
  try {
    const corpo = new URLSearchParams({ file: urlUnsplash, upload_preset: cloudinary.preset, folder: 'divulgamap/demo' });
    const resposta = await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.nuvem}/image/upload`, { method: 'POST', body: corpo });
    const dados = await resposta.json();
    if (!dados.secure_url) throw new Error(dados.error?.message || 'sem endereço');
    fotosGuardadas[urlUnsplash] = dados.secure_url;
    envios += 1;
    return dados.secure_url;
  } catch (erro) {
    console.warn(`   ⚠ foto não copiada (${erro.message}); usando o Unsplash`);
    return urlUnsplash;
  }
}

const f = (id, largura, altura) => (id ? urlDaFoto(foto(id, largura, altura)) : Promise.resolve(null));

// ---------- Limpeza ----------

// Apaga as contas de demonstração (empresas, avaliações e anúncios saem junto) e o que outras pessoas salvaram delas
async function limpar(cliente) {
  const ids = await cliente.query(
    `SELECT
       COALESCE(array_agg(DISTINCT e.id_empresa) FILTER (WHERE e.id_empresa IS NOT NULL), '{}') AS empresas,
       COALESCE((SELECT array_agg(p.id_produto) FROM produtos p JOIN empresas x ON x.id_empresa = p.empresa_id
                 JOIN usuarios ux ON ux.id_usuario = x.id_usuario WHERE ux.email LIKE $1), '{}') AS produtos,
       COALESCE((SELECT array_agg(pr.id_promocao) FROM promocoes pr JOIN empresas x ON x.id_empresa = pr.empresa_id
                 JOIN usuarios ux ON ux.id_usuario = x.id_usuario WHERE ux.email LIKE $1), '{}') AS promocoes
     FROM usuarios u LEFT JOIN empresas e ON e.id_usuario = u.id_usuario
     WHERE u.email LIKE $1`,
    [`%${DOMINIO}`]
  );
  const { empresas, produtos, promocoes } = ids.rows[0];
  for (const [tipo, lista] of [['empresa', empresas], ['produto', produtos], ['promocao', promocoes]]) {
    if (!lista.length) continue;
    await cliente.query('DELETE FROM salvos WHERE tipo_item = $1 AND item_id = ANY($2::int[])', [tipo, lista]);
    await cliente.query('DELETE FROM historico WHERE tipo_item = $1 AND item_id = ANY($2::int[])', [tipo, lista]);
  }
  const removidos = await cliente.query('DELETE FROM usuarios WHERE email LIKE $1', [`%${DOMINIO}`]);
  return { contas: removidos.rowCount, empresas: empresas.length };
}

// ---------- Criação ----------

async function criarContas(cliente) {
  const hash = await bcrypt.hash(SENHA_DEMO, 10);
  const contas = {};
  const todas = [...DONOS.map((d) => ({ ...d, dono: true })), ...CLIENTES];
  for (const [indice, pessoa] of todas.entries()) {
    const resultado = await cliente.query(
      `INSERT INTO usuarios (nome, email, senha_hash, foto_perfil_url, biografia, data_cadastro)
       VALUES ($1, $2, $3, $4, $5, NOW() - make_interval(days => $6)) RETURNING id_usuario`,
      [pessoa.nome, `${pessoa.chave}${DOMINIO}`, hash, pessoa.foto ? await urlDaFoto(pessoa.foto) : null, pessoa.bio ?? null, 40 + indice * 23]
    );
    const id = resultado.rows[0].id_usuario;
    contas[pessoa.chave] = id;
    await cliente.query(`INSERT INTO listas (usuario_id, nome) VALUES ($1, 'Favoritos'), ($1, 'Lugares salvos')`, [id]);
  }
  return contas;
}

async function criarEmpresa(cliente, empresa, indice, contas, categorias) {
  const rua = RUAS[empresa.rua];
  // Pequeno deslocamento para empresas na mesma região não ficarem no mesmo ponto
  const desvio = ((indice % 5) - 2) * 0.0004;
  const resultado = await cliente.query(
    `INSERT INTO empresas (id_usuario, nome_fantasia, ramo, tipo, descricao, telefone, site, foto_perfil_url,
                           status, status_verificacao, verificado_em, metodo_verificacao,
                           enviada_para_aprovacao_em, data_cadastro)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'aprovada', 'aprovado', NOW(), 'email',
             NOW() - make_interval(days => $9), NOW() - make_interval(days => $9))
     RETURNING id_empresa`,
    [contas[empresa.dono], empresa.nome, empresa.ramo, empresa.tipo, empresa.descricao, empresa.telefone, empresa.site,
      empresa.perfil ? await urlDaFoto(empresa.perfil) : null, 3 + indice * 9]
  );
  const id = resultado.rows[0].id_empresa;

  await cliente.query(
    `INSERT INTO enderecos (empresa_id, endereco, bairro, latitude, longitude) VALUES ($1, $2, $3, $4, $5)`,
    [id, `${rua.endereco}, ${empresa.numero}`, rua.bairro, rua.lat + desvio, rua.lng - desvio]
  );
  for (const nome of empresa.categorias) {
    if (categorias[nome]) await cliente.query('INSERT INTO empresa_categoria (empresa_id, categoria_id) VALUES ($1, $2)', [id, categorias[nome]]);
  }
  for (const [ordem, idFoto] of empresa.fotos.entries()) {
    await cliente.query('INSERT INTO fotos_empresa (empresa_id, url, ordem) VALUES ($1, $2, $3)', [id, await f(idFoto, 1000, 700), ordem]);
  }
  for (let dia = 0; dia <= 6; dia += 1) {
    const turno = empresa.horario.find(([d]) => d === dia);
    await cliente.query(
      'INSERT INTO horarios (empresa_id, dia_semana, abertura, fechamento, fechado) VALUES ($1, $2, $3, $4, $5)',
      [id, dia, turno?.[1] ?? null, turno?.[2] ?? null, !turno]
    );
  }

  // Produtos e serviços
  const itens = {};
  const lista = [
    ...(empresa.itens ?? []).map(([nome, preco, unidade, descricao, idFoto]) => ({ tipo: 'produto', nome, preco, unidade, descricao, idFoto, forma: 'preco' })),
    ...(empresa.servicos ?? []).map(([nome, preco, unidade, descricao, idFoto, forma]) => ({ tipo: 'servico', nome, preco, unidade, descricao, idFoto, forma })),
  ];
  for (const item of lista) {
    const produto = await cliente.query(
      `INSERT INTO produtos (empresa_id, tipo_item, nome, descricao, preco, unidade_medida, foto_url, forma_cobranca)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id_produto`,
      [id, item.tipo, item.nome, item.descricao, item.preco, item.unidade, await f(item.idFoto, 600, 600), item.forma]
    );
    itens[item.nome] = produto.rows[0].id_produto;
  }

  // Ofertas em vigor (horário de Brasília)
  const ofertas = [];
  for (const oferta of empresa.ofertas ?? []) {
    const relampago = oferta.tipo === 'relampago';
    const resultadoOferta = await cliente.query(
      `INSERT INTO promocoes (empresa_id, produto_id, tipo, titulo, condicao, desconto_percentual, data_inicio, data_fim, status)
       VALUES ($1, $2, $3, $4, $5, $6,
               (NOW() AT TIME ZONE '${FUSO}') - make_interval(hours => $7),
               (NOW() AT TIME ZONE '${FUSO}') + make_interval(hours => $8), 'ativa')
       RETURNING id_promocao`,
      [id, oferta.item ? itens[oferta.item] ?? null : null, oferta.tipo, oferta.titulo, oferta.condicao ?? null,
        oferta.desconto ?? null, relampago ? 2 : 24, relampago ? oferta.horas : oferta.dias * 24]
    );
    ofertas.push(resultadoOferta.rows[0].id_promocao);
  }
  return { id, ofertas };
}

async function criarAvaliacoes(cliente, empresas, contas) {
  for (const [indice, [nomeEmpresa, chave, nota, comentario, fotos]] of AVALIACOES.entries()) {
    const avaliacao = await cliente.query(
      `INSERT INTO avaliacoes (usuario_id, empresa_id, nota, comentario, criado_em)
       VALUES ($1, $2, $3, $4, NOW() - make_interval(days => $5)) RETURNING id_avaliacao`,
      [contas[chave], empresas[nomeEmpresa].id, nota, comentario, 2 + ((indice * 7) % 120)]
    );
    for (const [ordem, idFoto] of fotos.entries()) {
      await cliente.query('INSERT INTO fotos_avaliacao (avaliacao_id, url, ordem) VALUES ($1, $2, $3)',
        [avaliacao.rows[0].id_avaliacao, await f(idFoto, 900, 700), ordem]);
    }
  }
  await cliente.query(
    `UPDATE empresas e SET
       nota_media = COALESCE((SELECT AVG(nota) FROM avaliacoes a WHERE a.empresa_id = e.id_empresa), 0),
       total_avaliacoes = (SELECT COUNT(*) FROM avaliacoes a WHERE a.empresa_id = e.id_empresa)
     WHERE e.id_empresa = ANY($1::int[])`,
    [Object.values(empresas).map((e) => e.id)]
  );
}

// Anúncio já pago, no ar há alguns dias, com impressões e cliques
async function criarAnuncios(cliente, empresas) {
  for (const anuncio of ANUNCIOS) {
    const empresa = empresas[anuncio.empresa];
    const [largura, altura] = anuncio.formato === 'banner' ? [1200, 450] : [1000, 200];
    const valor = anuncio.porDia * DIAS_ANUNCIO;
    const criado = await cliente.query(
      `INSERT INTO anuncios (empresa_id, formato, imagem_url, promocao_id, link_externo, valor_investido, dias,
                             data_inicio, data_fim, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - make_interval(days => $8),
               NOW() - make_interval(days => $8) + make_interval(days => $7), 'ativo')
       RETURNING id_anuncio`,
      [empresa.id, anuncio.formato, await f(anuncio.imagem, largura, altura),
        anuncio.destino === 'oferta' ? empresa.ofertas[0] ?? null : null,
        anuncio.destino === 'link' ? 'https://instagram.com' : null,
        valor, DIAS_ANUNCIO, DIAS_PASSADOS_ANUNCIO]
    );
    const id = criado.rows[0].id_anuncio;
    await cliente.query(`INSERT INTO pagamentos (anuncio_id, valor, status, gateway_id) VALUES ($1, $2, 'aprovado', $3)`,
      [id, valor, `demo-${crypto.randomUUID()}`]);
    for (let dia = DIAS_PASSADOS_ANUNCIO; dia >= 0; dia -= 1) {
      const vistas = anuncio.porDia * (6 + Math.floor(Math.random() * 7));
      const toques = Math.round(vistas * ((3 + Math.floor(Math.random() * 6)) / 100));
      await cliente.query(
        `INSERT INTO eventos_anuncio (anuncio_id, tipo, criado_em)
         SELECT $1, t.tipo, GREATEST(a.data_inicio, LEAST(NOW(), dia.inicio + random() * INTERVAL '1 day'))
         FROM anuncios a,
              (SELECT date_trunc('day', NOW() AT TIME ZONE '${FUSO}') AT TIME ZONE '${FUSO}' - make_interval(days => $2) AS inicio) dia,
              (SELECT 'impressao' AS tipo FROM generate_series(1, $3) UNION ALL SELECT 'clique' FROM generate_series(1, $4)) t
         WHERE a.id_anuncio = $1`,
        [id, dia, vistas, toques]
      );
    }
  }
}

async function categoriasPorNome(cliente) {
  const resultado = await cliente.query('SELECT id_categoria, nome FROM categorias');
  return Object.fromEntries(resultado.rows.map((c) => [c.nome, c.id_categoria]));
}

async function main() {
  const somenteLimpar = process.argv.includes('--limpar');
  cloudinary = somenteLimpar || process.argv.includes('--sem-cloudinary') ? null : configuracaoCloudinary();

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const removido = await limpar(cliente);
    if (somenteLimpar) {
      await cliente.query('COMMIT');
      console.log(`✅ Demonstração removida: ${removido.contas} conta(s) e ${removido.empresas} empresa(s).`);
      return;
    }

    console.log(cloudinary ? '📷 Copiando as fotos para o Cloudinary (só na primeira vez demora)…' : '📷 Usando as fotos direto do Unsplash.');
    const categorias = await categoriasPorNome(cliente);
    const contas = await criarContas(cliente);
    const empresas = {};
    for (const [indice, empresa] of EMPRESAS.entries()) {
      empresas[empresa.nome] = await criarEmpresa(cliente, empresa, indice, contas, categorias);
      process.stdout.write('.');
    }
    console.log('');
    await criarAvaliacoes(cliente, empresas, contas);
    await criarAnuncios(cliente, empresas);
    await cliente.query('COMMIT');

    if (cloudinary) fs.writeFileSync(ARQUIVO_FOTOS, `${JSON.stringify(fotosGuardadas, null, 2)}\n`);
    console.log(`✅ ${EMPRESAS.length} empresas, ${AVALIACOES.length} avaliações e ${ANUNCIOS.length} anúncios de demonstração criados.`);
    if (removido.contas) console.log(`   (a demonstração anterior foi substituída)`);
    if (envios) console.log(`   ${envios} foto(s) copiada(s) para o Cloudinary.`);
    console.log(`   Contas de dono para entrar no app (senha ${SENHA_DEMO}): ${DONOS.map((d) => `${d.chave}${DOMINIO}`).join(', ')}`);
  } catch (erro) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error('❌ Erro:', erro.message);
    process.exitCode = 1;
  } finally {
    cliente.release();
    await pool.end();
  }
}

if (require.main === module) main();

module.exports = { main, limpar };
