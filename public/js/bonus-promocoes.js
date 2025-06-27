// Bonus e Promoções JavaScript

class RoletaManager {
    constructor() {
        this.currentSlide = 0;
        this.cardsPerSlide = this.getCardsPerSlide();
        this.totalCards = 0;
        this.init();
    }

    init() {
        this.loadRoletaStatus();
        this.bindEvents();
        this.startCountdownTimers();
        this.initCarousel();
    }

    async loadRoletaStatus() {
        try {
            const response = await fetch('/api/roletas/status');
            const data = await response.json();
            
            if (response.ok) {
                this.updateRoletaStatus(data);
            } else {
                console.error('Erro ao carregar status das roletas:', data.error);
                this.showError('Erro ao carregar status das roletas');
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            this.showError('Erro de conexão');
        }
    }

    updateRoletaStatus(statusData) {
        statusData.forEach(casa => {
            const cardElement = document.querySelector(`[data-casa="${casa.casa}"]`);
            if (!cardElement) return;

            const statusDot = cardElement.querySelector('.status-dot');
            const statusText = cardElement.querySelector('.status-text');
            const btnGirar = cardElement.querySelector('.btn-girar');
            const countdownContainer = cardElement.querySelector('.countdown-container');
            const btnText = cardElement.querySelector('.btn-text');
            const spinner = cardElement.querySelector('.fa-spinner');

            // Armazenar status no data attribute para ordenação
            cardElement.dataset.disponivel = casa.pode_girar ? 'true' : 'false';

            // Ocultar spinner de carregamento
            if (spinner) spinner.style.display = 'none';

            if (casa.pode_girar) {
                // Pode girar
                statusDot.className = 'status-dot disponivel';
                statusText.textContent = 'Disponível';
                btnGirar.disabled = false;
                btnGirar.classList.remove('btn-disabled');
                if (casa.casa === '7games' || casa.casa === 'betao' || casa.casa === 'r7' || casa.casa === 'betano' || casa.casa === 'superbet' || casa.casa === 'novibet' || casa.casa === 'papigames') {
                    btnText.textContent = 'Girar Agora!';
                } else {
                    btnText.textContent = 'Acessar Agora!';
                }
                countdownContainer.style.display = 'none';
            } else {
                // Já acessou hoje
                statusDot.className = 'status-dot usado';
                statusText.textContent = 'Usado hoje';
                btnGirar.disabled = true;
                btnGirar.classList.add('btn-disabled');
                btnText.textContent = 'Já usado hoje';
                
                // Mostrar countdown para próxima roleta
                this.showCountdown(casa.casa, casa.tempo_para_reset);
            }
        });
        
        // Reorganizar roletas após atualizar status
        this.reorganizeCards();
    }

    reorganizeCards() {
        const grid = document.getElementById('roletas-grid');
        const cards = Array.from(grid.querySelectorAll('.roleta-card'));
        
        // Verificar se realmente precisamos reorganizar
        const currentOrder = cards.map(card => card.dataset.casa);
        
        // Ordenar cards: disponíveis primeiro, depois usados
        const sortedCards = [...cards].sort((a, b) => {
            const aDisponivel = a.dataset.disponivel === 'true';
            const bDisponivel = b.dataset.disponivel === 'true';
            
            if (aDisponivel && !bDisponivel) return -1;
            if (!aDisponivel && bDisponivel) return 1;
            
            // Se ambos têm o mesmo status, manter ordem original baseada no data-casa
            const order = ['7games', 'betao', 'r7', 'betano', 'superbet', 'novibet', 'papigames'];
            const aIndex = order.indexOf(a.dataset.casa);
            const bIndex = order.indexOf(b.dataset.casa);
            return aIndex - bIndex;
        });
        
        const newOrder = sortedCards.map(card => card.dataset.casa);
        
        // Se a ordem não mudou, não fazer nada
        if (JSON.stringify(currentOrder) === JSON.stringify(newOrder)) {
            return;
        }
        
        // Reorganizar de forma fluida
        cards.forEach(card => card.remove());
        sortedCards.forEach(card => grid.appendChild(card));
        
        // Atualizar contador de cards e recalcular carrossel
        this.totalCards = sortedCards.length;
        this.currentSlide = 0; // Reset para o primeiro slide para mostrar as disponíveis
        this.updateCarousel();
        this.createIndicators();
    }

    showCountdown(casa, tempoParaReset) {
        const countdownContainer = document.querySelector(`#countdown-${casa}`);
        const timerElement = document.querySelector(`#timer-${casa}`);
        
        if (!countdownContainer || !timerElement) return;

        countdownContainer.style.display = 'block';
        
        // Definir horário de reset para cada casa
        const resetHours = {
            'superbet': 18, // 18:00
            'default': 0    // 00:00 para todas as outras
        };
        
        const resetHour = resetHours[casa] || resetHours['default'];
        
        const calculateNextReset = () => {
            const now = new Date();
            const nextReset = new Date(now);
            nextReset.setHours(resetHour, 0, 0, 0);
            
            // Se já passou do horário de reset hoje, ir para amanhã
            if (now >= nextReset) {
                nextReset.setDate(nextReset.getDate() + 1);
            }
            
            return nextReset;
        };
        
        const updateTimer = () => {
            const now = new Date();
            const nextReset = calculateNextReset();
            const timeLeft = nextReset - now;
            
            if (timeLeft <= 0) {
                // Reset passou, recarregar status
                this.loadRoletaStatus();
                return;
            }
            
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };
        
        updateTimer();
        setInterval(updateTimer, 1000);
    }

    getCardsPerSlide() {
        // Sempre retorna 5 cards por página para uma melhor experiência
        return 5;
    }

    initCarousel() {
        // Inicializar data attributes se não existirem
        document.querySelectorAll('.roleta-card').forEach(card => {
            if (!card.dataset.disponivel) {
                card.dataset.disponivel = 'true'; // Padrão é disponível
            }
        });
        
        this.totalCards = document.querySelectorAll('.roleta-card').length;
        this.cardsPerSlide = this.getCardsPerSlide();
        this.updateCarousel();
        this.createIndicators();
        this.bindCarouselEvents();
        
        // Update on window resize for responsive card widths
        window.addEventListener('resize', () => {
            this.updateCarousel();
        });
    }

    bindCarouselEvents() {
        const prevBtn = document.getElementById('carousel-prev');
        const nextBtn = document.getElementById('carousel-next');
        
        prevBtn.addEventListener('click', () => this.previousSlide());
        nextBtn.addEventListener('click', () => this.nextSlide());
        
        // Touch/swipe support
        let startX = 0;
        let isDragging = false;
        const grid = document.getElementById('roletas-grid');
        
        grid.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
        });
        
