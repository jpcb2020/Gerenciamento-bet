// Funcionalidade de logout
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout-btn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            if (confirm('Tem certeza que deseja sair?')) {
                try {
                    const response = await fetch('/api/logout', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        // Limpar TODOS os dados salvos localmente
                        localStorage.removeItem('rememberedEmail');
                        localStorage.removeItem('rememberedPassword');
                        localStorage.removeItem('rememberLogin');
                        localStorage.removeItem('rememberTimestamp');
                        
                        // Limpar qualquer cache de sessão
                        sessionStorage.clear();
                        
                        // Marcar que o usuário acabou de fazer logout (depois de limpar)
                        sessionStorage.setItem('justLoggedOut', 'true');
                        
                        // Mostrar mensagem de confirmação
                        console.log('🔓 Logout realizado - todos os dados limpos');
                        
                        // Redirecionar para a página de login
                        window.location.href = '/login';
                    } else {
                        alert('Erro ao fazer logout. Tente novamente.');
                    }
                } catch (error) {
                    console.error('Erro:', error);
                    alert('Erro de conexão. Tente novamente.');
                }
            }
        });
    }
});