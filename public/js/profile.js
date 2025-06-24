document.addEventListener('DOMContentLoaded', function() {
    const changePasswordForm = document.getElementById('changePasswordForm');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordStrengthEl = document.getElementById('passwordStrength');
    const passwordMatchEl = document.getElementById('passwordMatch');
    const changePasswordBtn = document.getElementById('changePasswordBtn');

    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (targetInput.type === 'password') {
                targetInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                targetInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Password strength checker
    function checkPasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 6,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        // Calculate score
        Object.values(checks).forEach(check => {
            if (check) score++;
        });

        // Determine strength level
        let strength = '';
        let text = '';
        
        if (password.length === 0) {
            strength = '';
            text = 'Digite uma senha';
        } else if (score < 2) {
            strength = 'weak';
            text = 'Muito fraca';
        } else if (score < 3) {
            strength = 'fair';
            text = 'Fraca';
        } else if (score < 4) {
            strength = 'good';
            text = 'Boa';
        } else {
            strength = 'strong';
            text = 'Muito forte';
        }

        return { strength, text, checks };
    }

    // Update password requirements visual feedback
    function updatePasswordRequirements(checks) {
        const requirements = document.querySelectorAll('.password-requirements li');
        const requirements_checks = ['length', 'uppercase', 'lowercase', 'number'];
        
        requirements.forEach((req, index) => {
            const icon = req.querySelector('i');
            const checkKey = requirements_checks[index];
            
            if (checks[checkKey]) {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-check-circle');
                icon.style.color = 'var(--green-color)';
                req.style.color = 'var(--green-color)';
            } else {
                icon.classList.remove('fa-check-circle');
                icon.classList.add('fa-check');
                icon.style.color = 'var(--text-light)';
                req.style.color = 'var(--text-light)';
            }
        });
    }

    // Password strength real-time update
    newPasswordInput.addEventListener('input', function() {
        const password = this.value;
        const result = checkPasswordStrength(password);
        
        // Update strength meter
        passwordStrengthEl.className = 'password-strength';
        if (result.strength) {
            passwordStrengthEl.classList.add(`strength-${result.strength}`);
        }
        
        passwordStrengthEl.querySelector('.strength-text').textContent = result.text;
        
        // Update requirements
        updatePasswordRequirements(result.checks);
        
        // Check password match if confirm field has value
        if (confirmPasswordInput.value) {
            checkPasswordMatch();
        }
    });

    // Password match checker
    function checkPasswordMatch() {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (confirmPassword === '') {
            passwordMatchEl.textContent = '';
            passwordMatchEl.className = 'password-match';
            return;
        }
        
        if (newPassword === confirmPassword) {
            passwordMatchEl.textContent = '✓ Senhas coincidem';
            passwordMatchEl.className = 'password-match match';
        } else {
            passwordMatchEl.textContent = '✗ Senhas não coincidem';
            passwordMatchEl.className = 'password-match no-match';
        }
    }

    // Confirm password real-time validation
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);

    // Form validation
    function validateForm() {
        const currentPassword = currentPasswordInput.value.trim();
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (!currentPassword) {
            showToast('Digite sua senha atual', 'error');
            return false;
        }
        
        if (newPassword.length < 6) {
            showToast('A nova senha deve ter pelo menos 6 caracteres', 'error');
            return false;
        }
        
        if (newPassword !== confirmPassword) {
            showToast('As senhas não coincidem', 'error');
            return false;
        }
        
        if (currentPassword === newPassword) {
            showToast('A nova senha deve ser diferente da atual', 'error');
            return false;
        }
        
        return true;
    }

    // Form submission
    changePasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        const formData = new FormData(this);
        const data = {
            currentPassword: formData.get('currentPassword'),
            newPassword: formData.get('newPassword')
        };
        
        try {
            // Show loading state
            changePasswordBtn.disabled = true;
            changePasswordForm.classList.add('loading');
            
            const response = await fetch('/api/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showToast('Senha alterada com sucesso!', 'success');
                clearForm();
            } else {
                showToast(result.message || 'Erro ao alterar senha', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            showToast('Erro de conexão. Tente novamente.', 'error');
        } finally {
            // Remove loading state
            changePasswordBtn.disabled = false;
            changePasswordForm.classList.remove('loading');
        }
    });

    // Clear form function
    window.clearForm = function() {
        changePasswordForm.reset();
        passwordStrengthEl.className = 'password-strength';
        passwordStrengthEl.querySelector('.strength-text').textContent = 'Digite uma senha';
        passwordMatchEl.textContent = '';
        passwordMatchEl.className = 'password-match';
        
        // Reset requirements
        const requirements = document.querySelectorAll('.password-requirements li');
        requirements.forEach(req => {
            const icon = req.querySelector('i');
            icon.classList.remove('fa-check-circle');
            icon.classList.add('fa-check');
            icon.style.color = 'var(--green-color)';
            req.style.color = 'var(--text-light)';
        });
        
        // Reset password visibility
        document.querySelectorAll('input[type="text"]').forEach(input => {
            if (input.id.includes('Password')) {
                input.type = 'password';
                const button = document.querySelector(`[data-target="${input.id}"]`);
                if (button) {
                    const icon = button.querySelector('i');
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        });
    };

    // Toast notification function (if not already available)
    function showToast(message, type = 'info') {
        // Check if toast-modal.js is loaded and use it, otherwise create simple toast
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            // Simple fallback toast
            const toast = document.createElement('div');
            toast.className = `toast toast--${type} toast--visible`;
            toast.textContent = message;
            
            const container = document.getElementById('toast-container') || document.body;
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('toast--hiding');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, 3000);
        }
    }

    // Focus management
    currentPasswordInput.focus();
}); 