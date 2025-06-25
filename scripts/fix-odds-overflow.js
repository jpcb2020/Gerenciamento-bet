const { pool } = require('../src/config/db');

async function fixOddsOverflow() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Iniciando correção do problema de overflow das odds...');
        
        // Alterar tipos de dados para suportar valores maiores
        console.log('📝 Alterando tipo de dados da coluna odds...');
        await client.query('ALTER TABLE sports_bet_entries ALTER COLUMN odds TYPE NUMERIC(15,2);');
        
        console.log('📝 Alterando tipo de dados da coluna retorno_potencial...');
        await client.query('ALTER TABLE sports_bet_entries ALTER COLUMN retorno_potencial TYPE NUMERIC(15,2);');
        
        console.log('📝 Alterando tipo de dados da coluna lucro_total...');
        await client.query('ALTER TABLE sports_bet_entries ALTER COLUMN lucro_total TYPE NUMERIC(15,2);');
        
        // Verificar se existem dados inválidos
        console.log('🔍 Verificando dados existentes...');
        const invalidData = await client.query(`
            SELECT id, odds, valor_apostado, retorno_potencial, lucro_total 
            FROM sports_bet_entries 
            WHERE odds > 99999999.99 
               OR retorno_potencial > 99999999.99 
               OR lucro_total > 99999999.99 
               OR lucro_total < -99999999.99
        `);
        
        if (invalidData.rows.length > 0) {
            console.log(`⚠️  Encontrados ${invalidData.rows.length} registros com valores extremamente altos:`);
            invalidData.rows.forEach(row => {
                console.log(`ID: ${row.id}, Odd: ${row.odds}, Valor: ${row.valor_apostado}, Retorno: ${row.retorno_potencial}, Lucro: ${row.lucro_total}`);
            });
            console.log('ℹ️  Estes registros podem precisar de revisão manual.');
        } else {
            console.log('✅ Nenhum registro com valores extremos encontrado.');
        }
        
        // Verificar as alterações
        console.log('🔍 Verificando estrutura atualizada...');
        const columnInfo = await client.query(`
            SELECT column_name, data_type, numeric_precision, numeric_scale 
            FROM information_schema.columns 
            WHERE table_name = 'sports_bet_entries' 
            AND column_name IN ('odds', 'retorno_potencial', 'lucro_total')
            ORDER BY column_name;
        `);
        
        console.log('📊 Estrutura atualizada:');
        columnInfo.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type}(${col.numeric_precision},${col.numeric_scale})`);
        });
        
        console.log('✅ Correção do problema de overflow das odds concluída com sucesso!');
        console.log('ℹ️  Agora é possível inserir odds e valores muito maiores sem erro.');
        
    } catch (error) {
        console.error('❌ Erro durante a correção:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    fixOddsOverflow()
        .then(() => {
            console.log('🎉 Script executado com sucesso!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Erro fatal:', error);
            process.exit(1);
        });
}

module.exports = { fixOddsOverflow }; 