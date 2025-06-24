# 🔐 Setup - Funcionalidade de Recuperação de Senha

Este documento explica como configurar e usar a funcionalidade "Esqueceu a Senha" no BetManager.

## 📋 Pré-requisitos

- Node.js instalado
- PostgreSQL rodando
- Projeto BetManager configurado

## 🚀 Instalação

### 1. Dependências
As dependências já foram instaladas automaticamente:
```bash
npm install nodemailer crypto
```

### 2. Executar Migration do Banco de Dados

Execute o seguinte comando para criar a tabela necessária:

```bash
npm run migration
```

**OU** execute manualmente no PostgreSQL:

```sql
-- Sequence para a tabela password_reset_tokens
CREATE SEQUENCE password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Criar tabela password_reset_tokens
CREATE TABLE password_reset_tokens (
    id integer NOT NULL DEFAULT nextval('password_reset_tokens_id_seq'::regclass),
    user_id integer NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar chave primária
ALTER TABLE ONLY password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);

-- Adicionar constraint de chave estrangeira
ALTER TABLE ONLY password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Criar índices para performance
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
```

### 3. Configurar Variáveis de Ambiente

Atualize seu arquivo `.env` com as seguintes configurações:

```env
# Configurações do PostgreSQL
DB_USER=postgres
DB_HOST=localhost
DB_NAME=gerenciamento_bet
DB_PASSWORD=postgres
DB_PORT=5432

# Configuração do servidor
PORT=3000

# JWT Secret (gere uma chave secreta forte)
JWT_SECRET=sua_chave_secreta_jwt_muito_forte_aqui

# Configurações de Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_de_app_do_gmail
EMAIL_FROM=seu_email@gmail.com

# URL base da aplicação
BASE_URL=http://localhost:3000
```

## 📧 Configuração de Email

### Opção 1: Gmail (Recomendado para desenvolvimento)

1. **Ativar 2FA** na sua conta Google
2. **Gerar Senha de App**:
   - Vá em [myaccount.google.com](https://myaccount.google.com)
   - Segurança → Verificação em duas etapas → Senhas de app
   - Gere uma senha para "Email" ou "Outro"
3. **Configurar .env**:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=seuemail@gmail.com
   EMAIL_PASSWORD=sua_senha_de_app_gerada
   EMAIL_FROM=seuemail@gmail.com
   ```

### Opção 2: SendGrid (Recomendado para produção)

1. Criar conta no [SendGrid](https://sendgrid.com)
2. Gerar API Key
3. Configurar .env:
   ```env
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=apikey
   EMAIL_PASSWORD=sua_api_key_sendgrid
   EMAIL_FROM=seuemail@seudominio.com
   ```

### Opção 3: Outros provedores
- **Mailgun**: smtp.mailgun.org:587
- **Outlook**: smtp-mail.outlook.com:587
- **Yahoo**: smtp.mail.yahoo.com:587

## 🔧 Como Funciona

### Fluxo da Recuperação de Senha:

1. **Usuário clica em "Esqueceu a senha?"** no login
2. **Insere o email** no formulário
3. **Sistema verifica** se o email existe
4. **Gera token único** com expiração de 1 hora
5. **Envia email** com link de recuperação
6. **Usuário clica no link** do email
7. **Define nova senha** no formulário
8. **Token é invalidado** e senha atualizada

### Segurança Implementada:

- ✅ **Tokens únicos** gerados com crypto
- ✅ **Expiração de 1 hora** para tokens
- ✅ **Invalidação automática** de tokens antigos
- ✅ **Não revelação** se email existe (por segurança)
- ✅ **Validação de força** da senha
- ✅ **Hash seguro** da nova senha

## 📱 Páginas Criadas

### `/forgot-password`
- Formulário para solicitar recuperação
- Validação de email em tempo real
- Modal de confirmação

### `/reset-password/:token`
- Formulário para nova senha
- Indicador de força da senha
- Validação de requisitos
- Verificação de token

## 🎨 Funcionalidades

### Frontend:
- **Interface responsiva** com Bootstrap 5
- **Validação em tempo real** de formulários
- **Indicador visual** de força da senha
- **Modais informativos** de sucesso/erro
- **Animações suaves** para melhor UX

### Backend:
- **API RESTful** para operações
- **Validação robusta** de dados
- **Tratamento de erros** adequado
- **Logs detalhados** para debugging

## 🧪 Testando

### 1. Testar Configuração de Email:
```javascript
// Execute no Node.js ou crie um script de teste
const { testEmailConfiguration } = require('./src/config/emailService');
testEmailConfiguration();
```

### 2. Testar Fluxo Completo:
1. Acesse `/login`
2. Clique em "Esqueceu sua senha?"
3. Digite um email válido cadastrado
4. Verifique o email recebido
5. Clique no link e defina nova senha
6. Faça login com a nova senha

## 🐛 Troubleshooting

### Email não está sendo enviado:
1. Verifique as credenciais no `.env`
2. Confirme se a senha de app do Gmail está correta
3. Verifique os logs do console para erros
4. Teste a configuração com o script de teste

### Token inválido ou expirado:
1. Tokens expiram em 1 hora
2. Solicite um novo link se necessário
3. Verifique se não há problemas de fuso horário

### Erro de banco de dados:
1. Confirme se a migration foi executada
2. Verifique se o PostgreSQL está rodando
3. Confirme as credenciais de banco no `.env`

## 📊 Monitoramento

### Logs Importantes:
- ✅ Email de recuperação enviado
- ❌ Erro ao enviar email
- 🔍 Token gerado para usuário
- ✅ Senha redefinida com sucesso

### Tabela de Tokens:
```sql
-- Verificar tokens ativos
SELECT * FROM password_reset_tokens WHERE used = false AND expires_at > NOW();

-- Limpar tokens expirados (opcional - executar periodicamente)
DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = true;
```

## 🚀 Deploy em Produção

### Considerações:
1. **Use HTTPS** obrigatoriamente
2. **Configure domínio** real no BASE_URL
3. **Use serviço de email** profissional (SendGrid, Mailgun)
4. **Configure logs** adequados
5. **Monitore taxa** de emails enviados
6. **Implemente rate limiting** se necessário

---

## 📞 Suporte

Se encontrar problemas, verifique:
1. Logs do console
2. Configurações do `.env`
3. Status do banco de dados
4. Configurações de email

**A funcionalidade está pronta e funcional!** 🎉 