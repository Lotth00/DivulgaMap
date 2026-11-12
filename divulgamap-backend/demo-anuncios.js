// Anúncios de demonstração (banners e faixas) com métricas, no banco da DATABASE_URL
// node demo-anuncios.js [--dias N]  → cria (apagando os de demonstração anteriores)
// node demo-anuncios.js --limpar    → apaga só os de demonstração

require('dotenv').config({ quiet: true });
const crypto = require('crypto');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no .env.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const FUSO_HORARIO = 'America/Sao_Paulo';
const MARCA = 'demo-';
const DIAS_PASSADOS = 2;
const LINK_EXEMPLO = 'https://pt.wikipedia.org/wiki/Taquara_(Rio_Grande_do_Sul)';

// Valores diferentes para o ranking aparecer (peso = valor ÷ dias)
const BANNERS = [{ porDia: 20 }, { porDia: 10 }, { porDia: 6 }, { porDia: 2 }];
const FAIXAS = [{ porDia: 8, destino: 'link' }, { porDia: 5, destino: 'oferta' }, { porDia: 3, destino: 'empresa' }];

function sorteio(minimo, maximo) {
  return Math.floor(minimo + Math.random() * (maximo - minimo + 1));
}

// Remove os anúncios de demonstração (pagamentos e eventos saem junto)
async function limpar(cliente) {
  const resultado = await cliente.query(
    `DELETE FROM anuncios a
     USING pagamentos p
     WHERE p.anuncio_id = a.id_anuncio AND p.gateway_id LIKE $1
     RETURNING a.id_anuncio`,
    [`${MARCA}%`]
  );
  return resultado.rowCount;
}

// Empresas aprovadas, com foto (para a imagem) e uma oferta em vigor, se houver
async function empresasAprovadas(cliente) {
  const resultado = await cliente.query(
    `SELECT e.id_empresa, e.nome_fantasia,
            COALESCE((SELECT f.url FROM fotos_empresa f WHERE f.empresa_id = e.id_empresa
                      ORDER BY f.ordem, f.id_foto LIMIT 1), e.foto_perfil_url) AS foto,
            (SELECT pr.id_promocao FROM promocoes pr
             WHERE pr.empresa_id = e.id_empresa AND pr.status <> 'expirada'
               AND pr.data_inicio <= (NOW() AT TIME ZONE '${FUSO_HORARIO}')
               AND pr.data_fim >= (NOW() AT TIME ZONE '${FUSO_HORARIO}')
             ORDER BY pr.data_fim DESC LIMIT 1) AS oferta
     FROM empresas e
     WHERE e.status = 'aprovada'
     ORDER BY e.id_empresa`
  );
  return resultado.rows;
}

// Anúncio já pago e no ar desde DIAS_PASSADOS atrás, com impressões e cliques nesses dias
async function criarAnuncio(cliente, { empresa, formato, porDia, dias, imagem, promocaoId, link }) {
  const valor = porDia * dias;
  const anuncio = await cliente.query(
    `INSERT INTO anuncios (empresa_id, formato, imagem_url, promocao_id, link_externo, valor_investido, dias,
                           data_inicio, data_fim, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7,
             NOW() - make_interval(days => $8), NOW() - make_interval(days => $8) + make_interval(days => $7), 'ativo')
     RETURNING id_anuncio`,
    [empresa.id_empresa, formato, imagem, promocaoId, link, valor, dias, DIAS_PASSADOS]
  );
  const id = anuncio.rows[0].id_anuncio;

  await cliente.query(
    `INSERT INTO pagamentos (anuncio_id, valor, status, gateway_id) VALUES ($1, $2, 'aprovado', $3)`,
    [id, valor, `${MARCA}${crypto.randomUUID()}`]
  );

  // Mais valor por dia, mais impressões; cliques entre 3% e 8%
  let impressoes = 0;
  let cliques = 0;
  for (let dia = DIAS_PASSADOS; dia >= 0; dia--) {
    const vistas = sorteio(porDia * 6, porDia * 12);
    const toques = Math.round(vistas * (sorteio(3, 8) / 100));
    impressoes += vistas;
    cliques += toques;
    await cliente.query(
      `INSERT INTO eventos_anuncio (anuncio_id, tipo, criado_em)
       SELECT $1, t.tipo, GREATEST(a.data_inicio, LEAST(NOW(), dia.inicio + random() * INTERVAL '1 day'))
       FROM anuncios a,
            (SELECT date_trunc('day', NOW() AT TIME ZONE '${FUSO_HORARIO}') AT TIME ZONE '${FUSO_HORARIO}'
                    - make_interval(days => $2) AS inicio) dia,
            (SELECT 'impressao' AS tipo FROM generate_series(1, $3)
             UNION ALL SELECT 'clique' FROM generate_series(1, $4)) t
       WHERE a.id_anuncio = $1`,
      [id, dia, vistas, toques]
    );
  }
  return { id, valor, impressoes, cliques };
}

