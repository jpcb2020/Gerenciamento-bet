// Register Page JavaScript

// Toggle password visibility
function togglePassword(inputId, iconId) {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = document.getElementById(iconId);
    
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

// Check password strength
function checkPasswordStrength(password) {
    let strength = 0;
    let text = 'Muito fraca';
    let className = 'strength-weak';
    
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    switch (strength) {
        case 0:
        case 1:
            text = 'Muito fraca';
            className = 'strength-weak';
            break;
        case 2:
        case 3:
            text = 'Fraca';
            className = 'strength-fair';
            break;
        case 4:
        case 5:
            text = 'Boa';
            className = 'strength-good';
            break;
        case 6:
            text = 'Forte';
            className = 'strength-strong';
            break;
    }
    
    return { strength: (strength / 6) * 100, text, className };
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

// Validate form
function validateForm() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const email = document.getElementById('email').value;
    const nome = document.getElementById('nome').value;
    const sobrenome = document.getElementById('sobrenome').value;
    
    // Reset validation classes
    document.querySelectorAll('.form-control').forEach(input => {
        input.classList.remove('is-valid', 'is-invalid');
    });
    
    let isValid = true;
    
    // Validate nome
    if (nome.length < 2) {
        document.getElementById('nome').classList.add('is-invalid');
        isValid = false;
    } else {
        document.getElementById('nome').classList.add('is-valid');
    }
    
    // Validate sobrenome
    if (sobrenome.length < 2) {
        document.getElementById('sobrenome').classList.add('is-invalid');
        isValid = false;
    } else {
        document.getElementById('sobrenome').classList.add('is-valid');
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        document.getElementById('email').classList.add('is-invalid');
        isValid = false;
    } else {
        document.getElementById('email').classList.add('is-valid');
    }
    
    // Validate password
    if (password.length < 6) {
        document.getElementById('password').classList.add('is-invalid');
        isValid = false;
    } else {
        document.getElementById('password').classList.add('is-valid');
    }
    
    // Validate confirm password
    if (password !== confirmPassword) {
        document.getElementById('confirmPassword').classList.add('is-invalid');
        isValid = false;
    } else if (confirmPassword.length > 0) {
        document.getElementById('confirmPassword').classList.add('is-valid');
    }
    
    return isValid;
}

// Password strength checker event listener
document.getElementById('password').addEventListener('input', (e) => {
    const password = e.target.value;
    const result = checkPasswordStrength(password);
    
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    strengthFill.style.width = result.strength + '%';
    strengthFill.className = 'strength-fill ' + result.className;
    strengthText.textContent = result.text;
});

// Real-time validation
document.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('blur', validateForm);
});

// Handle register form submission
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
        showAlert('Por favor, corrija os erros no formulário.');
        return;
    }
    
    const registerBtn = document.getElementById('registerBtn');
    const registerSpinner = document.getElementById('registerSpinner');
    const formData = new FormData(e.target);
    
    // Show loading state
    registerBtn.disabled = true;
    registerSpinner.classList.remove('d-none');
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: formData.get('nome'),
                sobrenome: formData.get('sobrenome'),
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Conta criada com sucesso! Redirecionando...', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } else {
            showAlert(data.error || 'Erro ao criar conta');
        }
    } catch (error) {
        console.error('Erro:', error);
        showAlert('Erro de conexão. Tente novamente.');
    } finally {
        // Hide loading state
        registerBtn.disabled = false;
        registerSpinner.classList.add('d-none');
    }
});

// Add entrance animation
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.register-container');
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        container.style.transition = 'all 0.5s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 100);
});