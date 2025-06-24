document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('forgotPasswordForm');
    const emailInput = document.getElementById('email');
    const submitBtn = document.getElementById('forgotPasswordBtn');
    const spinner = document.getElementById('forgotPasswordSpinner');
    const alertContainer = document.getElementById('alert-container');
    
    // Focar no input de email
    emailInput.focus();
    
    // Limpar alertas quando o usuário digitar
    emailInput.addEventListener('input', function() {
        clearAlerts();
    });
    
    // Submissão do formulário
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        // Validação básica
        if (!email) {
            showAlert('Por favor, digite seu email.', 'danger');
            emailInput.focus();
            return;
        }
        
        if (!isValidEmail(email)) {
            showAlert('Por favor, digite um email válido.', 'danger');
            emailInput.focus();
            return;
        }
        
        // Mostrar loading
        setLoading(true);
        
        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Mostrar modal de sucesso
                const successModal = new bootstrap.Modal(document.getElementById('successModal'));
                successModal.show();
                
                // Limpar formulário
                form.reset();
            } else {
                showAlert(data.error || 'Erro ao enviar email de recuperação.', 'danger');
            }
            
        } catch (error) {
            console.error('Erro:', error);
            showAlert('Erro de conexão. Tente novamente.', 'danger');
        } finally {
            setLoading(false);
        }
    });
    
    // Função para validar email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Função para mostrar/ocultar loading
    function setLoading(loading) {
        if (loading) {
            submitBtn.disabled = true;
            spinner.classList.remove('d-none');
            submitBtn.querySelector('i').classList.add('d-none');
        } else {
            submitBtn.disabled = false;
            spinner.classList.add('d-none');
            submitBtn.querySelector('i').classList.remove('d-none');
        }
    }
    
    // Função para mostrar alertas
    function showAlert(message, type = 'danger') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            <i class="fas fa-${type === 'danger' ? 'exclamation-triangle' : 'check-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        alertContainer.innerHTML = '';
        alertContainer.appendChild(alertDiv);
        
        // Auto-fechar após 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
    
    // Função para limpar alertas
    function clearAlerts() {
        alertContainer.innerHTML = '';
    }
    
    // Adicionar animação ao formulário
    form.style.opacity = '0';
    form.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        form.style.transition = 'all 0.3s ease';
        form.style.opacity = '1';
        form.style.transform = 'translateY(0)';
    }, 100);
}); 