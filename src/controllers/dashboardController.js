// This file will contain controller logic for 'dashboard' routes. 

const { pool } = require('../config/db');

// Get dashboard summary
const getDashboardSummary = async (req, res) => {
  try {
    const result = {};
    
    // Get total balance
    const saldoResult = await pool.query('SELECT SUM(saldo) as saldo_total FROM casas_apostas');
    result.saldo_total = saldoResult.rows[0].saldo_total || 0;
    
    // Get active betting houses count
    const casasResult = await pool.query('SELECT COUNT(*) as casas_count FROM casas_apostas');
    result.casas_count = casasResult.rows[0].casas_count || 0;
    
    // Get highest balance betting house
    const maiorSaldoResult = await pool.query('SELECT nome, saldo FROM casas_apostas ORDER BY saldo DESC LIMIT 1');
    result.maior_saldo = maiorSaldoResult.rows[0] || { nome: 'N/A', saldo: 0 };
    
    // Get month performance
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const dateStr = oneMonthAgo.toISOString().split('T')[0];
    
    const rendimentoResult = await pool.query(`
      SELECT 
        (SELECT COALESCE(SUM(CASE WHEN tipo IN ('deposito', 'ganho') THEN valor ELSE 0 END), 0) 
         FROM transacoes 
         WHERE data >= $1) as entradas,
        (SELECT COALESCE(SUM(CASE WHEN tipo IN ('saque', 'aposta') THEN valor ELSE 0 END), 0) 
         FROM transacoes 
         WHERE data >= $1) as saidas
    `, [dateStr]);
    
    const entradas = rendimentoResult.rows[0].entradas || 0;
    const saidas = rendimentoResult.rows[0].saidas || 0;
    
    // Calculate performance
    let rendimento = 0;
    if (saidas > 0) {
      rendimento = ((entradas - saidas) / saidas) * 100;
    }
    
    result.rendimento = parseFloat(rendimento.toFixed(2));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getDashboardSummary
}; 