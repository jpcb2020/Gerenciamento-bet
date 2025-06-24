document.addEventListener('DOMContentLoaded', function() {
    const userProfile = document.getElementById('userProfile');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    // Toggle dropdown on profile click
    if (userProfile && userDropdown) {
        userProfile.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
            
            // Rotate the chevron icon
            const chevron = userProfile.querySelector('.fa-chevron-down');
            if (chevron) {
                chevron.style.transform = userDropdown.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!userProfile.contains(e.target)) {
                userDropdown.classList.remove('active');
                const chevron = userProfile.querySelector('.fa-chevron-down');
                if (chevron) {
                    chevron.style.transform = 'rotate(0deg)';
                }
            }
        });

        // Prevent dropdown from closing when clicking inside it
        userDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Handle logout button click
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            // Show confirmation dialog
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
                        
                        // Marcar que o usuário acabou de fazer logout
                        sessionStorage.setItem('justLoggedOut', 'true');
                        
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

    // Add smooth transitions for chevron
    const chevron = document.querySelector('#userProfile .fa-chevron-down');
    if (chevron) {
        chevron.style.transition = 'transform 0.3s ease';
    }
}); 