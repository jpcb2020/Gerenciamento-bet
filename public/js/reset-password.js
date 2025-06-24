document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('resetPasswordForm');
    const tokenInput = document.getElementById('token');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const submitBtn = document.getElementById('resetPasswordBtn');
    const spinner = document.getElementById('resetPasswordSpinner');
    const alertContainer = document.getElementById('alert-container');
    
    // Elementos de força da senha
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    // Elementos de requisitos
    const reqLength = document.getElementById('req-length');
    const reqNumber = document.getElementById('req-number');
    const reqLetter = document.getElementById('req-letter');
    
    // Focar no primeiro input se existir
    if (newPasswordInput) {
        newPasswordInput.focus();
    }
    
    // Limpar alertas quando o usuário digitar
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            clearAlerts();
            checkPasswordStrength();
            validatePasswords();
        });
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            clearAlerts();
            validatePasswords();
        });
    }
    
    // Submissão do formulário
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const token = tokenInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            // Validações
            if (!newPassword || !confirmPassword) {
                showAlert('Por favor, preencha todos os campos.', 'danger');
                return;
            }
            
            if (newPassword.length < 6) {
                showAlert('A senha deve ter pelo menos 6 caracteres.', 'danger');
                newPasswordInput.focus();
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showAlert('As senhas não coincidem.', 'danger');
                confirmPasswordInput.focus();
                return;
            }
            
            // Mostrar loading
            setLoading(true);
            
            try {
                const response = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        token: token,
                        newPassword: newPassword
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Mostrar modal de sucesso
                    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
                    successModal.show();
                    
                    // Limpar formulário
                    form.reset();
                } else {
                    showAlert(data.error || 'Erro ao redefinir senha.', 'danger');
                }
                
            } catch (error) {
                console.error('Erro:', error);
                showAlert('Erro de conexão. Tente novamente.', 'danger');
            } finally {
                setLoading(false);
            }
        });
    }
    
    // Função para verificar força da senha
    function checkPasswordStrength() {
        const password = newPasswordInput.value;
        let strength = 0;
        let strengthClass = '';
        let strengthTextValue = '';
        
        // Critérios de força
        if (password.length >= 6) strength += 1;
        if (password.length >= 8) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        
        // Determinar classe e texto
        if (strength <= 2) {
            strengthClass = 'bg-danger';
            strengthTextValue = 'Fraca';
        } else if (strength <= 4) {
            strengthClass = 'bg-warning';
            strengthTextValue = 'Média';
        } else {
            strengthClass = 'bg-success';
            strengthTextValue = 'Forte';
        }
        
        // Atualizar barra de progresso
        const percentage = (strength / 6) * 100;
        strengthBar.style.width = percentage + '%';
        strengthBar.className = `progress-bar ${strengthClass}`;
        strengthText.textContent = password ? strengthTextValue : 'Digite uma senha';
        
        // Atualizar requisitos
        updateRequirement(reqLength, password.length >= 6);
        updateRequirement(reqNumber, /[0-9]/.test(password));
        updateRequirement(reqLetter, /[a-zA-Z]/.test(password));
    }
    
    // Função para atualizar requisitos visuais
    function updateRequirement(element, isValid) {
        const icon = element.querySelector('i');
        if (isValid) {
            icon.className = 'fas fa-check text-success me-1';
        } else {
            icon.className = 'fas fa-times text-danger me-1';
        }
    }
    
    // Função para validar se as senhas coincidem
    function validatePasswords() {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (confirmPassword && newPassword !== confirmPassword) {
            confirmPasswordInput.classList.add('is-invalid');
        } else {
            confirmPasswordInput.classList.remove('is-invalid');
        }
    }
    
    // Função para alternar visibilidade da senha
    window.togglePassword = function(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    };
    
    // Função para mostrar/ocultar loading
    function setLoading(loading) {
        if (loading) {
            submitBtn.disabled = true;
            spinner.classList.remove('d-none');
            submitBtn.querySelector('i.fas').classList.add('d-none');
        } else {
            submitBtn.disabled = false;
            spinner.classList.add('d-none');
            submitBtn.querySelector('i.fas').classList.remove('d-none');
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
    if (form) {
        form.style.opacity = '0';
        form.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            form.style.transition = 'all 0.3s ease';
            form.style.opacity = '1';
            form.style.transform = 'translateY(0)';
        }, 100);
    }
}); 