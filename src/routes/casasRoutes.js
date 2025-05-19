// Define as rotas para /api/casas, todas interagem com o banco de dados.

const express = require('express');
const router = express.Router();
const casasController = require('../controllers/casasController');
const transacoesController = require('../controllers/transacoesController');

// GET /api/casas - Retorna todas as casas de apostas.
router.get('/', casasController.getAllCasas);

// GET /api/casas/:id - Retorna uma casa de apostas específica.
router.get('/:id', casasController.getCasaById);

// POST /api/casas - Adiciona uma nova casa de apostas.
router.post('/', casasController.addCasa);

// PUT /api/casas/:id - Atualiza uma casa de apostas existente.
router.put('/:id', casasController.updateCasa);

// DELETE /api/casas/:id - Deleta uma casa de apostas.
router.delete('/:id', casasController.deleteCasa);

// GET /api/casas/:id/transacoes - Retorna todas as transações de uma casa de apostas específica.
router.get('/:id/transacoes', transacoesController.getTransacoesByCasaId);

module.exports = router; 