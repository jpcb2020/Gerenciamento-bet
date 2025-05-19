const express = require('express');
const router = express.Router();
const casasController = require('../controllers/casasController');

// Rotas para casas de apostas
router.get('/', casasController.getAllCasas);
router.get('/:id', casasController.getCasaById);
router.post('/', casasController.createCasa);
router.put('/:id', casasController.updateCasa);
router.delete('/:id', casasController.deleteCasa);
router.get('/:id/transacoes', casasController.getCasaTransacoes);

module.exports = router; 