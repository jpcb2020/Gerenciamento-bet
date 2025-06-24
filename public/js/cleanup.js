// Script de limpeza para remover dados salvos de forma insegura
(function() {
    'use strict';
    
    // Função para limpar dados inseguros salvos anteriormente
    function cleanupInsecureData() {
        try {
            // Lista de chaves que devem ser removidas por segurança (exceto rememberedPassword que agora é válido)
            const insecureKeys = [
                'userPassword',        // Outros possíveis nomes de senha
                'password',            // Senha genérica
                'credentials',         // Credenciais completas
                'authData'             // Dados de autenticação
            ];
            
            // Remover chaves inseguras do localStorage (mas manter rememberedPassword se estiver codificado)
            insecureKeys.forEach(key => {
                if (localStorage.getItem(key)) {
                    console.log(`🔒 Removendo dados inseguros: ${key}`);
                    localStorage.removeItem(key);
                }
            });
            
            // Verificar se rememberedPassword existe e está em formato válido (base64)
            const rememberedPassword = localStorage.getItem('rememberedPassword');
            if (rememberedPassword) {
                try {
                    // Tentar decodificar para verificar se é base64 válido
                    atob(rememberedPassword);
                } catch (error) {
                    console.log('🔒 Removendo senha em formato inválido');
                    localStorage.removeItem('rememberedPassword');
                }
            }
            
            // Verificar se há dados corrompidos ou expirados
            const rememberLogin = localStorage.getItem('rememberLogin');
            const rememberedEmail = localStorage.getItem('rememberedEmail');
            
            // Se há dados de "lembrar login" mas sem email válido, limpar tudo
            if (rememberLogin === 'true' && (!rememberedEmail || !isValidEmail(rememberedEmail))) {
                console.log('🧹 Limpando dados corrompidos de login');
                localStorage.removeItem('rememberLogin');
                localStorage.removeItem('rememberedEmail');
            }
            
        } catch (error) {
            console.error('Erro durante limpeza de dados:', error);
        }
    }
    
    // Função para validar email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Executar limpeza quando a página carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', cleanupInsecureData);
    } else {
        cleanupInsecureData();
    }
    
    // Função para limpar tudo em caso de emergência (para debug)
    window.clearAllLoginData = function() {
        localStorage.clear();
        sessionStorage.clear();
        console.log('🗑️ Todos os dados locais foram limpos');
        alert('Todos os dados salvos foram limpos. Recarregue a página.');
    };
    
})(); 