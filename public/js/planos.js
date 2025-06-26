/**
 * Planos JavaScript - Funcionalidades da página de planos
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elementos
    const basicButton = document.querySelector('.plan-basic .plan-button');
    const premiumButton = document.querySelector('.plan-premium .plan-button');
    
    // Função para lidar com assinatura do plano Basic
    if (basicButton) {
        basicButton.addEventListener('click', function() {
            // Simular processo de assinatura
            showSubscriptionModal('basic');
        });
    }
    
    // Função para lidar com notificação do plano Premium
    if (premiumButton) {
        premiumButton.addEventListener('click', function() {
            if (!premiumButton.disabled) {
                showNotificationModal();
            }
        });
    }
    
    // Animações ao scroll
    initScrollAnimations();
    
    // Smooth scroll para links internos
    initSmoothScroll();
});

/**
 * Mostra modal de assinatura para o plano Basic
 */
function showSubscriptionModal(plan) {
    // Criar modal dinamicamente
    const modal = document.createElement('div');
    modal.className = 'subscription-modal-overlay';
    modal.innerHTML = `
        <div class="subscription-modal">
            <div class="modal-header">
                <h3><i class="fas fa-crown"></i> Assinar Plano Basic</h3>
                <button class="close-modal" onclick="closeSubscriptionModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="plan-summary">
                    <div class="plan-info">
                        <h4>Plano Basic</h4>
                        <p class="price">R$ 9,90/mês</p>
                    </div>
                    <div class="benefits">
                        <h5>Você terá acesso a:</h5>
                        <ul>
                            <li><i class="fas fa-check"></i> Gerenciamento de saldo em casas de aposta</li>
                            <li><i class="fas fa-check"></i> Controle de lucros de surebets e apostas</li>
                            <li><i class="fas fa-check"></i> Relatórios completos</li>
                            <li><i class="fas fa-check"></i> Calculadora de surebet precisa</li>
                            <li><i class="fas fa-check"></i> Lista de casas regulamentadas</li>
                            <li><i class="fas fa-check"></i> Bônus e promoções</li>
                        </ul>
                    </div>
                </div>
                <div class="trial-info">
                    <div class="trial-badge">
                        <i class="fas fa-gift"></i>
                        <span>7 dias grátis</span>
                    </div>
                    <p>Teste gratuitamente por 7 dias. Cancele a qualquer momento.</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeSubscriptionModal()">
                    Cancelar
                </button>
                <button class="btn-primary" onclick="processSubscription('basic')">
                    <i class="fas fa-credit-card"></i>
                    Iniciar Teste Grátis
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Adicionar classe ativa com delay para animação
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

/**
 * Mostra modal de notificação para o plano Premium
 */
function showNotificationModal() {
    const modal = document.createElement('div');
    modal.className = 'notification-modal-overlay';
    modal.innerHTML = `
        <div class="notification-modal">
            <div class="modal-header">
                <h3><i class="fas fa-bell"></i> Seja Notificado</h3>
                <button class="close-modal" onclick="closeNotificationModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="notification-info">
                    <div class="premium-preview">
                        <i class="fas fa-gem"></i>
                        <h4>Plano Premium em Desenvolvimento</h4>
                        <p>Estamos trabalhando em recursos incríveis com Inteligência Artificial!</p>
                    </div>
                    <div class="features-preview">
                        <h5>Em breve você terá:</h5>
                        <ul>
                            <li><i class="fas fa-robot"></i> Agente IA para facilitar inserção de dados</li>
                            <li><i class="fas fa-mobile-alt"></i> IA no WhatsApp para controle total</li>
                            <li><i class="fas fa-brain"></i> Análises automáticas inteligentes</li>
                            <li><i class="fas fa-headset"></i> Suporte prioritário 24/7</li>
                        </ul>
                    </div>
                    <div class="email-form">
                        <label for="emailNotification">Seu email para notificação:</label>
                        <input type="email" id="emailNotification" placeholder="seu@email.com" required>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeNotificationModal()">
                    Cancelar
                </button>
                <button class="btn-premium" onclick="subscribeNotification()">
                    <i class="fas fa-bell"></i>
                    Quero ser Notificado
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

/**
 * Fecha modal de assinatura
 */
function closeSubscriptionModal() {
    const modal = document.querySelector('.subscription-modal-overlay');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

/**
 * Fecha modal de notificação
 */
function closeNotificationModal() {
    const modal = document.querySelector('.notification-modal-overlay');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

/**
 * Processa assinatura do plano
 */
function processSubscription(plan) {
    // Simular processo de pagamento
    const button = document.querySelector('.subscription-modal .btn-primary');
    const originalText = button.innerHTML;
    
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    
    // Simular delay de processamento
    setTimeout(() => {
        button.innerHTML = '<i class="fas fa-check"></i> Redirecionando...';
        
        setTimeout(() => {
            // Aqui seria redirecionado para gateway de pagamento real
            showSuccessMessage('Redirecionando para pagamento...');
            closeSubscriptionModal();
        }, 1000);
    }, 2000);
}

/**
 * Inscreve para notificação do Premium
 */
function subscribeNotification() {
    const emailInput = document.getElementById('emailNotification');
    const email = emailInput.value.trim();
    
    if (!email || !isValidEmail(email)) {
        showErrorMessage('Por favor, insira um email válido.');
        return;
    }
    
    const button = document.querySelector('.notification-modal .btn-premium');
    const originalText = button.innerHTML;
    
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    
    // Simular salvamento
    setTimeout(() => {
        button.innerHTML = '<i class="fas fa-check"></i> Salvo!';
        
        setTimeout(() => {
            showSuccessMessage('Email salvo! Você será notificado quando o plano Premium estiver disponível.');
            closeNotificationModal();
        }, 1000);
    }, 1500);
}

/**
 * Valida email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Mostra mensagem de sucesso
 */
function showSuccessMessage(message) {
    showToast(message, 'success');
}

/**
 * Mostra mensagem de erro
 */
function showErrorMessage(message) {
    showToast(message, 'error');
}

/**
 * Sistema de toast notifications
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="closeToast(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Adicionar ao body
    document.body.appendChild(toast);
    
    // Mostrar toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto remover após 5 segundos
    setTimeout(() => {
        closeToast(toast.querySelector('.toast-close'));
    }, 5000);
}

/**
 * Retorna ícone do toast baseado no tipo
 */
function getToastIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    return icons[type] || icons.info;
}

/**
 * Fecha toast
 */
function closeToast(button) {
    const toast = button.closest('.toast');
    if (toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}

/**
 * Inicializa animações ao scroll
 */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
            }
        });
    }, observerOptions);
    
    // Observar elementos com animação
    document.querySelectorAll('.plan-card, .faq-item, .comparison-table').forEach(el => {
        observer.observe(el);
    });
}

/**
 * Inicializa smooth scroll
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Estilos já definidos no arquivo planos.css 