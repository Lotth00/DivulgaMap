// Criação das tabelas (schema.sql) e dos dados iniciais (seed.sql, com --seed) no banco da DATABASE_URL

require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no .env.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Remoção dos trechos do pg_dump incompatíveis com o Neon:
// comandos do psql (\restrict), donos de tabela (OWNER TO) e transaction_timeout
function limparDump(sql) {
  return sql
    .split('\n')
    .filter((linha) => !linha.startsWith('\\'))
    .filter((linha) => !/^\s*SET transaction_timeout/.test(linha))
    .join('\n')
    .replace(/^ALTER (TABLE|SEQUENCE) [^;]+ OWNER TO [^;]+;\s*$/gm, '');
}

const FIM_DO_DUMP = 'PostgreSQL database dump complete';

async function criarSchema() {
  const sql = limparDump(fs.readFileSync('./schema.sql', 'utf8'));
  const existe = await pool.query(`SELECT to_regclass('public.usuarios') AS tabela`);

  // Banco existente: só as alterações acrescentadas depois do dump
  if (existe.rows[0].tabela) {
    const inicioDasAlteracoes = sql.indexOf(FIM_DO_DUMP);
    await pool.query(sql.slice(inicioDasAlteracoes + FIM_DO_DUMP.length));
    console.log('✅ Tabelas já existiam; alterações novas aplicadas.');
    return;
  }

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
