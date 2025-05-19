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

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

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


