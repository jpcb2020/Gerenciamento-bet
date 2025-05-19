const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Rotas para dashboard
router.get('/', dashboardController.getDashboardSummary);

module.exports = router; 