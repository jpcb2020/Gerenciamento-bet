const express = require('express');
const router = express.Router();

// Rota para a página inicial
router.get('/', (req, res) => {
    res.render('index');
});

// Rota para a página de bankrolls
router.get('/bankrolls', (req, res) => {
    res.render('bankrolls');
});

// Adicionar a nova rota para detalhes de surebet
router.get('/surebet-detail', (req, res) => {
    res.render('surebet-detail');
}); 

module.exports = router; 