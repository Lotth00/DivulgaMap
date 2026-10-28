const { Pool } = require('pg');
require('dotenv').config();

// Com DATABASE_URL (Neon, no .env local e no Render): conecta pela URL completa.
// O Neon exige SSL. Sem DATABASE_URL: usa as variáveis separadas, para um Postgres local.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

module.exports = pool;
