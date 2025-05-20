require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { initDb, pool } = require('./src/config/db'); // Atualizado para o novo caminho

// Import routes
const casasRoutes = require('./src/routes/casasRoutes');
const transacoesRoutes = require('./src/routes/transacoesRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const bankrollRoutes = require('./src/routes/bankrollRoutes');

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

// Initialize Database
initDb();

// API Endpoints - Usar as rotas importadas
app.use('/api/casas', casasRoutes);
app.use('/api/transacoes', transacoesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/bankrolls', bankrollRoutes);

// Rota principal para renderizar o index.ejs da pasta views
app.get('/', (req, res) => {
  // Você pode passar dados para o template se necessário
  // Exemplo: res.render('index', { title: 'Página Inicial BetManager' });
  res.render('index', { title: 'Gerenciamento de Apostas' }); 
});

// Rota para a nova página de casas detalhadas
app.get('/casas-de-apostas', (req, res) => {
  res.render('casas-de-apostas', { title: 'Casas de Apostas' });
});

// Rota para a página de transações
app.get('/transacoes', (req, res) => {
  res.render('transacoes', { title: 'Transações' });
});

// Rota para a página de bankrolls
app.get('/bankrolls', (req, res) => {
  res.render('bankrolls', { title: 'Gerenciar Bankrolls' });
});

// Rota para a página de detalhes de surebet
app.get('/surebet-detail', (req, res) => {
  res.render('surebet-detail', { title: 'Detalhes Surebet' });
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


