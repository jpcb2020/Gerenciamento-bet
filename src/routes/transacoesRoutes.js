// Define as rotas para /api/transacoes, todas interagem com o banco de dados.
const express = require('express');
const router = express.Router();
const transacoesController = require('../controllers/transacoesController');

// GET /api/transacoes - Retorna todas as transações.
router.get('/', transacoesController.getAllTransacoes);

// POST /api/transacoes - Adiciona uma nova transação.
router.post('/', transacoesController.addTransacao);

// PUT /api/transacoes/:id - Atualiza uma transação existente.
router.put('/:id', transacoesController.updateTransacao);

// DELETE /api/transacoes/:id - Deleta uma transação existente.
router.delete('/:id', transacoesController.deleteTransacao);

// A rota GET /api/casas/:id/transacoes (para buscar transações de uma casa específica) 
// é gerenciada em src/routes/casasRoutes.js
// router.get('/casas/:id/transacoes', transacoesController.getTransacoesByCasaId);

module.exports = router; 