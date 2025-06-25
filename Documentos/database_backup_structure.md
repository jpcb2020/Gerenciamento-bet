# Backup da Estrutura do Banco de Dados - Gerenciamento Bet

## Informações Gerais
- **Sistema**: PostgreSQL
- **Schema**: public
- **Data do Backup**: $(date '+%Y-%m-%d %H:%M:%S')
- **Tabelas**: 8 tabelas principais
- **Sequences**: 8 sequences
- **Status das Sequences**: Último valor registrado em cada sequence

## Estrutura Completa do Banco de Dados

### 1. Criação das Sequences

```sql
-- Sequence para tabela users
CREATE SEQUENCE IF NOT EXISTS users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Sequence para tabela bankrolls
CREATE SEQUENCE IF NOT EXISTS bankrolls_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Sequence para tabela casas_apostas
CREATE SEQUENCE IF NOT EXISTS casas_apostas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Sequence para tabela password_reset_tokens
CREATE SEQUENCE IF NOT EXISTS password_reset_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Sequence para tabela surebet_entries
CREATE SEQUENCE IF NOT EXISTS surebet_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Sequence para tabela surebet_entry_bets
CREATE SEQUENCE IF NOT EXISTS surebet_entry_bets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Sequence para tabela transacoes
CREATE SEQUENCE IF NOT EXISTS transacoes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Sequence para tabela user_bonus
CREATE SEQUENCE IF NOT EXISTS user_bonus_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
```

### 2. Criação das Tabelas

#### 2.1 Tabela `users` (Base do sistema)
```sql
CREATE TABLE users (
    id INTEGER NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    nome VARCHAR(100) NOT NULL,
    sobrenome VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    data_criacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP WITHOUT TIME ZONE,
    ativo BOOLEAN DEFAULT true,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);
```

