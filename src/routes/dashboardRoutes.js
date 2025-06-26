// Define a rota para /api/dashboard, que interage com o banco de dados para buscar dados sumarizados.
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboard - Retorna um resumo dos dados para o dashboard.
router.get('/', dashboardController.getDashboardSummary);

// GET /api/dashboard/relatorios - Retorna dados detalhados para relatórios de bankrolls
router.get('/relatorios', dashboardController.getRelatorioBankrolls);

module.exports = router; 