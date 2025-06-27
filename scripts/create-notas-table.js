const { pool } = require('../src/config/db');

async function createNotasTable() {
    try {
        console.log('🚀 Criando tabela de notas...');
        
        // Verificar se a tabela já existe
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'notas'
            );
        `);
        
        if (tableExists.rows[0].exists) {
            console.log('ℹ️  A tabela "notas" já existe.');
            process.exit(0);
        }
        
        // Criar sequence
        await pool.query(`
            CREATE SEQUENCE IF NOT EXISTS notas_id_seq
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;
        `);
        
        // Criar tabela
        await pool.query(`
            CREATE TABLE notas (
                id INTEGER NOT NULL DEFAULT nextval('notas_id_seq'::regclass),
                titulo VARCHAR(255) NOT NULL,
                conteudo TEXT NOT NULL,
                tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('nota', 'lembrete')),
                prioridade VARCHAR(10) DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta')),
                data_criacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                data_lembrete TIMESTAMP WITHOUT TIME ZONE,
                concluido BOOLEAN DEFAULT false,
                cor VARCHAR(7) DEFAULT '#6c5ce7',
                user_id INTEGER NOT NULL,
                CONSTRAINT notas_pkey PRIMARY KEY (id),
                CONSTRAINT fk_notas_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        
        // Criar índices
        await pool.query(`
            CREATE INDEX idx_notas_user_id ON notas(user_id);
            CREATE INDEX idx_notas_tipo ON notas(tipo);
            CREATE INDEX idx_notas_data_lembrete ON notas(data_lembrete);
            CREATE INDEX idx_notas_concluido ON notas(concluido);
        `);
        
        console.log('✅ Tabela "notas" criada com sucesso!');
        console.log('📋 Estrutura criada:');
        console.log('   - Tabela notas com campos: id, titulo, conteudo, tipo, prioridade, data_criacao, data_lembrete, concluido, cor, user_id');
        console.log('   - Constraints para tipo e prioridade');
        console.log('   - Chave estrangeira para users');
        console.log('   - Índices para performance');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Erro ao criar tabela de notas:', error.message);
        
        if (error.message.includes('relation "users" does not exist')) {
            console.log('💡 A tabela "users" precisa existir primeiro. Execute a migration principal antes.');
        }
        
        process.exit(1);
    }
}

// Verificar se o script está sendo executado diretamente
if (require.main === module) {
    createNotasTable();
}

module.exports = { createNotasTable }; 