require('dotenv').config();
const { testEmailConfiguration, sendPasswordResetEmail } = require('../src/config/emailService');

async function testEmail() {
    console.log('🧪 Testando configuração de email...\n');
    
    // Verificar variáveis de ambiente
    console.log('📋 Verificando variáveis de ambiente:');
    console.log(`   EMAIL_HOST: ${process.env.EMAIL_HOST || '❌ Não definido'}`);
    console.log(`   EMAIL_PORT: ${process.env.EMAIL_PORT || '❌ Não definido'}`);
    console.log(`   EMAIL_USER: ${process.env.EMAIL_USER || '❌ Não definido'}`);
    console.log(`   EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '✅ Definido' : '❌ Não definido'}`);
    console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || '❌ Não definido'}`);
    console.log(`   BASE_URL: ${process.env.BASE_URL || '❌ Não definido (usando padrão)'}`);
    
    console.log('\n🔌 Testando conexão com servidor de email...');
    
    try {
        const isConfigValid = await testEmailConfiguration();
        
        if (isConfigValid) {
            console.log('\n✅ Configuração de email está funcionando!');
            
            // Perguntar se quer enviar um email de teste
            console.log('\n📧 Quer enviar um email de teste? (Digite um email ou pressione Enter para pular)');
            
            // Para teste automático, você pode descomentar as linhas abaixo e definir um email
            /*
            const testEmailAddress = 'seu-email-de-teste@gmail.com';
            if (testEmailAddress) {
                console.log(`\n📤 Enviando email de teste para: ${testEmailAddress}`);
                
                const result = await sendPasswordResetEmail(
                    testEmailAddress,
                    'token-de-teste-123',
                    'Usuário Teste'
                );
                
                if (result.success) {
                    console.log('✅ Email de teste enviado com sucesso!');
                    console.log(`📨 ID da mensagem: ${result.messageId}`);
                } else {
                    console.log('❌ Erro ao enviar email de teste:', result.error);
                }
            }
            */
            
        } else {
            console.log('\n❌ Configuração de email tem problemas.');
            console.log('\n💡 Dicas para resolver:');
            console.log('   1. Verifique se todas as variáveis estão no arquivo .env');
            console.log('   2. Para Gmail, certifique-se de usar senha de app, não a senha normal');
            console.log('   3. Verifique se a autenticação de 2 fatores está ativada no Gmail');
            console.log('   4. Confirme se o host e porta estão corretos');
        }
        
    } catch (error) {
        console.log('\n❌ Erro ao testar configuração:', error.message);
        
        if (error.message.includes('not defined')) {
            console.log('\n🔧 Ação necessária: Configure as variáveis de ambiente no arquivo .env');
        }
    }
    
    console.log('\n🏁 Teste finalizado.');
}

// Executar se for chamado diretamente
if (require.main === module) {
    testEmail().catch(console.error);
}

module.exports = { testEmail }; 