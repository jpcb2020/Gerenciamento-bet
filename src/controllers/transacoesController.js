// This file will contain controller logic for 'transacoes' routes. 

const { pool } = require('../config/db');

// Get all transactions
const getAllTransacoes = async (req, res) => {
  console.log('getAllTransacoes called. req.query:', req.query); // Log query params
  try {
    let query = `
      SELECT t.*, 
             COALESCE(c.nome, 'Casa Excluída') as casa_nome, 
             COALESCE(c.logo, '/images/bet-default-icon.png') as casa_logo 
      FROM transacoes t
      LEFT JOIN casas_apostas c ON t.casa_id = c.id
      ORDER BY t.data DESC
    `;
    
    const params = [];
    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      console.log('Parsed limit:', limit); // Log parsed limit
      if (!isNaN(limit) && limit > 0) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }
    }
    
    console.log('Executing query:', query, 'with params:', params); // Log final query and params
    const result = await pool.query(query, params);
    console.log('Query result row_count:', result.rows.length); // Log how many rows returned
    res.json(result.rows);
  } catch (err) {
    console.error('Error in getAllTransacoes:', err); // Log error
    res.status(500).json({ error: err.message });
  }
};

// Get transactions for a specific betting house
const getTransacoesByCasaId = async (req, res) => {
  try {
    const query = `
      SELECT t.*, 
             COALESCE(c.nome, 'Casa Excluída') as casa_nome, 
             COALESCE(c.logo, '/images/bet-default-icon.png') as casa_logo 
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

// Add a new transaction
const addTransacao = async (req, res) => {
  const { casa_id, tipo, valor, descricao, status = 'completo' } = req.body;
  
  if (!casa_id || !tipo || valor === undefined) {
    res.status(400).json({ error: 'Casa, tipo e valor são obrigatórios' });
    return;
  }
  
  if (!['deposito', 'saque', 'aposta', 'ganho', 'correcao'].includes(tipo)) {
    res.status(400).json({ error: 'Tipo inválido. Deve ser: deposito, saque, aposta, ganho ou correcao' });
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
      } else if (tipo === 'correcao') {
        saldoAdjustment = valor;
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
          COALESCE(c.logo, '/images/bet-default-icon.png') as casa_logo 
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
};

// Update an existing transaction
const updateTransacao = async (req, res) => {
  const transacaoId = req.params.id;
  const { casa_id, tipo, valor, descricao, data, status = 'completo' } = req.body;
  
  if (!casa_id || !tipo || valor === undefined) {
    res.status(400).json({ error: 'Casa, tipo e valor são obrigatórios' });
    return;
  }
  
  if (!['deposito', 'saque', 'aposta', 'ganho', 'correcao'].includes(tipo)) {
    res.status(400).json({ error: 'Tipo inválido. Deve ser: deposito, saque, aposta, ganho ou correcao' });
    return;
  }
  
  try {
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // First, get the original transaction details to calculate balance adjustment
      const oldTransactionResult = await client.query(
        'SELECT casa_id, tipo, valor FROM transacoes WHERE id = $1',
        [transacaoId]
      );
      
      if (oldTransactionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Transação não encontrada' });
        return;
      }
      
      const oldTransaction = oldTransactionResult.rows[0];
      
      // Reverse the effect of the old transaction
      let oldSaldoAdjustment = 0;
      if (oldTransaction.tipo === 'deposito' || oldTransaction.tipo === 'ganho') {
        oldSaldoAdjustment = -oldTransaction.valor; // Reverse by negating
      } else if (oldTransaction.tipo === 'saque' || oldTransaction.tipo === 'aposta') {
        oldSaldoAdjustment = oldTransaction.valor; // Reverse by adding back
      } else if (oldTransaction.tipo === 'correcao') {
        oldSaldoAdjustment = -oldTransaction.valor; // Reverse correction
      }
      
      // Calculate effect of the new transaction
      let newSaldoAdjustment = 0;
      if (tipo === 'deposito' || tipo === 'ganho') {
        newSaldoAdjustment = valor;
      } else if (tipo === 'saque' || tipo === 'aposta') {
        newSaldoAdjustment = -valor;
      } else if (tipo === 'correcao') {
        newSaldoAdjustment = valor;
      }
      
      // Update the transaction
      const updateFields = [];
      const updateValues = [];
      let paramCounter = 1;
      
      if (casa_id !== undefined) {
        updateFields.push(`casa_id = $${paramCounter++}`);
        updateValues.push(casa_id);
      }
      
      if (tipo !== undefined) {
        updateFields.push(`tipo = $${paramCounter++}`);
        updateValues.push(tipo);
      }
      
      if (valor !== undefined) {
        updateFields.push(`valor = $${paramCounter++}`);
        updateValues.push(valor);
      }
      
      if (descricao !== undefined) {
        updateFields.push(`descricao = $${paramCounter++}`);
        updateValues.push(descricao);
      }
      
      if (data !== undefined) {
        updateFields.push(`data = $${paramCounter++}`);
        updateValues.push(data);
      }
      
      if (status !== undefined) {
        updateFields.push(`status = $${paramCounter++}`);
        updateValues.push(status);
      }
      
      updateValues.push(transacaoId); // Add transaction ID as the last parameter
      
      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Nenhum campo fornecido para atualização' });
        return;
      }
      
      const updateQuery = `
        UPDATE transacoes 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, updateValues);
      
      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Transação não encontrada' });
        return;
      }
      
      // Update balances if casa_id has changed
      if (oldTransaction.casa_id !== casa_id) {
        // Adjust old casa balance (if it still exists)
        const oldCasaExists = await client.query(
          'SELECT id FROM casas_apostas WHERE id = $1',
          [oldTransaction.casa_id]
        );
        
        if (oldCasaExists.rows.length > 0) {
          await client.query(
            'UPDATE casas_apostas SET saldo = saldo + $1 WHERE id = $2',
            [oldSaldoAdjustment, oldTransaction.casa_id]
          );
        }
        
        // Apply new transaction to new casa
        await client.query(
          'UPDATE casas_apostas SET saldo = saldo + $1 WHERE id = $2',
          [newSaldoAdjustment, casa_id]
        );
      } else {
        // Same casa, just apply the net adjustment
        const netAdjustment = oldSaldoAdjustment + newSaldoAdjustment;
        
        await client.query(
          'UPDATE casas_apostas SET saldo = saldo + $1 WHERE id = $2',
          [netAdjustment, casa_id]
        );
      }
      
      await client.query('COMMIT');
      
      // Return the updated transaction with betting house info
      const query = `
        SELECT t.*, 
          COALESCE(c.nome, 'Casa Excluída') as casa_nome, 
          COALESCE(c.logo, '/images/bet-default-icon.png') as casa_logo 
        FROM transacoes t
        LEFT JOIN casas_apostas c ON t.casa_id = c.id
        WHERE t.id = $1
      `;
      
      const result = await pool.query(query, [transacaoId]);
      res.json(result.rows[0]);
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

// Delete a transaction
const deleteTransacao = async (req, res) => {
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
        } else if (transacao.tipo === 'correcao') {
          saldoAdjustment = -transacao.valor; // reverter correção
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
};

module.exports = {
  getAllTransacoes,
  getTransacoesByCasaId,
  addTransacao,
  deleteTransacao,
  updateTransacao
}; 