        grid.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
        });
        
        grid.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            
            if (Math.abs(diff) > 50) { // Minimum swipe distance
                if (diff > 0) {
                    this.nextSlide();
                } else {
                    this.previousSlide();
                }
            }
        });
    }

    getMaxSlides() {
        // Com 7 cards totais (incluindo PapiGames), teremos 2 páginas de 5 cards
        return Math.max(1, Math.ceil(this.totalCards / this.cardsPerSlide));
    }

    updateCarousel() {
        const grid = document.getElementById('roletas-grid');
        
        // Responsive card width calculation
        let cardWidth = 290; // default card width (increased for better logo visibility)
        const gap = 16; // 1rem gap
        
        // Adjust card width based on screen size
        if (window.innerWidth <= 480) {
            cardWidth = 220;
        } else if (window.innerWidth <= 768) {
            cardWidth = 250;
        }
        
        const slideWidth = (cardWidth + gap) * this.cardsPerSlide;
        const translateX = -this.currentSlide * slideWidth;
        
        grid.style.transform = `translateX(${translateX}px)`;
        
        // Update navigation buttons
        const prevBtn = document.getElementById('carousel-prev');
        const nextBtn = document.getElementById('carousel-next');
        
        prevBtn.disabled = this.currentSlide === 0;
        nextBtn.disabled = this.currentSlide >= this.getMaxSlides() - 1;
        
        // Update indicators
        this.updateIndicators();
    }

    createIndicators() {
        const indicatorsContainer = document.getElementById('carousel-indicators');
        indicatorsContainer.innerHTML = '';
        
        const maxSlides = this.getMaxSlides();
        
        // Only show indicators if there are multiple slides
        if (maxSlides <= 1) {
            indicatorsContainer.style.display = 'none';
            return;
        }
        
        indicatorsContainer.style.display = 'flex';
        
        for (let i = 0; i < maxSlides; i++) {
            const indicator = document.createElement('button');
            indicator.className = 'carousel-indicator';
            indicator.addEventListener('click', () => this.goToSlide(i));
            indicatorsContainer.appendChild(indicator);
        }
        
        this.updateIndicators();
    }

    updateIndicators() {
        const indicators = document.querySelectorAll('.carousel-indicator');
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentSlide);
        });
    }

    previousSlide() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this.updateCarousel();
        }
    }

    nextSlide() {
        if (this.currentSlide < this.getMaxSlides() - 1) {
            this.currentSlide++;
            this.updateCarousel();
        }
    }

    goToSlide(slideIndex) {
        this.currentSlide = slideIndex;
        this.updateCarousel();
    }

    bindEvents() {
        // Bind eventos dos botões de girar
        document.querySelectorAll('.btn-girar').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleGirarClick(e));
        });
    }

    async handleGirarClick(event) {
        event.preventDefault();
        
        const button = event.currentTarget;
        const casa = button.dataset.casa;
        
        if (button.disabled) return;

        // Mostrar loading
        const spinner = button.querySelector('.fa-spinner');
        const btnText = button.querySelector('.btn-text');
        const originalText = btnText.textContent;
        
        button.disabled = true;
        if (spinner) spinner.style.display = 'inline';
        btnText.textContent = 'Processando...';

        try {
            // Registrar clique
            const response = await fetch('/api/roletas/girar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ casa: casa })
            });

            const data = await response.json();

            if (response.ok) {
                // Mostrar sucesso e redirecionar imediatamente
                this.showSuccess(`Redirecionando para ${casa.toUpperCase()}...`);
                
                // Redirecionar imediatamente
                window.open(this.getCasaUrl(casa), '_blank');

                // Atualizar status local
                this.updateLocalStatus(casa, false);
                
            } else {
                this.showError(data.error || 'Erro ao processar solicitação');
                
                // Restaurar botão
                button.disabled = false;
                if (spinner) spinner.style.display = 'none';
                btnText.textContent = originalText;
            }
        } catch (error) {
            console.error('Erro ao girar roleta:', error);
            this.showError('Erro de conexão');
            
            // Restaurar botão
            button.disabled = false;
            if (spinner) spinner.style.display = 'none';
            btnText.textContent = originalText;
        }
    }



    updateLocalStatus(casa, podeGirar) {
        const cardElement = document.querySelector(`[data-casa="${casa}"]`);
        if (!cardElement) return;

        const statusDot = cardElement.querySelector('.status-dot');
        const statusText = cardElement.querySelector('.status-text');
        const btnGirar = cardElement.querySelector('.btn-girar');
        const countdownContainer = cardElement.querySelector('.countdown-container');
        const btnText = cardElement.querySelector('.btn-text');

        // Atualizar status no data attribute
        cardElement.dataset.disponivel = podeGirar ? 'true' : 'false';

        if (!podeGirar) {
            statusDot.className = 'status-dot usado';
            statusText.textContent = 'Usado hoje';
            btnGirar.disabled = true;
            btnGirar.classList.add('btn-disabled');
            btnText.textContent = 'Já usado hoje';
            
            // Mostrar countdown
            this.showCountdown(casa);
            
            // Reorganizar cards após uso de forma fluida
            setTimeout(() => {
                this.reorganizeCards();
            }, 300);
        }
    }

    getCasaUrl(casa) {
        const urls = {
            '7games': 'https://7games.bet.br/pb/wonderwheel',
            'betao': 'https://betao.bet.br/pb/wonderwheel',
            'r7': 'https://r7.bet.br/pb/wonderwheel',
            'betano': 'https://www.betano.bet.br/casino/wheel/',
            'superbet': 'https://superbet.bet.br/jogos-gratis/super-spin',
            'novibet': 'https://www.novibet.bet.br/cassino/giftwheel',
            'papigames': 'https://papigames.bet.br/',
            // Adicionar outras casas aqui no futuro
        };
        
        return urls[casa] || '#';
    }

    startCountdownTimers() {
        // Timer para verificar status a cada minuto
        setInterval(() => {
            this.checkMidnightReset();
        }, 60000);
    }

    checkMidnightReset() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        // Se for meia-noite (00:00 ou 00:01), recarregar status
        if (hours === 0 && minutes <= 1) {
            this.loadRoletaStatus();
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type) {
        // Criar elemento de toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Adicionar estilos inline para o toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#4CAF50' : '#f44336',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '10000',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            maxWidth: '400px',
            animation: 'slideIn 0.3s ease'
        });

        // Adicionar ao DOM
        document.body.appendChild(toast);

        // Remover após 5 segundos
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 5000);

        // Adicionar estilos CSS para animações se não existirem
        if (!document.querySelector('#toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new RoletaManager();
});

