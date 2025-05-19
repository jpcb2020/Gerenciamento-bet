require('dotenv').config();
const { Pool } = require('pg');

// Initialize PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gerenciamento_bet',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Test database connection and create tables if needed
const initDb = async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to the PostgreSQL database.');
    
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS casas_apostas (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        logo TEXT,
        saldo REAL DEFAULT 0,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS transacoes (
        id SERIAL PRIMARY KEY,
        casa_id INTEGER,
        tipo TEXT CHECK(tipo IN ('deposito', 'saque', 'aposta', 'ganho', 'ajuste')) NOT NULL,
        valor REAL NOT NULL,
        descricao TEXT,
        status TEXT DEFAULT 'completo',
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (casa_id) REFERENCES casas_apostas (id)
      )
    `);
    
    console.log('Tabelas verificadas/criadas com sucesso.');
    client.release();
  } catch (err) {
    console.error('Error initializing database', err);
    process.exit(1);
  }
};

module.exports = { pool, initDb }; 