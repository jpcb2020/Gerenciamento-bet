const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuth } = require('../middleware/auth');

// Rotas para renderizar páginas
router.get('/login', redirectIfAuth, authController.renderLogin);
router.get('/register', redirectIfAuth, authController.renderRegister);

// Rotas da API
router.post('/api/register', authController.register);
router.post('/api/login', authController.login);
router.post('/api/logout', authController.logout);
router.get('/api/check-auth', authController.checkAuth);

module.exports = router;