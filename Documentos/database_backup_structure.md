# Backup da Estrutura do Banco de Dados - BetManager

Este documento contém todos os comandos SQL necessários para recriar a estrutura completa do banco de dados PostgreSQL do sistema BetManager.

## 1. Criação das Sequences

```sql
-- Sequence para tabela users
CREATE SEQUENCE users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Sequence para tabela casas_apostas
CREATE SEQUENCE casas_apostas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Sequence para tabela transacoes
CREATE SEQUENCE transacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Sequence para tabela bankrolls
CREATE SEQUENCE bankrolls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Sequence para tabela surebet_entries
CREATE SEQUENCE surebet_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Sequence para tabela surebet_entry_bets
CREATE SEQUENCE surebet_entry_bets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;
```

## 2. Criação das Tabelas

### 2.1 Tabela users

```sql
CREATE TABLE users (
    id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    nome character varying(100) NOT NULL,
    sobrenome character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    data_criacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ultimo_login timestamp without time zone,
    ativo boolean DEFAULT true
);
```

### 2.2 Tabela casas_apostas

```sql
CREATE TABLE casas_apostas (
    id integer NOT NULL DEFAULT nextval('casas_apostas_id_seq'::regclass),
    nome text NOT NULL,
    logo text,
    saldo real DEFAULT 0,
    data_criacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer NOT NULL
);
```

### 2.3 Tabela bankrolls

```sql
CREATE TABLE bankrolls (
    id integer NOT NULL DEFAULT nextval('bankrolls_id_seq'::regclass),
    nome character varying(100) NOT NULL,
    saldo_inicial numeric NOT NULL DEFAULT 0,
    saldo_atual numeric NOT NULL DEFAULT 0,
    categoria character varying(50),
    casa_apostas character varying(100),
    descricao text,
    moeda character varying(10) DEFAULT 'BRL'::character varying,
    publico boolean DEFAULT false,
    data_criacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer NOT NULL
);
```

### 2.4 Tabela transacoes

```sql
CREATE TABLE transacoes (
    id integer NOT NULL DEFAULT nextval('transacoes_id_seq'::regclass),
    casa_id integer,
    tipo text NOT NULL,
    valor real NOT NULL,
    descricao text,
    status text DEFAULT 'completo'::text,
    data timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer NOT NULL
);
```

### 2.5 Tabela surebet_entries

```sql
CREATE TABLE surebet_entries (
    id integer NOT NULL DEFAULT nextval('surebet_entries_id_seq'::regclass),
    bankroll_id integer NOT NULL,
    evento text NOT NULL,
    competicao text,
    data_evento timestamp without time zone,
    retorno_total numeric,
    lucro_total numeric,
    roi_percentual numeric,
    status text DEFAULT 'Pendente'::text,
    observacoes text,
    data_criacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer NOT NULL
);
```

### 2.6 Tabela surebet_entry_bets

```sql
CREATE TABLE surebet_entry_bets (
    id integer NOT NULL DEFAULT nextval('surebet_entry_bets_id_seq'::regclass),
    surebet_entry_id integer NOT NULL,
    casa_apostas text NOT NULL,
    mercado text NOT NULL,
    odds numeric NOT NULL,
    valor_apostado numeric NOT NULL,
    retorno_potencial numeric,
    status_aposta text DEFAULT 'Pendente'::text,
    is_exchange boolean DEFAULT false,
    bet_type text,
    commission numeric DEFAULT 0,
    liability numeric,
    user_id integer NOT NULL
);
```

## 3. Criação das Chaves Primárias

```sql
-- Chave primária da tabela users
ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- Chave primária da tabela casas_apostas
ALTER TABLE ONLY casas_apostas
    ADD CONSTRAINT casas_apostas_pkey PRIMARY KEY (id);

-- Chave primária da tabela bankrolls
ALTER TABLE ONLY bankrolls
    ADD CONSTRAINT bankrolls_pkey PRIMARY KEY (id);

-- Chave primária da tabela transacoes
ALTER TABLE ONLY transacoes
    ADD CONSTRAINT transacoes_pkey PRIMARY KEY (id);

-- Chave primária da tabela surebet_entries
ALTER TABLE ONLY surebet_entries
    ADD CONSTRAINT surebet_entries_pkey PRIMARY KEY (id);

-- Chave primária da tabela surebet_entry_bets
ALTER TABLE ONLY surebet_entry_bets
    ADD CONSTRAINT surebet_entry_bets_pkey PRIMARY KEY (id);
```

## 4. Criação das Constraints Únicas

```sql
-- Email único na tabela users
ALTER TABLE ONLY users
    ADD CONSTRAINT users_email_key UNIQUE (email);
```

## 5. Criação das Chaves Estrangeiras

