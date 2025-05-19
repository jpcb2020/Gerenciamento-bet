require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { initDb } = require('./config/database');
const apiRoutes = require('./routes');
const viewRoutes = require('./routes/viewRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Inicializar app Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configurar EJS como view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
// Para manter compatibilidade com a estrutura antiga durante a transição
app.use(express.static(path.join(__dirname, '../')));

// Inicializar banco de dados
initDb();

// Rotas da API
app.use('/api', apiRoutes);

// Rotas de visualização (views)
app.use('/', viewRoutes);

// Middleware de tratamento de erros
app.use(notFound);
app.use(errorHandler);

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Tratar desligamento do servidor
process.on('SIGINT', () => {
  console.log('Conexão com o banco de dados fechada.');
  process.exit(0);
}); 