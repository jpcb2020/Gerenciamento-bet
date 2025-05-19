const { pool } = require('../config/database');

// Obter todas as casas de apostas
const getAllCasas = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM casas_apostas ORDER BY saldo DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obter uma casa de apostas específica
const getCasaById = async (req, res) => {
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
};

// Adicionar uma nova casa de apostas
const createCasa = async (req, res) => {
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
};

// Atualizar uma casa de apostas
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
};

// Deletar uma casa de apostas
const deleteCasa = async (req, res) => {
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
};

// Obter transações para uma casa específica
const getCasaTransacoes = async (req, res) => {
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
};

module.exports = {
  getAllCasas,
  getCasaById,
  createCasa,
  updateCasa,
  deleteCasa,
  getCasaTransacoes
}; 