const { pool } = require('../config/database');

// Obter resumo do dashboard
const getDashboardSummary = async (req, res) => {
  try {
    const result = {};
    
    // Obter saldo total
    const saldoResult = await pool.query('SELECT SUM(saldo) as saldo_total FROM casas_apostas');
    result.saldo_total = saldoResult.rows[0].saldo_total || 0;
    
    // Obter contagem de casas de apostas ativas
    const casasResult = await pool.query('SELECT COUNT(*) as casas_count FROM casas_apostas');
    result.casas_count = casasResult.rows[0].casas_count || 0;
    
    // Obter casa com maior saldo
    const maiorSaldoResult = await pool.query('SELECT nome, saldo FROM casas_apostas ORDER BY saldo DESC LIMIT 1');
    result.maior_saldo = maiorSaldoResult.rows[0] || { nome: 'N/A', saldo: 0 };
    
    // Obter rendimento mensal
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
    
    // Calcular rendimento
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