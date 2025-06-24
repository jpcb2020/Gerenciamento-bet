// Login Page JavaScript

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Show alert messages
function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
}

// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const loginBtn = document.getElementById('loginBtn');
    const loginSpinner = document.getElementById('loginSpinner');
    const formData = new FormData(e.target);
    
    // Show loading state
    loginBtn.disabled = true;
    loginSpinner.classList.remove('d-none');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save credentials if "Remember me" is checked
            const rememberMe = document.getElementById('rememberMe').checked;
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', formData.get('email'));
                localStorage.setItem('rememberedPassword', btoa(formData.get('password'))); // Base64 encode
                localStorage.setItem('rememberLogin', 'true');
                localStorage.setItem('rememberTimestamp', Date.now().toString()); // Timestamp para expiração
            } else {
                localStorage.removeItem('rememberedEmail');
                localStorage.removeItem('rememberedPassword');
                localStorage.removeItem('rememberLogin');
                localStorage.removeItem('rememberTimestamp');
            }
            
            showAlert('Login realizado com sucesso! Redirecionando...', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } else {
            showAlert(data.error || 'Erro ao fazer login');
        }
    } catch (error) {
        console.error('Erro:', error);
        showAlert('Erro de conexão. Tente novamente.');
    } finally {
        // Hide loading state
        loginBtn.disabled = false;
        loginSpinner.classList.add('d-none');
    }
});

// Load saved credentials and add entrance animation
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved credentials
    const rememberLogin = localStorage.getItem('rememberLogin');
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberedPassword = localStorage.getItem('rememberedPassword');
    
    // Check if user just logged out (clear saved data)
    const justLoggedOut = sessionStorage.getItem('justLoggedOut');
    if (justLoggedOut) {
        sessionStorage.removeItem('justLoggedOut');
        // Clear all saved login data when user logs out
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
        localStorage.removeItem('rememberLogin');
        localStorage.removeItem('rememberTimestamp');
        showAlert('Você foi desconectado com sucesso.', 'info');
        return;
    }
    
    // Auto-login if credentials are saved and not expired
    if (rememberLogin === 'true' && rememberedEmail && rememberedPassword) {
        try {
            // Verificar se as credenciais não expiraram (7 dias)
            const rememberTimestamp = localStorage.getItem('rememberTimestamp');
            const now = Date.now();
            const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000; // 7 dias
            
            if (rememberTimestamp && (now - parseInt(rememberTimestamp)) > sevenDaysInMs) {
                console.log('🕒 Credenciais expiradas após 7 dias');
                localStorage.removeItem('rememberedEmail');
                localStorage.removeItem('rememberedPassword');
                localStorage.removeItem('rememberLogin');
                localStorage.removeItem('rememberTimestamp');
                return;
            }
            
            document.getElementById('email').value = rememberedEmail;
            document.getElementById('password').value = atob(rememberedPassword); // Base64 decode
            document.getElementById('rememberMe').checked = true;
            
            // Show auto-login message
            showAlert('🔄 Bem-vindo de volta! Fazendo login automático...', 'info');
            
            // Auto-submit form after short delay
            setTimeout(() => {
                document.getElementById('loginForm').dispatchEvent(new Event('submit'));
            }, 1000);
        } catch (error) {
            console.error('Erro ao decodificar credenciais salvas:', error);
            localStorage.removeItem('rememberedPassword');
            localStorage.removeItem('rememberTimestamp');
        }
    } else if (rememberLogin === 'true' && rememberedEmail) {
        // Only fill email if password is missing
        document.getElementById('email').value = rememberedEmail;
        document.getElementById('rememberMe').checked = true;
        document.getElementById('password').focus();
    }
    
    // Add entrance animation
    const container = document.querySelector('.login-container');
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        container.style.transition = 'all 0.5s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 100);
});

// Clear saved credentials when checkbox is unchecked
document.getElementById('rememberMe').addEventListener('change', function() {
    if (!this.checked) {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
        localStorage.removeItem('rememberLogin');
        localStorage.removeItem('rememberTimestamp');
        // Clear the fields when unchecking
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
    }
});