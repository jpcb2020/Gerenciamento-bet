// This file will contain controller logic for 'dashboard' routes. 

const { pool } = require('../config/db');

// Get dashboard summary
const getDashboardData = async (req, res) => {
  try {
    // Buscar saldo total das casas de apostas do usuário
    const saldoResult = await pool.query('SELECT SUM(saldo) as saldo_total FROM casas_apostas WHERE user_id = $1', [req.user.id]);
    const saldoTotal = saldoResult.rows[0].saldo_total || 0;

    // Buscar número de casas de apostas do usuário
    const casasResult = await pool.query('SELECT COUNT(*) as casas_count FROM casas_apostas WHERE user_id = $1', [req.user.id]);
    const casasCount = casasResult.rows[0].casas_count || 0;

    // Buscar casa com maior saldo do usuário
    const maiorSaldoResult = await pool.query('SELECT nome, saldo FROM casas_apostas WHERE user_id = $1 ORDER BY saldo DESC LIMIT 1', [req.user.id]);
    const maiorSaldo = maiorSaldoResult.rows[0] || { nome: 'N/A', saldo: 0 };
    
    // Get month performance do usuário
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const dateStr = oneMonthAgo.toISOString().split('T')[0];
    
    const rendimentoResult = await pool.query(`
      SELECT 
        (SELECT COALESCE(SUM(CASE WHEN tipo IN ('deposito', 'ganho') THEN valor ELSE 0 END), 0) 
         FROM transacoes 
         WHERE data >= $1 AND user_id = $2) as entradas,
        (SELECT COALESCE(SUM(CASE WHEN tipo IN ('saque', 'aposta') THEN valor ELSE 0 END), 0) 
         FROM transacoes 
         WHERE data >= $1 AND user_id = $2) as saidas
    `, [dateStr, req.user.id]);
    
    const entradas = rendimentoResult.rows[0].entradas || 0;
    const saidas = rendimentoResult.rows[0].saidas || 0;
    
    // Calculate performance
    let rendimento = 0;
    if (saidas > 0) {
      rendimento = ((entradas - saidas) / saidas) * 100;
    }
    
    const result = {
      saldo_total: saldoTotal,
      casas_count: casasCount,
      maior_saldo: maiorSaldo,
      rendimento: parseFloat(rendimento.toFixed(2))
    };
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getDashboardSummary: getDashboardData
};