async function criar(cliente, dias) {
  const empresas = await empresasAprovadas(cliente);
  if (!empresas.length) {
    throw new Error('Nenhuma empresa aprovada no banco. Aprove uma empresa antes.');
  }
  const daVez = (indice) => empresas[indice % empresas.length];
  const criados = [];

  for (const [indice, banner] of BANNERS.entries()) {
    const empresa = daVez(indice);
    const imagem = empresa.foto || `https://picsum.photos/seed/divulgamap-banner-${indice + 1}/800/300`;
    criados.push({ formato: 'banner', empresa, destino: 'empresa', ...await criarAnuncio(cliente, { empresa, formato: 'banner', porDia: banner.porDia, dias, imagem }) });
  }

  for (const [indice, faixa] of FAIXAS.entries()) {
    let empresa = daVez(indice);
    let destino = faixa.destino;
    if (destino === 'oferta') {
      const comOferta = empresas.find((e) => e.oferta);
      if (comOferta) empresa = comOferta;
      else destino = 'empresa';
    }
    const imagem = `https://picsum.photos/seed/divulgamap-faixa-${indice + 1}/1000/160`;
    criados.push({
      formato: 'faixa', empresa, destino,
      ...await criarAnuncio(cliente, {
        empresa, formato: 'faixa', porDia: faixa.porDia, dias, imagem,
        promocaoId: destino === 'oferta' ? empresa.oferta : null,
        link: destino === 'link' ? LINK_EXEMPLO : null,
      }),
    });
  }
  return criados;
}

async function main() {
  const somenteLimpar = process.argv.includes('--limpar');
  const posicaoDias = process.argv.indexOf('--dias');
  const dias = posicaoDias > -1 ? Number(process.argv[posicaoDias + 1]) : 5;
  if (!somenteLimpar && (!Number.isInteger(dias) || dias <= DIAS_PASSADOS || dias > 30)) {
    console.error(`❌ --dias precisa ser um número inteiro de ${DIAS_PASSADOS + 1} a 30.`);
    process.exitCode = 1;
    return;
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const removidos = await limpar(cliente);
    if (somenteLimpar) {
      await cliente.query('COMMIT');
      console.log(`✅ ${removidos} anúncio(s) de demonstração removido(s).`);
      return;
    }
    const criados = await criar(cliente, dias);
    await cliente.query('COMMIT');

    if (removidos) console.log(`(${removidos} anúncio(s) de demonstração antigos removidos)`);
    console.log(`✅ ${criados.length} anúncios de demonstração no ar por mais ${dias - DIAS_PASSADOS} dia(s):`);
    for (const a of criados) {
      console.log(`   #${a.id} ${a.formato.padEnd(6)} R$ ${String(a.valor).padStart(3)} · ${a.empresa.nome_fantasia} → ${a.destino} · ${a.impressoes} impressões, ${a.cliques} cliques`);
    }
  } catch (erro) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error('❌ Erro:', erro.message);
    process.exitCode = 1;
  } finally {
    cliente.release();
    await pool.end();
  }
}

main();
