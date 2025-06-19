require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
require('dotenv').config();
const { initDb, pool } = require('./src/config/db'); // Atualizado para o novo caminho
const axios = require('axios'); // Adicionar axios

// Import routes
const casasRoutes = require('./src/routes/casasRoutes');
const transacoesRoutes = require('./src/routes/transacoesRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const bankrollRoutes = require('./src/routes/bankrollRoutes');
const surebetRoutes = require('./src/routes/surebetRoutes');
const authRoutes = require('./src/routes/auth');

// Import middleware
const { requireAuth } = require('./src/middleware/auth');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Servir arquivos estáticos da pasta public

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Database
initDb();

// Auth routes (não protegidas)
app.use('/', authRoutes);

// API Endpoints - Usar as rotas importadas (protegidas por autenticação)
app.use('/api/casas', requireAuth, casasRoutes);
app.use('/api/transacoes', requireAuth, transacoesRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/bankrolls', requireAuth, bankrollRoutes);
app.use('/api/surebet', requireAuth, surebetRoutes);

// Rota principal para renderizar o dashboard.ejs da pasta views (protegida)
app.get('/', requireAuth, (req, res) => {
  // Você pode passar dados para o template se necessário
  res.render('dashboard', { 
    title: 'Dashboard - Gerenciamento de Apostas',
    user: req.user
  }); 
});

// Rota específica para o dashboard (protegida)
app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { 
    title: 'Dashboard - Gerenciamento de Apostas',
    user: req.user
  });
});

// Rotas protegidas para as páginas
app.get('/casas-de-apostas', requireAuth, (req, res) => {
  res.render('casas-de-apostas', { 
    title: 'Casas de Apostas - BetManager',
    user: req.user
  });
});

app.get('/transacoes', requireAuth, (req, res) => {
  res.render('transacoes', { 
    title: 'Transações - BetManager',
    user: req.user
  });
});

app.get('/bankrolls', requireAuth, (req, res) => {
  res.render('bankrolls', { 
    title: 'Bankrolls - BetManager',
    user: req.user
  });
});

app.get('/casas-regulamentadas', requireAuth, (req, res) => {
  res.render('casas-regulamentadas', { 
    title: 'Casas Regulamentadas - BetManager',
    user: req.user
  });
});

app.get('/surebet/:id', requireAuth, (req, res) => {
  res.render('surebet-detail', { 
    title: 'Detalhes da Surebet - BetManager',
    user: req.user,
    surebetId: req.params.id
  });
});

// Rotas duplicadas removidas - mantendo apenas as rotas protegidas acima

// Rota para a página de detalhes de surebet
app.get('/surebet-detail', requireAuth, async (req, res) => { // Transformar em async
  const bankrollId = req.query.id;
  if (!bankrollId) {
    return res.status(400).send('ID do Bankroll não fornecido');
  }

  try {
    // Buscar diretamente no banco de dados
    const result = await pool.query('SELECT * FROM bankrolls WHERE id = $1 AND user_id = $2', [bankrollId, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.redirect('/bankrolls?error=not_surebet_or_found');
    }
    
    const bankroll = result.rows[0];
    
    if (bankroll.categoria !== 'Surebet') {
      // Redirecionar ou mostrar erro se não for Surebet
      return res.redirect('/bankrolls?error=not_surebet_or_found');
    }

    // Buscar bônus do usuário
    const bonusResult = await pool.query(
      'SELECT * FROM user_bonus WHERE user_id = $1 ORDER BY data_criacao DESC',
      [req.user.id]
    );

    // Passar os dados do bankroll e bônus para o template
    res.render('surebet-detail', { 
      title: `Detalhes Surebet: ${bankroll.nome}`,
      bankroll: bankroll, // Passa o objeto bankroll inteiro
      user: req.user,
      userBonus: bonusResult.rows // Passa os dados de bônus
    });
  } catch (error) {
    console.error('Erro ao buscar dados do bankroll:', error);
    res.status(500).send('Erro ao carregar detalhes do bankroll');
  }
});

// Rota API para buscar bônus do usuário
app.get('/api/user/bonus', requireAuth, async (req, res) => {
  try {
    const bonusResult = await pool.query(
      'SELECT * FROM user_bonus WHERE user_id = $1 ORDER BY data_criacao DESC',
      [req.user.id]
    );
    
    res.json(bonusResult.rows);
  } catch (error) {
    console.error('Erro ao buscar bônus do usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar dados de bônus' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle shutdown
process.on('SIGINT', () => {
  pool.end(); // pool é exportado de db.js
  console.log('Database connection closed.');
  process.exit(0);
});