// Recarregar status quando a página voltar ao foco
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        setTimeout(() => {
            new RoletaManager().loadRoletaStatus();
        }, 1000);
    }
});

// Funcionalidade do Modal da Roleta
function openRoletaModal(imageSrc, casaName) {
    const modal = document.getElementById('roletaModal');
    const modalImage = document.getElementById('roletaModalImage');
    const modalTitle = document.getElementById('roletaModalTitle');
    
    modalImage.src = imageSrc;
    modalTitle.textContent = `Roleta ${casaName}`;
    modal.classList.add('show');
    
    // Prevenir scroll do body
    document.body.style.overflow = 'hidden';
}

function closeRoletaModal() {
    const modal = document.getElementById('roletaModal');
    modal.classList.remove('show');
    
    // Restaurar scroll do body
    document.body.style.overflow = 'auto';
}

// Event listeners para o modal
document.addEventListener('DOMContentLoaded', () => {
    // Fechar modal com X
    const closeBtn = document.querySelector('.close-roleta-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeRoletaModal);
    }
    
    // Fechar modal clicando no fundo
    const modal = document.getElementById('roletaModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeRoletaModal();
            }
        });
    }
    
    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeRoletaModal();
        }
    });
});

// Variável global para armazenar a casa selecionada para reset
let selectedCasaForReset = null;

