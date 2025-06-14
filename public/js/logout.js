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