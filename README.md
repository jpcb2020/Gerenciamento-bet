# Sistema de Gerenciamento de Casas de Apostas

Este é um sistema para gerenciar casas de apostas, permitindo o controle de saldo e transações.

## Requisitos

- Node.js
- PostgreSQL

## Configuração do PostgreSQL

Antes de executar a aplicação, é necessário configurar o banco de dados PostgreSQL:

1. Instale o PostgreSQL em sua máquina caso ainda não tenha:
   - Download: [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
   - Durante a instalação, defina a senha para o usuário postgres

2. Crie o banco de dados:
   - Abra o pgAdmin (interface gráfica que vem com o PostgreSQL)
   - Conecte ao servidor PostgreSQL
   - Crie um novo banco de dados chamado `gerenciamento_bet`

   Ou, se preferir usar o terminal:
   ```
   psql -U postgres -c "CREATE DATABASE gerenciamento_bet;"
   ```

3. Configure as variáveis de ambiente:
   - Renomeie o arquivo `env.example` para `.env`
   - Edite o arquivo `.env` e atualize com suas credenciais:
   ```
   # Configurações do PostgreSQL
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=gerenciamento_bet
   DB_PASSWORD=suasenha
   DB_PORT=5432
   
   # Configuração do servidor
   PORT=3000
   ```

## Instalação

1. Clone o repositório
2. Instale as dependências:
   ```
   npm install
   ```

## Execução

1. Inicie o servidor:
   ```
   npm start
   ```
2. Acesse a aplicação em seu navegador: http://localhost:3000

## Migração do SQLite para PostgreSQL

Este projeto foi migrado do SQLite para o PostgreSQL. As principais mudanças incluem:

- Substituição da biblioteca sqlite3 por pg
- Atualização das consultas SQL para o formato do PostgreSQL
- Implementação de conexões de pool
- Conversão das funções de callback para async/await
- Substituição de AUTOINCREMENT por SERIAL
- Alteração de DATETIME para TIMESTAMP
- Adição de variáveis de ambiente para configuração 