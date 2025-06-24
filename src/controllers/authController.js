const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { sendPasswordResetEmail } = require('../config/emailService');

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

// Esqueceu a senha - enviar email de recuperação
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  
  try {
    // Verificar se o usuário existe
    const userResult = await pool.query(
      'SELECT id, nome, sobrenome, email, ativo FROM users WHERE email = $1',
      [email]
    );
    
    // Sempre retornar sucesso por segurança (não revelar se email existe)
    if (userResult.rows.length === 0) {
      return res.json({ 
        message: 'Se o email existir em nossa base, você receberá instruções para recuperação da senha.' 
      });
    }
    
    const user = userResult.rows[0];
    
    // Verificar se o usuário está ativo
    if (!user.ativo) {
      return res.json({ 
        message: 'Se o email existir em nossa base, você receberá instruções para recuperação da senha.' 
      });
    }
    
    // Invalidar tokens anteriores não utilizados
    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false',
      [user.id]
    );
    
    // Gerar novo token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hora
    
    // Salvar token no banco
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, resetToken, expiresAt]
    );
    
    // Enviar email
    const emailResult = await sendPasswordResetEmail(
      user.email, 
      resetToken, 
      `${user.nome} ${user.sobrenome}`
    );
    
    if (!emailResult.success) {
      console.error('Erro ao enviar email:', emailResult.error);
      return res.status(500).json({ error: 'Erro ao enviar email de recuperação' });
    }
    
    res.json({ 
      message: 'Se o email existir em nossa base, você receberá instruções para recuperação da senha.' 
    });
    
  } catch (error) {
    console.error('Erro no forgot password:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Redefinir senha
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  
  try {
    // Verificar se o token existe e é válido
    const tokenResult = await pool.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.email, u.nome, u.sobrenome
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()`,
      [token]
    );
    
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }
    
    const tokenData = tokenResult.rows[0];
    
    // Hash da nova senha
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Atualizar senha do usuário
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, tokenData.user_id]
    );
    
    // Marcar token como usado
    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE id = $1',
      [tokenData.id]
    );
    
    // Invalidar todas as sessões ativas (opcional)
    // Aqui você poderia implementar um blacklist de tokens JWT
    
    res.json({ message: 'Senha redefinida com sucesso' });
    
  } catch (error) {
    console.error('Erro no reset password:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Logout do usuário
const logout = (req, res) => {
  // Limpar dados da sessão antes de destruir
  req.session.user = null;
  req.session.token = null;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao destruir sessão:', err);
      return res.status(500).json({ error: 'Erro ao fazer logout' });
    }
    
    // Limpar todos os cookies relacionados à sessão
    res.clearCookie('connect.sid');
    res.clearCookie('session');
    res.clearCookie('sess');
    
    // Adicionar headers para prevenir cache
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
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

// Renderizar página de esqueceu a senha
const renderForgotPassword = (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('forgot-password', { title: 'Esqueceu a Senha - BetManager' });
};

// Renderizar página de redefinir senha
const renderResetPassword = async (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  
  const { token } = req.params;
  
  try {
    // Verificar se o token é válido
    const tokenResult = await pool.query(
      'SELECT id FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
      [token]
    );
    
    if (tokenResult.rows.length === 0) {
      return res.render('reset-password', { 
        title: 'Redefinir Senha - BetManager',
        error: 'Token inválido ou expirado',
        token: null 
      });
    }
    
    res.render('reset-password', { 
      title: 'Redefinir Senha - BetManager',
      error: null,
      token 
    });
    
  } catch (error) {
    console.error('Erro ao renderizar reset password:', error);
    res.render('reset-password', { 
      title: 'Redefinir Senha - BetManager',
      error: 'Erro interno do servidor',
      token: null 
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  checkAuth,
  renderLogin,
  renderRegister,
  forgotPassword,
  resetPassword,
  renderForgotPassword,
  renderResetPassword
};