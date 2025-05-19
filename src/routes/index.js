const express = require('express');
const router = express.Router();
const casasRoutes = require('./casasRoutes');
const transacoesRoutes = require('./transacoesRoutes');
const dashboardRoutes = require('./dashboardRoutes');

// Configuração de todas as rotas API
router.use('/casas', casasRoutes);
router.use('/transacoes', transacoesRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router; 