#### 2.2 Tabela `casas_apostas`
```sql
CREATE TABLE casas_apostas (
    id INTEGER NOT NULL DEFAULT nextval('casas_apostas_id_seq'::regclass),
    nome TEXT NOT NULL,
    logo TEXT,
    saldo REAL DEFAULT 0,
    data_criacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL,
    CONSTRAINT casas_apostas_pkey PRIMARY KEY (id),
    CONSTRAINT fk_casas_apostas_user FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 2.3 Tabela `bankrolls`
```sql
CREATE TABLE bankrolls (
    id INTEGER NOT NULL DEFAULT nextval('bankrolls_id_seq'::regclass),
    nome VARCHAR(100) NOT NULL,
    saldo_inicial NUMERIC NOT NULL DEFAULT 0,
    saldo_atual NUMERIC NOT NULL DEFAULT 0,
    categoria VARCHAR(50),
    casa_apostas VARCHAR(100),
    descricao TEXT,
    moeda VARCHAR(10) DEFAULT 'BRL'::character varying,
    publico BOOLEAN DEFAULT false,
    data_criacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL,
    CONSTRAINT bankrolls_pkey PRIMARY KEY (id),
    CONSTRAINT fk_bankrolls_user FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 2.4 Tabela `surebet_entries`
```sql
CREATE TABLE surebet_entries (
    id INTEGER NOT NULL DEFAULT nextval('surebet_entries_id_seq'::regclass),
    bankroll_id INTEGER NOT NULL,
    evento TEXT NOT NULL,
    competicao TEXT,
    data_evento TIMESTAMP WITHOUT TIME ZONE,
    retorno_total NUMERIC,
    lucro_total NUMERIC,
    roi_percentual NUMERIC,
    status TEXT DEFAULT 'Pendente'::text,
    observacoes TEXT,
    data_criacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL,
    bonus BOOLEAN DEFAULT false,
    bonus_value NUMERIC DEFAULT NULL::numeric,
    bonus_house TEXT,
    bonus_expiry_date DATE,
    used_bonus_id INTEGER,
    used_bonus_value NUMERIC,
    used_bonus_house TEXT,
    CONSTRAINT surebet_entries_pkey PRIMARY KEY (id),
    CONSTRAINT surebet_entries_bankroll_id_fkey FOREIGN KEY (bankroll_id) REFERENCES bankrolls(id),
    CONSTRAINT fk_surebet_entries_user FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 2.5 Tabela `surebet_entry_bets`
```sql
CREATE TABLE surebet_entry_bets (
    id INTEGER NOT NULL DEFAULT nextval('surebet_entry_bets_id_seq'::regclass),
    surebet_entry_id INTEGER NOT NULL,
    casa_apostas TEXT NOT NULL,
    mercado TEXT NOT NULL,
    odds NUMERIC NOT NULL,
    valor_apostado NUMERIC NOT NULL,
    retorno_potencial NUMERIC,
    status_aposta TEXT DEFAULT 'Pendente'::text,
    is_exchange BOOLEAN DEFAULT false,
    bet_type TEXT,
    commission NUMERIC DEFAULT 0,
    liability NUMERIC,
    user_id INTEGER NOT NULL,
    CONSTRAINT surebet_entry_bets_pkey PRIMARY KEY (id),
    CONSTRAINT surebet_entry_bets_surebet_entry_id_fkey FOREIGN KEY (surebet_entry_id) REFERENCES surebet_entries(id),
    CONSTRAINT fk_surebet_entry_bets_user FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 2.6 Tabela `transacoes`
```sql
CREATE TABLE transacoes (
    id INTEGER NOT NULL DEFAULT nextval('transacoes_id_seq'::regclass),
    casa_id INTEGER,
    tipo TEXT NOT NULL,
    valor REAL NOT NULL,
    descricao TEXT,
    status TEXT DEFAULT 'completo'::text,
    data TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL,
    CONSTRAINT transacoes_pkey PRIMARY KEY (id),
    CONSTRAINT transacoes_casa_id_fkey FOREIGN KEY (casa_id) REFERENCES casas_apostas(id),
    CONSTRAINT fk_transacoes_user FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 2.7 Tabela `user_bonus`
```sql
CREATE TABLE user_bonus (
    id INTEGER NOT NULL DEFAULT nextval('user_bonus_id_seq'::regclass),
    user_id INTEGER NOT NULL,
    bonus_value NUMERIC NOT NULL,
    bonus_house TEXT NOT NULL,
    bonus_expiry_date DATE NOT NULL,
    status TEXT DEFAULT 'Ativo'::text,
    data_criacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_utilizacao TIMESTAMP WITHOUT TIME ZONE,
    surebet_entry_id INTEGER,
    CONSTRAINT user_bonus_pkey PRIMARY KEY (id),
    CONSTRAINT user_bonus_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT user_bonus_surebet_entry_id_fkey FOREIGN KEY (surebet_entry_id) REFERENCES surebet_entries(id)
);
```

#### 2.8 Tabela `password_reset_tokens`
```sql
CREATE TABLE password_reset_tokens (
    id INTEGER NOT NULL DEFAULT nextval('password_reset_tokens_id_seq'::regclass),
    user_id INTEGER NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 3. Criação dos Índices

```sql
-- Índices para password_reset_tokens
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens USING btree (expires_at);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens USING btree (token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens USING btree (user_id);

-- Índices para user_bonus
CREATE INDEX idx_user_bonus_expiry ON user_bonus USING btree (bonus_expiry_date);
CREATE INDEX idx_user_bonus_status ON user_bonus USING btree (status);
CREATE INDEX idx_user_bonus_user_id ON user_bonus USING btree (user_id);
```

### 4. Script Completo de Recriação

```sql
-- ========================================
-- SCRIPT COMPLETO DE RECRIAÇÃO DO BANCO
-- ========================================

-- Remover tabelas existentes (se necessário)
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS user_bonus CASCADE;
DROP TABLE IF EXISTS transacoes CASCADE;
DROP TABLE IF EXISTS surebet_entry_bets CASCADE;
DROP TABLE IF EXISTS surebet_entries CASCADE;
DROP TABLE IF EXISTS bankrolls CASCADE;
DROP TABLE IF EXISTS casas_apostas CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Remover sequences existentes (se necessário)
DROP SEQUENCE IF EXISTS users_id_seq CASCADE;
DROP SEQUENCE IF EXISTS bankrolls_id_seq CASCADE;
DROP SEQUENCE IF EXISTS casas_apostas_id_seq CASCADE;
DROP SEQUENCE IF EXISTS password_reset_tokens_id_seq CASCADE;
DROP SEQUENCE IF EXISTS surebet_entries_id_seq CASCADE;
DROP SEQUENCE IF EXISTS surebet_entry_bets_id_seq CASCADE;
DROP SEQUENCE IF EXISTS transacoes_id_seq CASCADE;
DROP SEQUENCE IF EXISTS user_bonus_id_seq CASCADE;

-- Criar sequences
CREATE SEQUENCE users_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE bankrolls_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE casas_apostas_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE password_reset_tokens_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE surebet_entries_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE surebet_entry_bets_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE transacoes_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE user_bonus_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

-- Criar tabela users (base do sistema)
CREATE TABLE users (
    id INTEGER NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    nome VARCHAR(100) NOT NULL,
    sobrenome VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    data_criacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP WITHOUT TIME ZONE,
    ativo BOOLEAN DEFAULT true,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

-- Criar tabela casas_apostas
CREATE TABLE casas_apostas (
    id INTEGER NOT NULL DEFAULT nextval('casas_apostas_id_seq'::regclass),
    nome TEXT NOT NULL,
    logo TEXT,
    saldo REAL DEFAULT 0,
    data_criacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL,
    CONSTRAINT casas_apostas_pkey PRIMARY KEY (id),
    CONSTRAINT fk_casas_apostas_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Criar tabela bankrolls
CREATE TABLE bankrolls (
    id INTEGER NOT NULL DEFAULT nextval('bankrolls_id_seq'::regclass),
    nome VARCHAR(100) NOT NULL,
    saldo_inicial NUMERIC NOT NULL DEFAULT 0,
    saldo_atual NUMERIC NOT NULL DEFAULT 0,
    categoria VARCHAR(50),
    casa_apostas VARCHAR(100),
    descricao TEXT,
    moeda VARCHAR(10) DEFAULT 'BRL'::character varying,
    publico BOOLEAN DEFAULT false,
    data_criacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL,
    CONSTRAINT bankrolls_pkey PRIMARY KEY (id),
    CONSTRAINT fk_bankrolls_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Criar tabela surebet_entries
CREATE TABLE surebet_entries (
    id INTEGER NOT NULL DEFAULT nextval('surebet_entries_id_seq'::regclass),
    bankroll_id INTEGER NOT NULL,
    evento TEXT NOT NULL,
    competicao TEXT,
    data_evento TIMESTAMP WITHOUT TIME ZONE,
    retorno_total NUMERIC,
    lucro_total NUMERIC,
    roi_percentual NUMERIC,
    status TEXT DEFAULT 'Pendente'::text,
    observacoes TEXT,
    data_criacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL,
    bonus BOOLEAN DEFAULT false,
    bonus_value NUMERIC DEFAULT NULL::numeric,
    bonus_house TEXT,
    bonus_expiry_date DATE,
    used_bonus_id INTEGER,
    used_bonus_value NUMERIC,
    used_bonus_house TEXT,
    CONSTRAINT surebet_entries_pkey PRIMARY KEY (id),
    CONSTRAINT surebet_entries_bankroll_id_fkey FOREIGN KEY (bankroll_id) REFERENCES bankrolls(id),
    CONSTRAINT fk_surebet_entries_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Criar tabela surebet_entry_bets
CREATE TABLE surebet_entry_bets (
    id INTEGER NOT NULL DEFAULT nextval('surebet_entry_bets_id_seq'::regclass),
    surebet_entry_id INTEGER NOT NULL,
    casa_apostas TEXT NOT NULL,
    mercado TEXT NOT NULL,
    odds NUMERIC NOT NULL,
    valor_apostado NUMERIC NOT NULL,
    retorno_potencial NUMERIC,
    status_aposta TEXT DEFAULT 'Pendente'::text,
    is_exchange BOOLEAN DEFAULT false,
    bet_type TEXT,
    commission NUMERIC DEFAULT 0,
    liability NUMERIC,
    user_id INTEGER NOT NULL,
    CONSTRAINT surebet_entry_bets_pkey PRIMARY KEY (id),
    CONSTRAINT surebet_entry_bets_surebet_entry_id_fkey FOREIGN KEY (surebet_entry_id) REFERENCES surebet_entries(id),
    CONSTRAINT fk_surebet_entry_bets_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Criar tabela transacoes
CREATE TABLE transacoes (
    id INTEGER NOT NULL DEFAULT nextval('transacoes_id_seq'::regclass),
    casa_id INTEGER,
    tipo TEXT NOT NULL,
    valor REAL NOT NULL,
    descricao TEXT,
    status TEXT DEFAULT 'completo'::text,
    data TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL,
    CONSTRAINT transacoes_pkey PRIMARY KEY (id),
    CONSTRAINT transacoes_casa_id_fkey FOREIGN KEY (casa_id) REFERENCES casas_apostas(id),
    CONSTRAINT fk_transacoes_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Criar tabela user_bonus
CREATE TABLE user_bonus (
    id INTEGER NOT NULL DEFAULT nextval('user_bonus_id_seq'::regclass),
    user_id INTEGER NOT NULL,
    bonus_value NUMERIC NOT NULL,
    bonus_house TEXT NOT NULL,
    bonus_expiry_date DATE NOT NULL,
    status TEXT DEFAULT 'Ativo'::text,
    data_criacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_utilizacao TIMESTAMP WITHOUT TIME ZONE,
    surebet_entry_id INTEGER,
    CONSTRAINT user_bonus_pkey PRIMARY KEY (id),
    CONSTRAINT user_bonus_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT user_bonus_surebet_entry_id_fkey FOREIGN KEY (surebet_entry_id) REFERENCES surebet_entries(id)
);

-- Criar tabela password_reset_tokens
CREATE TABLE password_reset_tokens (
    id INTEGER NOT NULL DEFAULT nextval('password_reset_tokens_id_seq'::regclass),
    user_id INTEGER NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Criar índices
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens USING btree (expires_at);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens USING btree (token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens USING btree (user_id);
CREATE INDEX idx_user_bonus_expiry ON user_bonus USING btree (bonus_expiry_date);
CREATE INDEX idx_user_bonus_status ON user_bonus USING btree (status);
CREATE INDEX idx_user_bonus_user_id ON user_bonus USING btree (user_id);

-- Ajustar owners das sequences
ALTER SEQUENCE users_id_seq OWNED BY users.id;
ALTER SEQUENCE bankrolls_id_seq OWNED BY bankrolls.id;
ALTER SEQUENCE casas_apostas_id_seq OWNED BY casas_apostas.id;
ALTER SEQUENCE password_reset_tokens_id_seq OWNED BY password_reset_tokens.id;
ALTER SEQUENCE surebet_entries_id_seq OWNED BY surebet_entries.id;
ALTER SEQUENCE surebet_entry_bets_id_seq OWNED BY surebet_entry_bets.id;
ALTER SEQUENCE transacoes_id_seq OWNED BY transacoes.id;
ALTER SEQUENCE user_bonus_id_seq OWNED BY user_bonus.id;
```

### 5. Comandos para Backup e Restore usando pg_dump/pg_restore

#### 5.1 Backup apenas da estrutura
```bash
# Backup apenas da estrutura (schema)
pg_dump -h localhost -U postgres -d gerenciamento_bet --schema-only > backup_estrutura.sql

# Backup da estrutura específica das tabelas
pg_dump -h localhost -U postgres -d gerenciamento_bet -t users -t casas_apostas -t bankrolls -t surebet_entries -t surebet_entry_bets -t transacoes -t user_bonus -t password_reset_tokens --schema-only > backup_tabelas.sql
```

#### 5.2 Backup completo (estrutura + dados)
```bash
# Backup completo
pg_dump -h localhost -U postgres -d gerenciamento_bet > backup_completo.sql

# Backup completo em formato custom (comprimido)
pg_dump -h localhost -U postgres -d gerenciamento_bet -Fc > backup_completo.backup
```

#### 5.3 Restore do banco
```bash
# Restore a partir de arquivo SQL
psql -h localhost -U postgres -d gerenciamento_bet < backup_estrutura.sql

# Restore a partir de backup custom
pg_restore -h localhost -U postgres -d gerenciamento_bet backup_completo.backup

# Criar banco e fazer restore completo
createdb -h localhost -U postgres gerenciamento_bet_novo
psql -h localhost -U postgres -d gerenciamento_bet_novo < backup_completo.sql
```

### 6. Relacionamentos entre Tabelas

```
users (1) -----> (N) casas_apostas
  |
  └-----> (N) bankrolls
  |
  └-----> (N) surebet_entries
  |
  └-----> (N) surebet_entry_bets
  |
  └-----> (N) transacoes
  |
  └-----> (N) user_bonus
  |
  └-----> (N) password_reset_tokens

bankrolls (1) -----> (N) surebet_entries

surebet_entries (1) -----> (N) surebet_entry_bets
                |
                └-----> (N) user_bonus

casas_apostas (1) -----> (N) transacoes
```

### 7. Informações sobre Sequences (último backup)

```sql
-- Valores atuais das sequences (na data do backup)
-- users_id_seq: último valor = 4
SELECT setval('users_id_seq', 4);

-- bankrolls_id_seq: último valor = 18
SELECT setval('bankrolls_id_seq', 18);

-- casas_apostas_id_seq: último valor = 116
SELECT setval('casas_apostas_id_seq', 116);

-- password_reset_tokens_id_seq: último valor = 3
SELECT setval('password_reset_tokens_id_seq', 3);

-- surebet_entries_id_seq: último valor = 79
SELECT setval('surebet_entries_id_seq', 79);

-- surebet_entry_bets_id_seq: último valor = 167
SELECT setval('surebet_entry_bets_id_seq', 167);

-- transacoes_id_seq: último valor = 80
SELECT setval('transacoes_id_seq', 80);

-- user_bonus_id_seq: último valor = 18
SELECT setval('user_bonus_id_seq', 18);
```

### 8. Comandos de Verificação da Estrutura

```sql
-- Verificar todas as tabelas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Verificar estrutura de uma tabela específica
\d users;
\d casas_apostas;
\d bankrolls;
\d surebet_entries;
\d surebet_entry_bets;
\d transacoes;
\d user_bonus;
\d password_reset_tokens;

-- Verificar foreign keys
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- Verificar índices
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Verificar sequences
SELECT sequencename, last_value, start_value, increment_by 
FROM pg_sequences 
WHERE schemaname = 'public' 
ORDER BY sequencename;
```

---

## Instruções de Uso

### Para recriar o banco completamente:
1. Execute o "Script Completo de Recriação" da seção 4
2. Se necessário, ajuste os valores das sequences usando os comandos da seção 7
3. Verifique a estrutura usando os comandos da seção 8

### Para fazer backup periódico:
1. Use os comandos da seção 5.1 para backup da estrutura
2. Use os comandos da seção 5.2 para backup completo
3. Atualize os valores das sequences na seção 7

### Para restaurar:
1. Use os comandos da seção 5.3 conforme sua necessidade
2. Execute os comandos de verificação da seção 8 para validar

### Comandos rápidos para uso diário:

```bash
# Backup rápido da estrutura
pg_dump -h localhost -U postgres -d gerenciamento_bet --schema-only > "backup_estrutura_$(date +%Y%m%d_%H%M%S).sql"

# Backup completo
pg_dump -h localhost -U postgres -d gerenciamento_bet > "backup_completo_$(date +%Y%m%d_%H%M%S).sql"

# Restaurar estrutura
psql -h localhost -U postgres -d nome_novo_banco < backup_estrutura.sql
```

---

**Última atualização**: $(date '+%Y-%m-%d %H:%M:%S')
**Responsável**: Sistema automatizado de backup
**Fonte**: Consultado via MCP PostgreSQL