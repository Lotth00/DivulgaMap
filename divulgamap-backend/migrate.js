// Cria as tabelas do schema.sql no banco da DATABASE_URL (Neon).
// Uso:
//   node migrate.js          -> cria as tabelas (só se o banco estiver vazio)
//   node migrate.js --seed   -> insere os dados iniciais do seed.sql (pode rodar quantas vezes quiser)

require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no .env.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // o Neon exige SSL
});

// O schema.sql veio de um pg_dump, que traz coisas que só funcionam no seu Postgres local:
// - linhas "\restrict" / "\unrestrict" são comandos do psql, não SQL;
// - "OWNER TO postgres" falha no Neon, porque lá o usuário não se chama postgres;
// - "SET transaction_timeout" só existe a partir do Postgres 17.
// Limpamos isso aqui, sem alterar o arquivo original.
function limparDump(sql) {
  return sql
    .split('\n')
    .filter((linha) => !linha.startsWith('\\'))
    .filter((linha) => !/^\s*SET transaction_timeout/.test(linha))
    .join('\n')
    .replace(/^ALTER (TABLE|SEQUENCE) [^;]+ OWNER TO [^;]+;\s*$/gm, '');
}

async function criarSchema() {
  const existe = await pool.query(`SELECT to_regclass('public.usuarios') AS tabela`);
  if (existe.rows[0].tabela) {
    console.log('ℹ️  As tabelas já existem neste banco. Nada foi alterado.');
    return;
  }

  const sql = limparDump(fs.readFileSync('./schema.sql', 'utf8'));
  await pool.query(sql);
  console.log('✅ Schema criado com sucesso!');
}

async function aplicarSeed() {
  const sql = fs.readFileSync('./seed.sql', 'utf8');
  await pool.query(sql);
  console.log('✅ Seed aplicado!');
}

async function main() {
  try {
    if (process.argv.includes('--seed')) {
      await aplicarSeed();
    } else {
      await criarSchema();
    }
  } catch (erro) {
    console.error('❌ Erro:', erro.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
