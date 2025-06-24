const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuth } = require('../middleware/auth');

// Rotas para renderizar páginas
router.get('/login', redirectIfAuth, authController.renderLogin);
router.get('/register', redirectIfAuth, authController.renderRegister);
router.get('/forgot-password', redirectIfAuth, authController.renderForgotPassword);
router.get('/reset-password/:token', redirectIfAuth, authController.renderResetPassword);

// Rotas da API
router.post('/api/register', authController.register);
router.post('/api/login', authController.login);
router.post('/api/logout', authController.logout);
router.get('/api/check-auth', authController.checkAuth);
router.post('/api/forgot-password', authController.forgotPassword);
router.post('/api/reset-password', authController.resetPassword);

module.exports = router;