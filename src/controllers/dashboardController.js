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
  getDashboardSummary: getDashboardData,
  getRelatorioBankrolls: async (req, res) => {
    try {
      // Verificar se o usuário está autenticado
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      console.log('Buscando relatórios para usuário:', req.user.id);

      // Buscar todos os bankrolls do usuário com informações detalhadas
      const bankrollsResult = await pool.query(`
        SELECT 
          id, 
          nome, 
          categoria, 
          saldo_inicial, 
          saldo_atual,
          (saldo_atual - saldo_inicial) as lucro_prejuizo,
          CASE 
            WHEN saldo_inicial > 0 THEN ((saldo_atual - saldo_inicial) / saldo_inicial) * 100 
            ELSE 0 
          END as percentual_retorno,
          data_criacao as created_at
        FROM bankrolls 
        WHERE user_id = $1 
        ORDER BY data_criacao DESC
      `, [req.user.id]);

      console.log('Bankrolls encontrados:', bankrollsResult.rows.length);

      // Buscar estatísticas gerais
      const estatisticasResult = await pool.query(`
        SELECT 
          COUNT(*) as total_bankrolls,
          COALESCE(SUM(saldo_inicial), 0) as total_investido,
          COALESCE(SUM(saldo_atual), 0) as total_atual,
          COALESCE(SUM(saldo_atual - saldo_inicial), 0) as lucro_total
        FROM bankrolls 
        WHERE user_id = $1
      `, [req.user.id]);

      // Buscar dados para o gráfico de evolução (últimos 30 dias)
      let evolucaoResult;
      try {
        evolucaoResult = await pool.query(`
          SELECT 
            DATE(data) as data,
            SUM(CASE WHEN tipo IN ('deposito', 'ganho') THEN valor ELSE -valor END) as variacao_diaria
          FROM transacoes 
          WHERE user_id = $1 
            AND data >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(data)
          ORDER BY data
        `, [req.user.id]);
      } catch (evolucaoError) {
        console.log('Erro na query de evolução, usando dados vazios:', evolucaoError.message);
        evolucaoResult = { rows: [] };
      }

      // Buscar top bankrolls por categoria
      const categoriaResult = await pool.query(`
        SELECT 
          categoria,
          COUNT(*) as quantidade,
          COALESCE(SUM(saldo_atual), 0) as total_saldo,
          COALESCE(SUM(saldo_atual - saldo_inicial), 0) as total_lucro
        FROM bankrolls 
        WHERE user_id = $1 
        GROUP BY categoria
        ORDER BY total_saldo DESC
      `, [req.user.id]);

      const result = {
        bankrolls: bankrollsResult.rows,
        estatisticas: estatisticasResult.rows[0] || {
          total_bankrolls: 0,
          total_investido: 0,
          total_atual: 0,
          lucro_total: 0
        },
        evolucao: evolucaoResult.rows,
        categorias: categoriaResult.rows
      };

      console.log('Dados de relatório preparados:', {
        bankrolls: result.bankrolls.length,
        estatisticas: result.estatisticas,
        evolucao: result.evolucao.length,
        categorias: result.categorias.length
      });

      res.json(result);
    } catch (err) {
      console.error('Erro ao buscar relatórios:', err);
      res.status(500).json({ error: err.message });
    }
  }
};