```sql
-- Chave estrangeira: casas_apostas -> users
ALTER TABLE ONLY casas_apostas
    ADD CONSTRAINT fk_casas_apostas_user FOREIGN KEY (user_id) REFERENCES users(id);

-- Chave estrangeira: bankrolls -> users
ALTER TABLE ONLY bankrolls
    ADD CONSTRAINT fk_bankrolls_user FOREIGN KEY (user_id) REFERENCES users(id);

-- Chave estrangeira: transacoes -> users
ALTER TABLE ONLY transacoes
    ADD CONSTRAINT fk_transacoes_user FOREIGN KEY (user_id) REFERENCES users(id);

-- Chave estrangeira: transacoes -> casas_apostas
ALTER TABLE ONLY transacoes
    ADD CONSTRAINT transacoes_casa_id_fkey FOREIGN KEY (casa_id) REFERENCES casas_apostas(id);

-- Chave estrangeira: surebet_entries -> users
ALTER TABLE ONLY surebet_entries
    ADD CONSTRAINT fk_surebet_entries_user FOREIGN KEY (user_id) REFERENCES users(id);

-- Chave estrangeira: surebet_entries -> bankrolls
ALTER TABLE ONLY surebet_entries
    ADD CONSTRAINT surebet_entries_bankroll_id_fkey FOREIGN KEY (bankroll_id) REFERENCES bankrolls(id);

-- Chave estrangeira: surebet_entry_bets -> users
ALTER TABLE ONLY surebet_entry_bets
    ADD CONSTRAINT fk_surebet_entry_bets_user FOREIGN KEY (user_id) REFERENCES users(id);

-- Chave estrangeira: surebet_entry_bets -> surebet_entries
ALTER TABLE ONLY surebet_entry_bets
    ADD CONSTRAINT surebet_entry_bets_surebet_entry_id_fkey FOREIGN KEY (surebet_entry_id) REFERENCES surebet_entries(id);
```

## 6. Associação das Sequences às Tabelas

```sql
-- Associar sequences às colunas
ALTER SEQUENCE users_id_seq OWNED BY users.id;
ALTER SEQUENCE casas_apostas_id_seq OWNED BY casas_apostas.id;
ALTER SEQUENCE transacoes_id_seq OWNED BY transacoes.id;
ALTER SEQUENCE bankrolls_id_seq OWNED BY bankrolls.id;
ALTER SEQUENCE surebet_entries_id_seq OWNED BY surebet_entries.id;
ALTER SEQUENCE surebet_entry_bets_id_seq OWNED BY surebet_entry_bets.id;
```

## 7. Índices Adicionais

Os índices das chaves primárias e únicas são criados automaticamente. Caso seja necessário criar índices adicionais para performance:

```sql
-- Exemplo de índices para melhorar performance (opcional)
-- CREATE INDEX idx_casas_apostas_user_id ON casas_apostas(user_id);
-- CREATE INDEX idx_transacoes_user_id ON transacoes(user_id);
-- CREATE INDEX idx_transacoes_casa_id ON transacoes(casa_id);
-- CREATE INDEX idx_bankrolls_user_id ON bankrolls(user_id);
-- CREATE INDEX idx_surebet_entries_user_id ON surebet_entries(user_id);
-- CREATE INDEX idx_surebet_entries_bankroll_id ON surebet_entries(bankroll_id);
-- CREATE INDEX idx_surebet_entry_bets_user_id ON surebet_entry_bets(user_id);
-- CREATE INDEX idx_surebet_entry_bets_entry_id ON surebet_entry_bets(surebet_entry_id);
```

## 8. Script Completo para Execução

Para executar todo o backup de uma vez, execute os comandos na seguinte ordem:

1. Criação das sequences
2. Criação das tabelas
3. Criação das chaves primárias
4. Criação das constraints únicas
5. Criação das chaves estrangeiras
6. Associação das sequences às tabelas

## 9. Informações Adicionais

### Estrutura do Banco:
- **6 tabelas principais**: users, casas_apostas, bankrolls, transacoes, surebet_entries, surebet_entry_bets
- **6 sequences**: Uma para cada tabela com campo ID auto-incremento
- **8 chaves estrangeiras**: Garantindo integridade referencial
- **1 constraint única**: Email único para usuários
- **0 funções/procedures**: Não há funções ou procedures customizadas
- **0 triggers**: Não há triggers configurados

### Observações:
- Todas as tabelas (exceto users) possuem campo `user_id` para isolamento de dados por usuário
- Campos de data utilizam `timestamp without time zone` com default `CURRENT_TIMESTAMP`
- Campos monetários utilizam tipos `numeric` ou `real` dependendo da precisão necessária
- Sistema preparado para multi-tenancy com isolamento por usuário

---

**Data de criação do backup:** $(date)
**Versão do PostgreSQL:** Compatível com PostgreSQL 12+
**Sistema:** BetManager - Gerenciamento de Apostas Esportivas