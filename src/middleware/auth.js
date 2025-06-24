const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Middleware para verificar autenticação
const requireAuth = async (req, res, next) => {
  try {
    // Verificar se existe sessão
    if (!req.session.user || !req.session.token) {
      return res.redirect('/login');
    }
    
    // Verificar se o token é válido
    const decoded = jwt.verify(req.session.token, process.env.JWT_SECRET);
    
    // Verificar se o usuário ainda existe e está ativo
    const result = await pool.query(
      'SELECT id, nome, sobrenome, email, ativo, data_criacao FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0 || !result.rows[0].ativo) {
      req.session.destroy();
      return res.redirect('/login');
    }
    
    // Adicionar usuário ao request
    req.user = result.rows[0];
    next();
    
  } catch (error) {
    console.error('Erro na autenticação:', error);
    req.session.destroy();
    res.redirect('/login');
  }
};

// Middleware para verificar autenticação em APIs (retorna JSON)
const requireAuthAPI = async (req, res, next) => {
  try {
    // Verificar se existe sessão
    if (!req.session.user || !req.session.token) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    // Verificar se o token é válido
    const decoded = jwt.verify(req.session.token, process.env.JWT_SECRET);
    
    // Verificar se o usuário ainda existe e está ativo
    const result = await pool.query(
      'SELECT id, nome, sobrenome, email, ativo, data_criacao FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0 || !result.rows[0].ativo) {
      req.session.destroy();
      return res.status(401).json({ error: 'Usuário inválido ou inativo' });
    }
    
    // Adicionar usuário ao request
    req.user = result.rows[0];
    next();
    
  } catch (error) {
    console.error('Erro na autenticação API:', error);
    req.session.destroy();
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para redirecionar usuários autenticados
const redirectIfAuth = (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
};

module.exports = {
  requireAuth,
  requireAuthAPI,
  redirectIfAuth
};