// Função para mostrar confirmação de reset
function showResetConfirmation(casa) {
    selectedCasaForReset = casa;
    const modal = document.getElementById('resetConfirmModal');
    modal.classList.add('show');
    
    // Prevenir scroll do body
    document.body.style.overflow = 'hidden';
}

// Função para fechar confirmação de reset
function closeResetConfirmation() {
    selectedCasaForReset = null;
    const modal = document.getElementById('resetConfirmModal');
    modal.classList.remove('show');
    
    // Restaurar scroll do body
    document.body.style.overflow = 'auto';
}

// Função para confirmar o reset
async function confirmReset() {
    if (!selectedCasaForReset) return;

    const confirmBtn = document.getElementById('confirmResetBtn');
    const originalText = confirmBtn.textContent;
    
    // Mostrar loading
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Processando...';

    try {
        const response = await fetch('/api/roletas/force-reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ casa: selectedCasaForReset })
        });

        const data = await response.json();

        if (response.ok) {
            // Fechar modal
            closeResetConfirmation();
            
            // Mostrar sucesso
            const manager = new RoletaManager();
            manager.showSuccess('Timer resetado com sucesso!');
            
            // Recarregar status das roletas
            setTimeout(() => {
                manager.loadRoletaStatus();
            }, 500);
            
        } else {
            const manager = new RoletaManager();
            manager.showError(data.error || 'Erro ao resetar timer');
        }
    } catch (error) {
        console.error('Erro ao resetar timer:', error);
        const manager = new RoletaManager();
        manager.showError('Erro de conexão');
    } finally {
        // Restaurar botão
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}

// Event listeners adicionais para o modal de reset
document.addEventListener('DOMContentLoaded', () => {
    // Fechar modal com clique no fundo
    const resetModal = document.getElementById('resetConfirmModal');
    if (resetModal) {
        resetModal.addEventListener('click', (e) => {
            if (e.target === resetModal) {
                closeResetConfirmation();
            }
        });
    }
    
    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && selectedCasaForReset) {
            closeResetConfirmation();
        }
    });
}); 