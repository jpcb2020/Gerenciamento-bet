const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET all bankrolls
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, categoria, saldo_atual FROM bankrolls ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro na rota GET /api/bankrolls:', err.message);
    res.status(500).send('Server error');
  }
});

// GET a specific bankroll by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM bankrolls WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Bankroll não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Erro na rota GET /api/bankrolls/${id}:`, err.message);
    res.status(500).send('Server error');
  }
});

// POST a new bankroll
router.post('/', async (req, res) => {
  const { nome, saldo_inicial, categoria } = req.body;
  const { casa_apostas = null, descricao = null, moeda = 'BRL', publico = false } = req.body;

  if (!nome || saldo_inicial === undefined || !categoria) {
    return res.status(400).json({ msg: 'Por favor, inclua nome, saldo inicial e categoria' });
  }
  try {
    const newBankroll = await pool.query(
      'INSERT INTO bankrolls (nome, saldo_inicial, categoria, saldo_atual, casa_apostas, descricao, moeda, publico) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [nome, parseFloat(saldo_inicial), categoria, parseFloat(saldo_inicial), casa_apostas, descricao, moeda, publico]
    );
    res.json(newBankroll.rows[0]);
  } catch (err) {
    console.error('Erro na rota POST /api/bankrolls:', err.message);
    res.status(500).send('Server error');
  }
});

// PUT update a bankroll
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, saldo_inicial, categoria } = req.body;
  const { casa_apostas, descricao, moeda, publico } = req.body;

  if (!nome || saldo_inicial === undefined || !categoria) {
    return res.status(400).json({ msg: 'Por favor, inclua nome, saldo inicial e categoria' });
  }

  try {
    const updatedBankroll = await pool.query(
      'UPDATE bankrolls SET nome = $1, saldo_inicial = $2, categoria = $3, saldo_atual = $4, casa_apostas = $5, descricao = $6, moeda = $7, publico = $8 WHERE id = $9 RETURNING *',
      [nome, parseFloat(saldo_inicial), categoria, parseFloat(saldo_inicial), casa_apostas, descricao, moeda, publico, id]
    );
    if (updatedBankroll.rows.length === 0) {
      return res.status(404).json({ msg: 'Bankroll não encontrado' });
    }
    res.json(updatedBankroll.rows[0]);
  } catch (err) {
    console.error('Erro na rota PUT /api/bankrolls/:id:', err.message);
    res.status(500).send('Server error');
  }
});

// DELETE a bankroll
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleteOp = await pool.query('DELETE FROM bankrolls WHERE id = $1 RETURNING *', [id]);
    if (deleteOp.rows.length === 0) {
      return res.status(404).json({ msg: 'Bankroll não encontrado' });
    }
    res.json({ msg: 'Bankroll excluído' });
  } catch (err) {
    console.error('Erro na rota DELETE /api/bankrolls/:id:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 