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
const sportsBetRoutes = require('./src/routes/sportsBetRoutes');
const generalRoutes = require('./src/routes/generalRoutes');
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
app.use('/api/sports-bet', requireAuth, sportsBetRoutes);
app.use('/api/general', requireAuth, generalRoutes);

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

app.get('/relatorios', requireAuth, (req, res) => {
  res.render('relatorios', { 
    title: 'Relatórios - BetManager',
    user: req.user
  });
});

app.get('/bonus-promocoes', requireAuth, (req, res) => {
  res.render('bonus-promocoes', { 
    title: 'Bônus e Promoções - BetManager',
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

app.get('/profile', requireAuth, (req, res) => {
  res.render('profile', { 
    title: 'Meu Perfil - BetManager',
    user: req.user
  });
});

// Rota para a página de planos (independente, não precisa de autenticação)
app.get('/planos', (req, res) => {
  res.render('planos', { 
    title: 'Planos - BetManager'
  });
});

// Rota API para alterar senha
app.post('/api/change-password', requireAuth, async (req, res) => {
  const { changePassword } = require('./src/controllers/authController');
  await changePassword(req, res);
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

// Rota para a página de detalhes de apostas esportivas
app.get('/sports-bet-detail', requireAuth, async (req, res) => {
  const bankrollId = req.query.id;
  if (!bankrollId) {
    return res.status(400).send('ID do Bankroll não fornecido');
  }

  try {
    // Buscar diretamente no banco de dados
    const result = await pool.query('SELECT * FROM bankrolls WHERE id = $1 AND user_id = $2', [bankrollId, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.redirect('/bankrolls?error=not_found');
    }
    
    const bankroll = result.rows[0];
    
    if (bankroll.categoria !== 'Apostas esportivas') {
      // Redirecionar ou mostrar erro se não for Apostas esportivas
      return res.redirect('/bankrolls?error=not_sports_bet');
    }

    // Buscar bônus do usuário
    const bonusResult = await pool.query(
      'SELECT * FROM user_bonus WHERE user_id = $1 ORDER BY data_criacao DESC',
      [req.user.id]
    );

    // Passar os dados do bankroll e bônus para o template
    res.render('sports-bet-detail', { 
      title: `Apostas Esportivas: ${bankroll.nome}`,
      bankroll: bankroll,
      user: req.user,
      userBonus: bonusResult.rows
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

// Rota API para deletar bônus do usuário
app.delete('/api/user/bonus/:bonusId', requireAuth, async (req, res) => {
  try {
    const { bonusId } = req.params;
    
    // Verificar se o bônus pertence ao usuário logado
    const bonusCheck = await pool.query(
      'SELECT id FROM user_bonus WHERE id = $1 AND user_id = $2',
      [bonusId, req.user.id]
    );
    
    if (bonusCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bônus não encontrado ou não pertence ao usuário' });
    }
    
    // Deletar o bônus
    await pool.query(
      'DELETE FROM user_bonus WHERE id = $1 AND user_id = $2',
      [bonusId, req.user.id]
    );
    
    res.json({ msg: 'Aposta grátis deletada com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar bônus:', error);
    res.status(500).json({ error: 'Erro ao deletar aposta grátis' });
  }
});

// API para verificar status das roletas
app.get('/api/roletas/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Definir casas de apostas disponíveis
    const casasDisponiveis = ['7games', 'betao', 'r7', 'betano', 'superbet', 'novibet', 'papigames'];
    
    // Definir horários de reset para cada casa
    const resetHours = {
      'superbet': 18, // 18:00
      'default': 0    // 00:00 para todas as outras
    };
    
    const statusPromises = casasDisponiveis.map(async (casa) => {
      const resetHour = resetHours[casa] || resetHours['default'];
      
      // Calcular a data/hora do último reset
      const now = new Date();
      const lastReset = new Date(now);
      lastReset.setHours(resetHour, 0, 0, 0);
      
      // Se ainda não passou do horário de reset hoje, considerar o reset de ontem
      if (now < lastReset) {
        lastReset.setDate(lastReset.getDate() - 1);
      }
      
      // Verificar se o usuário já clicou desde o último reset
      const clickResult = await pool.query(
        'SELECT id, created_at FROM roleta_clicks WHERE user_id = $1 AND casa_aposta = $2 AND created_at > $3 ORDER BY created_at DESC LIMIT 1',
        [userId, casa, lastReset]
      );
      
      const podeGirar = clickResult.rows.length === 0;
      
      return {
        casa: casa,
        pode_girar: podeGirar,
        data_ultimo_click: podeGirar ? null : (clickResult.rows[0] ? clickResult.rows[0].created_at : null),
        reset_hour: resetHour
      };
    });
    
    const statusData = await Promise.all(statusPromises);
    res.json(statusData);
    
  } catch (error) {
    console.error('Erro ao verificar status das roletas:', error);
    res.status(500).json({ error: 'Erro ao verificar status das roletas' });
  }
});

// API para registrar clique da roleta
app.post('/api/roletas/girar', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { casa } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    if (!casa) {
      return res.status(400).json({ error: 'Casa de aposta não especificada' });
    }
    
    // Verificar se é uma casa válida
    const casasValidas = ['7games', 'betao', 'r7', 'betano', 'superbet', 'novibet', 'papigames'];
    if (!casasValidas.includes(casa)) {
      return res.status(400).json({ error: 'Casa de aposta inválida' });
    }
    
    // Definir horários de reset para cada casa
    const resetHours = {
      'superbet': 18, // 18:00
      'default': 0    // 00:00 para todas as outras
    };
    
    const resetHour = resetHours[casa] || resetHours['default'];
    
    // Calcular a data/hora do último reset
    const now = new Date();
    const lastReset = new Date(now);
    lastReset.setHours(resetHour, 0, 0, 0);
    
    // Se ainda não passou do horário de reset hoje, considerar o reset de ontem
    if (now < lastReset) {
      lastReset.setDate(lastReset.getDate() - 1);
    }
    
    // Verificar se o usuário já clicou desde o último reset
    const existingClick = await pool.query(
      'SELECT id FROM roleta_clicks WHERE user_id = $1 AND casa_aposta = $2 AND created_at > $3',
      [userId, casa, lastReset]
    );
    
    if (existingClick.rows.length > 0) {
      const errorMessage = (casa === '7games' || casa === 'betao' || casa === 'r7' || casa === 'betano' || casa === 'superbet' || casa === 'novibet' || casa === 'papigames')
        ? `Você já girou esta roleta hoje. ${casa === 'superbet' ? 'Próximo reset às 18:00' : 'Tente novamente amanhã'}!` 
        : 'Você já acessou esta promoção hoje. Tente novamente amanhã!';
      return res.status(400).json({ error: errorMessage });
    }
    
    // Registrar o clique
    await pool.query(
      'INSERT INTO roleta_clicks (user_id, casa_aposta, data_click) VALUES ($1, $2, $3)',
      [userId, casa, now.toISOString().split('T')[0]]
    );
    
    const redirectUrls = {
      '7games': 'https://7games.bet/',
      'betao': 'https://betao.bet.br/',
      'r7': 'https://r7.bet.br/',
      'betano': 'https://www.betano.bet.br/',
      'superbet': 'https://superbet.bet.br/',
      'novibet': 'https://www.novibet.bet.br/cassino/giftwheel',
      'papigames': 'https://papigames.bet.br/'
    };

    res.json({ 
      success: true, 
      message: 'Clique registrado com sucesso!',
      casa: casa,
      redirect_url: redirectUrls[casa] || '#'
    });
    
  } catch (error) {
    console.error('Erro ao registrar clique da roleta:', error);
    
    // Verificar se é erro de constraint única (já acessou hoje)
    if (error.code === '23505') {
      const errorMessage = (casa === '7games' || casa === 'betao' || casa === 'r7' || casa === 'betano' || casa === 'superbet' || casa === 'novibet' || casa === 'papigames')
        ? `Você já girou esta roleta hoje. ${casa === 'superbet' ? 'Próximo reset às 18:00' : 'Tente novamente amanhã'}!` 
        : 'Você já acessou esta promoção hoje. Tente novamente amanhã!';
      return res.status(400).json({ error: errorMessage });
    }
    
    res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
});

// API para forçar reset do timer (desenvolvimento)
app.post('/api/roletas/force-reset', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { casa } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    if (!casa) {
      return res.status(400).json({ error: 'Casa de aposta não especificada' });
    }
    
    // Verificar se é uma casa válida
    const casasValidas = ['7games', 'betao', 'r7', 'betano', 'superbet', 'novibet', 'papigames'];
    if (!casasValidas.includes(casa)) {
      return res.status(400).json({ error: 'Casa de aposta inválida' });
    }
    
    // Deletar o registro de clique de hoje (se existir)
    const deleteResult = await pool.query(
      'DELETE FROM roleta_clicks WHERE user_id = $1 AND casa_aposta = $2 AND data_click = $3',
      [userId, casa, today]
    );
    
    const casaNames = {
      'betao': 'BETÃO',
      'r7': 'R7',
      '7games': '7GAMES',
      'betano': 'BETANO',
      'superbet': 'SUPERBET',
      'novibet': 'NOVIBET',
      'papigames': 'PAPIGAMES'
    };
    const casaName = casaNames[casa] || casa.toUpperCase();
    
    res.json({ 
      success: true, 
      message: `Timer da ${casaName} resetado com sucesso!`,
      rows_deleted: deleteResult.rowCount
    });
    
  } catch (error) {
    console.error('Erro ao forçar reset do timer:', error);
    res.status(500).json({ error: 'Erro ao resetar timer' });
  }
});

// Rota para a página de detalhes de categoria geral
app.get('/general-detail', requireAuth, async (req, res) => {
  const bankrollId = req.query.id;
  if (!bankrollId) {
    return res.status(400).send('ID do Bankroll não fornecido');
  }

  try {
    // Buscar diretamente no banco de dados
    const result = await pool.query('SELECT * FROM bankrolls WHERE id = $1 AND user_id = $2', [bankrollId, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.redirect('/bankrolls?error=not_found');
    }
    
    const bankroll = result.rows[0];
    
    if (bankroll.categoria !== 'Geral') {
      // Redirecionar ou mostrar erro se não for categoria Geral
      return res.redirect('/bankrolls?error=not_general');
    }

    // Passar os dados do bankroll para o template
    res.render('general-detail', { 
      title: `Categoria Geral: ${bankroll.nome}`,
      bankroll: bankroll,
      user: req.user
    });
  } catch (error) {
    console.error('Erro ao buscar dados do bankroll:', error);
    res.status(500).send('Erro ao carregar detalhes do bankroll');
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


