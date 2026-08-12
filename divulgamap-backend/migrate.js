// Script único, só para rodar o schema.sql no banco do Render.
// Uso: node migrate.js
// Depois de usar, pode apagar este arquivo (ou deixar, não tem problema).

const fs = require('fs');
const { Pool } = require('pg');

// Cole aqui a "External Database URL" copiada do painel do Render
// (Render > seu banco Postgres > Connections > External Database URL)
const CONNECTION_STRING = 'COLE_AQUI_A_EXTERNAL_URL';

const pool = new Pool({
  connectionString: CONNECTION_STRING,
  ssl: { rejectUnauthorized: false }, // o Postgres do Render exige SSL
});

const sql = fs.readFileSync('./schema.sql', 'utf8');

pool
  .query(sql)
  .then(() => {
    console.log('✅ Schema criado com sucesso no banco do Render!');
    return pool.end();
  })
  .catch((erro) => {
    console.error('❌ Erro ao rodar o schema:', erro.message);
    pool.end();
  });
