const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Registrar novo usuário
const register = async (req, res) => {
  const { nome, sobrenome, email, password } = req.body;
  
  try {
    // Verificar se o usuário já existe
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }
    
    // Hash da senha
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Inserir novo usuário
    const result = await pool.query(
      'INSERT INTO users (nome, sobrenome, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, nome, sobrenome, email',
      [nome, sobrenome, email, passwordHash]
    );
    
    const user = result.rows[0];
    
    // Gerar JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Salvar token na sessão
    req.session.token = token;
    req.session.user = user;
    
    res.status(201).json({
      message: 'Usuário registrado com sucesso',
      user: { id: user.id, nome: user.nome, sobrenome: user.sobrenome, email: user.email },
      token
    });
    
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Login do usuário
const login = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Buscar usuário pelo email
    const result = await pool.query(
      'SELECT id, nome, sobrenome, email, password_hash, ativo FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }
    
    const user = result.rows[0];
    
    // Verificar se o usuário está ativo
    if (!user.ativo) {
      return res.status(401).json({ error: 'Conta desativada' });
    }
    
    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }
    
    // Atualizar último login
    await pool.query(
      'UPDATE users SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    // Gerar JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Salvar token na sessão
    req.session.token = token;
    req.session.user = {
      id: user.id,
      nome: user.nome,
      sobrenome: user.sobrenome,
      email: user.email
    };
    
    res.json({
      message: 'Login realizado com sucesso',
      user: { id: user.id, nome: user.nome, sobrenome: user.sobrenome, email: user.email },
      token
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Logout do usuário
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao fazer logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout realizado com sucesso' });
  });
};

// Verificar se o usuário está autenticado
const checkAuth = (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
};

// Renderizar página de login
const renderLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Login - BetManager' });
};

// Renderizar página de registro
const renderRegister = (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('register', { title: 'Registro - BetManager' });
};

module.exports = {
  register,
  login,
  logout,
  checkAuth,
  renderLogin,
  renderRegister
};