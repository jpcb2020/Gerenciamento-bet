const { pool } = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🚀 Iniciando migration para tabela de tokens de recuperação de senha...');
        
        // Ler o arquivo SQL de migration
        const migrationPath = path.join(__dirname, '..', 'migrations', 'add_password_reset_tokens.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Executar a migration
        await pool.query(migrationSQL);
        
        console.log('✅ Migration executada com sucesso!');
        console.log('📋 Tabela password_reset_tokens criada com:');
        console.log('   - Chave primária');
        console.log('   - Chave estrangeira para users');
        console.log('   - Índices para performance');
        console.log('   - Comentários de documentação');
        
        // Verificar se a tabela foi criada
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'password_reset_tokens' 
            ORDER BY ordinal_position
        `);
        
        if (result.rows.length > 0) {
            console.log('\n📊 Estrutura da tabela criada:');
            result.rows.forEach(row => {
                console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
            });
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Erro ao executar migration:', error.message);
        
        // Verificar se a tabela já existe
        if (error.message.includes('already exists')) {
            console.log('ℹ️  A tabela password_reset_tokens já existe.');
            console.log('💡 Para recriar a tabela, execute: DROP TABLE password_reset_tokens CASCADE;');
        } else {
            console.log('🔍 Verifique:');
            console.log('   - Se o banco de dados está rodando');
            console.log('   - Se as credenciais no .env estão corretas');
            console.log('   - Se o banco de dados existe');
        }
        
        process.exit(1);
    }
}

// Verificar se o script está sendo executado diretamente
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration }; 