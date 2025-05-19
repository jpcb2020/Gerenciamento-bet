require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '.')));

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

initDb();

// API Endpoints

// Get all betting houses
app.get('/api/casas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM casas_apostas ORDER BY saldo DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a specific betting house
app.get('/api/casas/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM casas_apostas WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Casa de apostas não encontrada' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new betting house
app.post('/api/casas', async (req, res) => {
  const { nome, logo, saldo = 0 } = req.body;
  
  if (!nome) {
    res.status(400).json({ error: 'O nome da casa de apostas é obrigatório' });
    return;
  }
  
  try {
    const result = await pool.query(
      'INSERT INTO casas_apostas (nome, logo, saldo) VALUES ($1, $2, $3) RETURNING *',
      [nome, logo, saldo]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a betting house
app.put('/api/casas/:id', async (req, res) => {
  const { nome, logo, saldo } = req.body;
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  if (nome) { 
    updates.push(`nome = $${paramIndex}`); 
    values.push(nome);
    paramIndex++;
  }
  
  if (logo) { 
    updates.push(`logo = $${paramIndex}`); 
    values.push(logo);
    paramIndex++;
  }
  
  if (saldo !== undefined) { 
    updates.push(`saldo = $${paramIndex}`); 
    values.push(saldo);
    paramIndex++;
  }
  
  if (updates.length === 0) {
    res.status(400).json({ error: 'Nenhum campo para atualizar' });
    return;
  }
  
  values.push(req.params.id);
  
  try {
    const result = await pool.query(
      `UPDATE casas_apostas SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Casa de apostas não encontrada' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a betting house
app.delete('/api/casas/:id', async (req, res) => {
  const casaId = req.params.id;
  
  try {
    // Iniciar transaction para garantir integridade dos dados
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Atualizar as transações relacionadas para preservar o histórico
      // Definir casa_id como NULL nas transações da casa excluída
      await client.query('UPDATE transacoes SET casa_id = NULL WHERE casa_id = $1', [casaId]);
      
      // Agora remover a casa de apostas
      const result = await client.query('DELETE FROM casas_apostas WHERE id = $1', [casaId]);
      
      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Casa de apostas não encontrada' });
        return;
      }
      
      // Confirmar todas as alterações
      await client.query('COMMIT');
      res.json({ message: 'Casa de apostas removida com sucesso. Histórico de transações preservado.' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all transactions
app.get('/api/transacoes', async (req, res) => {
  try {
    const query = `
      SELECT t.*, 
             COALESCE(c.nome, 'Casa Excluída') as casa_nome, 
             COALESCE(c.logo, 'https://via.placeholder.com/30?text=Excluida') as casa_logo 
      FROM transacoes t
      LEFT JOIN casas_apostas c ON t.casa_id = c.id
      ORDER BY t.data DESC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get transactions for a specific betting house
app.get('/api/casas/:id/transacoes', async (req, res) => {
  try {
    const query = `
      SELECT t.*, 
             COALESCE(c.nome, 'Casa Excluída') as casa_nome, 
             COALESCE(c.logo, 'https://via.placeholder.com/30?text=Excluida') as casa_logo 
      FROM transacoes t
      LEFT JOIN casas_apostas c ON t.casa_id = c.id
      WHERE t.casa_id = $1
      ORDER BY t.data DESC
    `;
    
    const result = await pool.query(query, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new transaction
app.post('/api/transacoes', async (req, res) => {
  const { casa_id, tipo, valor, descricao, status = 'completo' } = req.body;
  
  if (!casa_id || !tipo || valor === undefined) {
    res.status(400).json({ error: 'Casa, tipo e valor são obrigatórios' });
    return;
  }
  
  if (!['deposito', 'saque', 'aposta', 'ganho'].includes(tipo)) {
    res.status(400).json({ error: 'Tipo inválido. Deve ser: deposito, saque, aposta ou ganho' });
    return;
  }
  
  try {
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert the transaction
      const transactionResult = await client.query(
        'INSERT INTO transacoes (casa_id, tipo, valor, descricao, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [casa_id, tipo, valor, descricao, status]
      );
      
      const transacaoId = transactionResult.rows[0].id;
      
      // Update the balance of the betting house
      let saldoAdjustment = 0;
      if (tipo === 'deposito' || tipo === 'ganho') {
        saldoAdjustment = valor;
      } else if (tipo === 'saque' || tipo === 'aposta') {
        saldoAdjustment = -valor;
      }
      
      await client.query(
        'UPDATE casas_apostas SET saldo = saldo + $1 WHERE id = $2',
        [saldoAdjustment, casa_id]
      );
      
      await client.query('COMMIT');
      
      // Return the new transaction with betting house info
      const query = `
        SELECT t.*, 
          COALESCE(c.nome, 'Casa Excluída') as casa_nome, 
          COALESCE(c.logo, 'https://via.placeholder.com/30?text=Excluida') as casa_logo 
        FROM transacoes t
        LEFT JOIN casas_apostas c ON t.casa_id = c.id
        WHERE t.id = $1
      `;
      
      const result = await pool.query(query, [transacaoId]);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a transaction
app.delete('/api/transacoes/:id', async (req, res) => {
  const transacaoId = req.params.id;
  
  try {
    // Iniciar transação para garantir integridade dos dados
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Primeiro, vamos obter a informação da transação para ajustar o saldo
      const transacaoResult = await client.query(
        'SELECT casa_id, tipo, valor FROM transacoes WHERE id = $1',
        [transacaoId]
      );
      
      if (transacaoResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Transação não encontrada' });
        return;
      }
      
      const transacao = transacaoResult.rows[0];
      
      // Se a transação estiver associada a uma casa ativa, revertemos seu efeito no saldo
      if (transacao.casa_id) {
        // Calculamos o ajuste inverso ao efeito original da transação
        let saldoAdjustment = 0;
        if (transacao.tipo === 'deposito' || transacao.tipo === 'ganho') {
          saldoAdjustment = -transacao.valor; // negativo porque estamos revertendo
        } else if (transacao.tipo === 'saque' || transacao.tipo === 'aposta') {
          saldoAdjustment = transacao.valor; // positivo porque estamos revertendo
        }
        
        // Verificar se a casa ainda existe
        const casaResult = await client.query(
          'SELECT id FROM casas_apostas WHERE id = $1',
          [transacao.casa_id]
        );
        
        if (casaResult.rows.length > 0) {
          // Atualizar o saldo da casa, somente se a casa ainda existir
          await client.query(
            'UPDATE casas_apostas SET saldo = saldo + $1 WHERE id = $2',
            [saldoAdjustment, transacao.casa_id]
          );
        }
      }
      
      // Agora podemos excluir a transação
      const deleteResult = await client.query(
        'DELETE FROM transacoes WHERE id = $1',
        [transacaoId]
      );
      
      if (deleteResult.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Transação não encontrada' });
        return;
      }
      
      // Confirmar todas as alterações
      await client.query('COMMIT');
      res.json({ message: 'Transação excluída com sucesso' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get dashboard summary
app.get('/api/dashboard', async (req, res) => {
  try {
    const result = {};
    
    // Get total balance
    const saldoResult = await pool.query('SELECT SUM(saldo) as saldo_total FROM casas_apostas');
    result.saldo_total = saldoResult.rows[0].saldo_total || 0;
    
    // Get active betting houses count
    const casasResult = await pool.query('SELECT COUNT(*) as casas_count FROM casas_apostas');
    result.casas_count = casasResult.rows[0].casas_count || 0;
    
    // Get highest balance betting house
    const maiorSaldoResult = await pool.query('SELECT nome, saldo FROM casas_apostas ORDER BY saldo DESC LIMIT 1');
    result.maior_saldo = maiorSaldoResult.rows[0] || { nome: 'N/A', saldo: 0 };
    
    // Get month performance
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const dateStr = oneMonthAgo.toISOString().split('T')[0];
    
    const rendimentoResult = await pool.query(`
      SELECT 
        (SELECT COALESCE(SUM(CASE WHEN tipo IN ('deposito', 'ganho') THEN valor ELSE 0 END), 0) 
         FROM transacoes 
         WHERE data >= $1) as entradas,
        (SELECT COALESCE(SUM(CASE WHEN tipo IN ('saque', 'aposta') THEN valor ELSE 0 END), 0) 
         FROM transacoes 
         WHERE data >= $1) as saidas
    `, [dateStr]);
    
    const entradas = rendimentoResult.rows[0].entradas || 0;
    const saidas = rendimentoResult.rows[0].saidas || 0;
    
    // Calculate performance
    let rendimento = 0;
    if (saidas > 0) {
      rendimento = ((entradas - saidas) / saidas) * 100;
    }
    
    result.rendimento = parseFloat(rendimento.toFixed(2));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle shutdown
process.on('SIGINT', () => {
  pool.end();
  console.log('Database connection closed.');
  process.exit(0);
});


