// This file will contain controller logic for 'casas' routes. 

const { pool } = require('../config/db');

// Get all betting houses
const getAllCasas = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM casas_apostas WHERE user_id = $1 ORDER BY saldo DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a specific betting house
const getCasaById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM casas_apostas WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Casa de apostas não encontrada' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add a new betting house
const addCasa = async (req, res) => {
  const { nome, logo, saldo = 0 } = req.body;
  
  if (!nome) {
    res.status(400).json({ error: 'O nome da casa de apostas é obrigatório' });
    return;
  }
  
  try {
    const result = await pool.query(
      'INSERT INTO casas_apostas (nome, logo, saldo, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, logo, saldo, req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a betting house
const updateCasa = async (req, res) => {
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
  values.push(req.user.id);
  
  try {
    const result = await pool.query(
      `UPDATE casas_apostas SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
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
};

// Delete a betting house
const deleteCasa = async (req, res) => {
  const casaId = req.params.id;
  
  try {
    // Iniciar transaction para garantir integridade dos dados
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Atualizar as transações relacionadas para preservar o histórico
      // Definir casa_id como NULL nas transações da casa excluída
      await client.query('UPDATE transacoes SET casa_id = NULL WHERE casa_id = $1 AND user_id = $2', [casaId, req.user.id]);
      
      // Agora remover a casa de apostas
      const result = await client.query('DELETE FROM casas_apostas WHERE id = $1 AND user_id = $2', [casaId, req.user.id]);
      
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
};

module.exports = {
  getAllCasas,
  getCasaById,
  addCasa,
  updateCasa,
  deleteCasa
};