const { Pool } = require('pg');
require('dotenv').config();

// Conexão com o banco: pela DATABASE_URL (Neon, com SSL) ou pelas variáveis DB_* (Postgres local)
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
