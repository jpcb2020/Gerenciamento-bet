require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { initDb } = require('./config/database');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Inicializar app Express
const app = express();
const PORT = process.env.PORT || 3000;

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

// Servir o index.html para qualquer rota não definida (SPA)
app.get('*', (req, res) => {
  // Primeiro tenta servir da nova localização, se existir
  const newIndexPath = path.join(__dirname, 'public/index.html');
  const oldIndexPath = path.join(__dirname, '../index.html');
  
  if (require('fs').existsSync(newIndexPath)) {
    res.sendFile(newIndexPath);
  } else {
    res.sendFile(oldIndexPath);
  }
});

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