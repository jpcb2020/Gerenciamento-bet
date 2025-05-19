const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Rota para o Dashboard
router.get(['/', '/dashboard'], async (req, res) => {
    try {
        // Obter dados do dashboard
        const dashboardResponse = await fetch('http://localhost:3000/api/dashboard');
        const dashboard = await dashboardResponse.json();
        
        // Obter casas de apostas
        const casasResponse = await fetch('http://localhost:3000/api/casas');
        const casas = await casasResponse.json();
        
        // Obter transações recentes (limitadas a 5)
        const transacoesResponse = await fetch('http://localhost:3000/api/transacoes');
        const allTransacoes = await transacoesResponse.json();
        const transacoes = allTransacoes.slice(0, 5); // Apenas as 5 mais recentes
        
        res.render('pages/dashboard', {
            dashboard,
            casas,
            transacoes
        });
    } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
        res.status(500).render('pages/error', { 
            message: 'Erro ao carregar o dashboard',
            error: process.env.NODE_ENV === 'development' ? err : {}
        });
    }
});

// Rota para Casas de Apostas
router.get('/casas', async (req, res) => {
    try {
        // Obter casas de apostas
        const casasResponse = await fetch('http://localhost:3000/api/casas');
        const casas = await casasResponse.json();
        
        res.render('pages/casas', { casas });
    } catch (err) {
        console.error('Erro ao carregar casas de apostas:', err);
        res.status(500).render('pages/error', { 
            message: 'Erro ao carregar casas de apostas',
            error: process.env.NODE_ENV === 'development' ? err : {}
        });
    }
});

// Rota para Transações
router.get('/transacoes', async (req, res) => {
    try {
        // Paginação
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        
        // Obter todas as transações para calcular o total de páginas
        const transacoesResponse = await fetch('http://localhost:3000/api/transacoes');
        const allTransacoes = await transacoesResponse.json();
        
        // Simular paginação (em produção, isso seria feito no backend)
        const transacoes = allTransacoes.slice(offset, offset + limit);
        const totalTransacoes = allTransacoes.length;
        const totalPages = Math.ceil(totalTransacoes / limit);
        
        res.render('pages/transacoes', {
            transacoes,
            currentPage: page,
            totalPages,
            totalTransacoes
        });
    } catch (err) {
        console.error('Erro ao carregar transações:', err);
        res.status(500).render('pages/error', { 
            message: 'Erro ao carregar transações',
            error: process.env.NODE_ENV === 'development' ? err : {}
        });
    }
});

// Rota para a página de erro (para uso com o manipulador de erro)
router.get('/error', (req, res) => {
    res.render('pages/error', { 
        message: 'Ocorreu um erro',
        error: {}
    });
});

module.exports = router; 