const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET all notas/lembretes
router.get('/', async (req, res) => {
  try {
    const { tipo, prioridade, concluido } = req.query;
    let query = 'SELECT * FROM notas WHERE user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    // Filtros opcionais
    if (tipo) {
      query += ` AND tipo = $${paramIndex}`;
      params.push(tipo);
      paramIndex++;
    }

    if (prioridade) {
      query += ` AND prioridade = $${paramIndex}`;
      params.push(prioridade);
      paramIndex++;
    }

    if (concluido !== undefined) {
      query += ` AND concluido = $${paramIndex}`;
      params.push(concluido === 'true');
      paramIndex++;
    }

    query += ' ORDER BY data_criacao DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar notas:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET nota específica
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notas WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nota não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar nota:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST nova nota/lembrete
router.post('/', async (req, res) => {
  const { titulo, conteudo, tipo, prioridade, data_lembrete, cor } = req.body;
  
  if (!titulo || !conteudo || !tipo) {
    return res.status(400).json({ error: 'Título, conteúdo e tipo são obrigatórios' });
  }

  if (!['nota', 'lembrete'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo deve ser "nota" ou "lembrete"' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO notas (titulo, conteudo, tipo, prioridade, data_lembrete, cor, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [titulo, conteudo, tipo, prioridade || 'media', data_lembrete || null, cor || '#6c5ce7', req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar nota:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT atualizar nota/lembrete
router.put('/:id', async (req, res) => {
  const { titulo, conteudo, tipo, prioridade, data_lembrete, cor, concluido } = req.body;
  
  if (!titulo || !conteudo || !tipo) {
    return res.status(400).json({ error: 'Título, conteúdo e tipo são obrigatórios' });
  }

  try {
    const result = await pool.query(
      `UPDATE notas SET titulo = $1, conteudo = $2, tipo = $3, prioridade = $4, 
       data_lembrete = $5, cor = $6, concluido = $7 
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [titulo, conteudo, tipo, prioridade, data_lembrete, cor, concluido || false, req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nota não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar nota:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH marcar como concluído/não concluído
router.patch('/:id/concluir', async (req, res) => {
  const { concluido } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE notas SET concluido = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [concluido, req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nota não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE nota/lembrete
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM notas WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nota não encontrada' });
    }
    
    res.json({ message: 'Nota excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir nota:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 