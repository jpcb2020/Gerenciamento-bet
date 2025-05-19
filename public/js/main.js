document.addEventListener('DOMContentLoaded', function() {
    // Inject Toast Container
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);

    // Inject Confirm Modal HTML
    const confirmModalHTML = `
        <div id="confirmModalOverlay" class="confirm-modal-overlay">
            <div id="confirmModal" class="confirm-modal">
                <div id="confirmModalIcon" class="confirm-modal-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <p id="confirmModalMessage" class="confirm-modal-message">Tem certeza?</p>
                <div class="confirm-modal-actions">
                    <button id="confirmModalConfirmBtn" class="btn btn-primary">Confirmar</button>
                    <button id="confirmModalCancelBtn" class="btn btn-secondary">Cancelar</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', confirmModalHTML);

    const confirmModalOverlay = document.getElementById('confirmModalOverlay');
    const confirmModalElement = document.getElementById('confirmModal');
    const confirmModalMessageEl = document.getElementById('confirmModalMessage');
    const confirmModalConfirmBtn = document.getElementById('confirmModalConfirmBtn');
    const confirmModalCancelBtn = document.getElementById('confirmModalCancelBtn');

    // --- Modal Elements ---
    const addHouseModal = document.getElementById('addHouseModal');
    const editBalanceModal = document.getElementById('editBalanceModal');
    // New Modals
    const depositModal = document.getElementById('depositModal');
    const withdrawModal = document.getElementById('withdrawModal');
    const modalOverlay = document.getElementById('modalOverlay');

    // --- Form Elements ---
    const addHouseForm = document.getElementById('addHouseForm');
    const editBalanceForm = document.getElementById('editBalanceForm');
    // New Forms
    const depositForm = document.getElementById('depositForm');
    const withdrawForm = document.getElementById('withdrawForm');

    // --- New Modal Input/Display Elements ---
    // Deposit Modal
    const depositHouseIdInput = document.getElementById('depositHouseId');
    const depositHouseNameDisplay = document.getElementById('depositHouseName');
    const depositHouseLogoDisplay = document.getElementById('depositHouseLogo');
    const depositAmountInput = document.getElementById('depositAmount');
    const depositDescriptionInput = document.getElementById('depositDescription');
    const cancelDepositBtn = document.getElementById('cancelDeposit');

    // Withdraw Modal
    const withdrawHouseIdInput = document.getElementById('withdrawHouseId');
    const withdrawHouseNameDisplay = document.getElementById('withdrawHouseName');
    const withdrawHouseLogoDisplay = document.getElementById('withdrawHouseLogo');
    const withdrawAmountInput = document.getElementById('withdrawAmount');
    const withdrawDescriptionInput = document.getElementById('withdrawDescription');
    const cancelWithdrawBtn = document.getElementById('cancelWithdraw');

    // --- Toast Notification Function ---
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        toast.appendChild(messageSpan);

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.className = 'toast-close-btn';
        closeButton.onclick = () => {
            toast.classList.remove('toast--visible');
            toast.classList.add('toast--hiding');
            // Clear timeout if closed manually to prevent issues
            if (toast.timerId) clearTimeout(toast.timerId);
            if (toast.removeTimerId) clearTimeout(toast.removeTimerId);
            setTimeout(() => toast.remove(), 300); // Animation duration for hiding
        };
        toast.appendChild(closeButton);

        // Timer bar
        const timerBar = document.createElement('div');
        timerBar.className = 'toast-timer-bar';
        timerBar.style.animationDuration = `${duration}ms`;
        toast.appendChild(timerBar);

        toastContainer.appendChild(toast);

        // Trigger reflow to enable animation
        toast.offsetHeight;
        toast.classList.add('toast--visible');

        // Store timer ID on the toast element to clear it if closed manually
        toast.timerId = setTimeout(() => {
            toast.classList.remove('toast--visible');
            toast.classList.add('toast--hiding');
            toast.removeTimerId = setTimeout(() => toast.remove(), 300); // Animation duration for hiding
        }, duration);
    }

    // --- Confirmation Modal Function ---
    function showConfirmModal(message, title = 'Confirmação') {
        return new Promise((resolve) => {
            confirmModalMessageEl.textContent = message;
            confirmModalOverlay.classList.add('active');
            confirmModalElement.classList.add('active');

            const handleConfirm = () => {
                cleanupAndResolve(true);
            };

            const handleCancel = () => {
                cleanupAndResolve(false);
            };
            
            const cleanupAndResolve = (value) => {
                confirmModalOverlay.classList.remove('active');
                confirmModalElement.classList.remove('active');
                confirmModalConfirmBtn.removeEventListener('click', handleConfirm);
                confirmModalCancelBtn.removeEventListener('click', handleCancel);
                // Also remove listener for overlay click if you add it
                resolve(value);
            };

            confirmModalConfirmBtn.addEventListener('click', handleConfirm);
            confirmModalCancelBtn.addEventListener('click', handleCancel);
            // Optional: Close on overlay click
            // confirmModalOverlay.addEventListener('click', (e) => {
            //     if (e.target === confirmModalOverlay) {
            //         cleanupAndResolve(false);
            //     }
            // });
        });
    }

    // API URLs
    const API_BASE_URL = 'http://localhost:3000/api';
    const API_CASAS = `${API_BASE_URL}/casas`;
    const API_TRANSACOES = `${API_BASE_URL}/transacoes`;
    const API_DASHBOARD = `${API_BASE_URL}/dashboard`;
    
    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            
            // Check if sidebar is active
            if (sidebar.classList.contains('active')) {
                mainContent.style.marginLeft = '0';
            } else {
                mainContent.style.marginLeft = '0';
            }
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        // Check if sidebar is open and screen is mobile size
        if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
            // Check if click is outside the sidebar
            if (!sidebar.contains(event.target) && event.target !== menuToggle) {
                sidebar.classList.remove('active');
            }
        }
    });
    
    // Format currency
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
    
    // Format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' };
        return date.toLocaleDateString('pt-BR', options);
    }
    
    // Error handling
    function handleError(error) {
        console.error('Error:', error);
        showToast('Ocorreu um erro ao processar sua solicitação. Tente novamente.', 'error');
    }
    
    // Load dashboard summary
    async function loadDashboardSummary() {
        try {
            const response = await fetch(API_DASHBOARD);
            if (!response.ok) {
                throw new Error('Erro ao carregar dados do dashboard');
            }
            
            const dashboardData = await response.json();
            
            // Selecionar todos os cards
            const cards = document.querySelectorAll('.overview-cards .card');
            
            // Card 1: Saldo Total
            if (cards[0]) {
                const valueEl = cards[0].querySelector('.card-value');
                const changeEl = cards[0].querySelector('.card-change');
                if (valueEl) valueEl.textContent = formatCurrency(dashboardData.saldo_total);
                if (changeEl) {
                    if (dashboardData.saldo_total > 0) {
                        changeEl.textContent = 'Valor atualizado';
                    } else {
                        changeEl.textContent = 'Nenhuma transação';
                    }
                }
            }
            
            // Card 2: Casas Ativas
            if (cards[1]) {
                const valueEl = cards[1].querySelector('.card-value');
                const changeEl = cards[1].querySelector('.card-change');
                if (valueEl) valueEl.textContent = dashboardData.casas_count;
                if (changeEl) {
                    if (dashboardData.casas_count === 0) {
                        changeEl.textContent = 'nenhuma casa cadastrada';
                    } else if (dashboardData.casas_count === 1) {
                        changeEl.textContent = 'casa cadastrada';
                    } else {
                        changeEl.textContent = 'casas cadastradas';
                    }
                }
            }
            
            // Card 3: Maior Saldo
            if (cards[2]) {
                const valueEl = cards[2].querySelector('.card-value');
                const changeEl = cards[2].querySelector('.card-change');
                if (valueEl) {
                    valueEl.textContent = dashboardData.maior_saldo.nome || '-';
                }
                if (changeEl) {
                    changeEl.textContent = formatCurrency(dashboardData.maior_saldo.saldo || 0);
                }
            }
            
            // Card 4: Rendimento
            if (cards[3]) {
                const valueEl = cards[3].querySelector('.card-value');
                if (valueEl) {
                    valueEl.textContent = `${dashboardData.rendimento}%`;
                    const rendimentoClass = dashboardData.rendimento >= 0 ? 'positive' : 'negative';
                    valueEl.className = `card-value ${rendimentoClass}`;
                }
            }
            
        } catch (error) {
            handleError(error);
        }
    }
    
    // Load betting houses
    async function loadBettingHouses() {
        try {
            const response = await fetch(API_CASAS);
            if (!response.ok) {
                throw new Error('Erro ao carregar casas de apostas');
            }
            
            const casas = await response.json();
            const bettingHousesContainer = document.querySelector('.betting-houses');
            
            if (bettingHousesContainer) {
                bettingHousesContainer.innerHTML = '';
                
                casas.forEach(casa => {
                    const isPositive = casa.saldo > 0;
                    const cardHTML = `
                        <div class="betting-house-card" data-id="${casa.id}">
                            <div class="house-info">
                                <img src="${casa.logo || '/images/bet-default-icon.png'}" alt="${casa.nome}" class="betting-house-logo">
                                <div>
                                    <h4>${casa.nome}</h4>
                                    <p>ID: ${casa.id}</p>
                                </div>
                            </div>
                            <div class="house-balance">
                                <h4>${formatCurrency(casa.saldo)}</h4>
                                <span class="${isPositive ? 'positive' : 'negative'}">ID: ${casa.id}</span>
                            </div>
                            <div class="house-actions">
                                <button class="btn-outline btn-deposit" data-id="${casa.id}" data-nome="${casa.nome}">
                                    <i class="fas fa-plus"></i> Depósito
                                </button>
                                <button class="btn-outline btn-withdraw" data-id="${casa.id}" data-nome="${casa.nome}">
                                    <i class="fas fa-minus"></i> Saque
                                </button>
                                <button class="btn-outline btn-edit-balance" data-id="${casa.id}" data-nome="${casa.nome}" data-saldo="${casa.saldo}" data-logo="${casa.logo || '/images/bet-default-icon.png'}">
                                    <i class="fas fa-edit"></i> Editar Saldo
                                </button>
                                <button class="btn-outline btn-delete" data-id="${casa.id}" data-nome="${casa.nome}">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                                <button class="btn-icon btn-more" data-id="${casa.id}">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    
                    bettingHousesContainer.innerHTML += cardHTML;
                });
                
                // Add event listeners (Original setupBettingHouseEvents() was called here)
                // This will now be handled by event delegation on document
            }
            
        } catch (error) {
            // Only handleError if it's relevant to the current page context
            if (document.querySelector('.betting-houses')) {
                handleError(error);
            }
        }
    }
    
    // Load recent transactions
    async function loadRecentTransactions() {
        try {
            const response = await fetch(`${API_TRANSACOES}?limit=5`);
            if (!response.ok) {
                throw new Error('Erro ao carregar transações recentes');
            }
            
            const transacoes = await response.json();
            const transacoesBody = document.querySelector('.transactions-table tbody');
            
            if (transacoesBody) {
                transacoesBody.innerHTML = '';
                
                if (transacoes.length === 0) {
                    // Exibir mensagem de nenhuma transação
                    transacoesBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="empty-transactions">
                                <div class="empty-state">
                                    <i class="fas fa-exchange-alt"></i>
                                    <h3>Nenhuma transação registrada</h3>
                                    <p>As transações aparecerão aqui</p>
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                    // Exibir transações
                    transacoes.forEach(transacao => {
                        const isPositive = ['deposito', 'ganho'].includes(transacao.tipo);
                        const transacaoHTML = `
                            <tr data-transacao-id="${transacao.id}">
                                <td data-label="Data">${formatDate(transacao.data)}</td>
                                <td data-label="Casa">
                                    <div class="table-house">
                                        <img src="${transacao.casa_logo || '/images/bet-default-icon.png'}" alt="${transacao.casa_nome}">
                                        <span>${transacao.casa_nome}</span>
                                    </div>
                                </td>
                                <td data-label="Tipo">${formatTipoTransacao(transacao.tipo)}</td>
                                <td class="${isPositive ? 'positive' : 'negative'}" data-label="Valor">
                                    ${isPositive ? '+ ' : '- '}${formatCurrency(Math.abs(transacao.valor))}
                                </td>
                                <td data-label="Status">
                                    <span class="status-${transacao.status}">${formatStatus(transacao.status)}</span>
                                </td>
                                <td class="actions-cell">
                                    <button class="btn-icon btn-transaction-menu" data-id="${transacao.id}">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                    <div class="transaction-menu" id="menu-${transacao.id}">
                                        <ul>
                                            <li class="delete-transaction" data-id="${transacao.id}">
                                                <i class="fas fa-trash"></i> Excluir Transação
                                            </li>
                                        </ul>
                                    </div>
                                </td>
                            </tr>
                        `;
                        
                        transacoesBody.innerHTML += transacaoHTML;
                    });
                    
                    // Configurar ouvintes de eventos para os menus de transações
                    setupTransactionMenus();
                }
            }
            
        } catch (error) {
            handleError(error);
        }
    }
    
    // Configura os menus de transações
    function setupTransactionMenus() {
        // Fechar todos os menus abertos quando clicar em qualquer lugar na página
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.actions-cell')) {
                document.querySelectorAll('.transaction-menu.active').forEach(menu => {
                    menu.classList.remove('active');
                });
            }
        });
        
        // Botões de menu de transações
        document.querySelectorAll('.btn-transaction-menu').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const transacaoId = this.getAttribute('data-id');
                const menu = document.getElementById(`menu-${transacaoId}`);
                
                // Fechar todos os outros menus primeiro
                document.querySelectorAll('.transaction-menu.active').forEach(activeMenu => {
                    if (activeMenu !== menu) {
                        activeMenu.classList.remove('active');
                    }
                });
                
                // Alternar o menu atual
                menu.classList.toggle('active');
            });
        });
        
        // Opção de exclusão de transação
        document.querySelectorAll('.delete-transaction').forEach(item => {
            item.addEventListener('click', async function(e) {
                e.stopPropagation();
                const transacaoId = this.getAttribute('data-id');
                
                const confirmed = await showConfirmModal(`Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.`);
                
                if (confirmed) {
                    try {
                        const response = await fetch(`${API_TRANSACOES}/${transacaoId}`, {
                            method: 'DELETE'
                        });
                        
                        if (response.ok) {
                            showToast('Transação excluída com sucesso!', 'success');
                            // Recarregar dados
                            loadDashboardSummary();
                            loadBettingHouses();
                            loadRecentTransactions();
                        } else {
                            const errorData = await response.json().catch(() => ({ message: 'Erro ao excluir transação' }));
                            throw new Error(errorData.message || 'Erro ao excluir transação');
                        }
                    } catch (error) {
                        handleError(error);
                    }
                }
                
                // Fechar o menu
                const menu = this.closest('.transaction-menu');
                if (menu) {
                    menu.classList.remove('active');
                }
            });
        });
    }
    
    // Format transaction type
    function formatTipoTransacao(tipo) {
        const tipos = {
            'deposito': 'Depósito',
            'saque': 'Saque',
            'aposta': 'Aposta',
            'ganho': 'Ganho',
            'ajuste': 'Ajuste' // Added for manual balance adjustments
        };
        return tipos[tipo] || tipo;
    }
    
    // Format status
    function formatStatus(status) {
        const statusMap = {
            'completo': 'Completo',
            'pendente': 'Pendente',
            'ajuste': 'Ajuste' // Added for manual balance adjustments
        };
        return statusMap[status] || status;
    }
    
    // NEW: Event delegation for deposit, withdraw, edit balance, delete house, and more options buttons
    document.addEventListener('click', async function(e) {
        const target = e.target;
        const button = target.closest('button'); // Get the actual button element if click was on icon

        if (!button) return; // Not a click on a button or its child

        // Deposit Modal Trigger
        if (button.matches('.btn-deposit')) {
            e.stopPropagation();
            const casaId = button.dataset.id;
            const casaNome = button.dataset.nome;
            const cardElement = button.closest('.betting-house-card, .casa-card-detailed');
            let casaLogo = button.dataset.logo || 'https://via.placeholder.com/50'; // Use data-logo if present, fallback
            if (cardElement && !button.dataset.logo) { // If data-logo not on button, try to find in card
                 const logoImg = cardElement.querySelector('.house-info img, .betting-house-logo, .casa-logo-detailed');
                 if (logoImg) casaLogo = logoImg.src;
            }

            if (depositModal && depositHouseIdInput && depositHouseNameDisplay && depositHouseLogoDisplay && depositAmountInput) {
                depositHouseIdInput.value = casaId;
                depositHouseNameDisplay.textContent = casaNome;
                depositHouseLogoDisplay.src = casaLogo;
                depositAmountInput.value = '';
                depositDescriptionInput.value = '';
                openModal(depositModal);
            } else {
                console.error('Deposit modal elements not found');
                showToast('Erro ao abrir o modal de depósito.', 'error');
            }
        }

        // Withdraw Modal Trigger
        else if (button.matches('.btn-withdraw')) {
            e.stopPropagation();
            const casaId = button.dataset.id;
            const casaNome = button.dataset.nome;
            const cardElement = button.closest('.betting-house-card, .casa-card-detailed');
            let casaLogo = button.dataset.logo || 'https://via.placeholder.com/50';
            if (cardElement && !button.dataset.logo) {
                const logoImg = cardElement.querySelector('.house-info img, .betting-house-logo, .casa-logo-detailed');
                if (logoImg) casaLogo = logoImg.src;
            }

            if (withdrawModal && withdrawHouseIdInput && withdrawHouseNameDisplay && withdrawHouseLogoDisplay && withdrawAmountInput) {
                withdrawHouseIdInput.value = casaId;
                withdrawHouseNameDisplay.textContent = casaNome;
                withdrawHouseLogoDisplay.src = casaLogo;
                withdrawAmountInput.value = '';
                withdrawDescriptionInput.value = '';
                openModal(withdrawModal);
            } else {
                console.error('Withdraw modal elements not found');
                showToast('Erro ao abrir o modal de saque.', 'error');
            }
        }

        // Edit Balance Modal Trigger (from dashboard cards)
        else if (button.matches('.btn-edit-balance')) {
            e.stopPropagation();
            // Ensure we are on the dashboard page or that editBalanceModal exists
            if (document.getElementById('editBalanceModal')) {
                const casaId = button.dataset.id;
                const casaNome = button.dataset.nome;
                const saldoAtual = parseFloat(button.dataset.saldo);
                const logo = button.dataset.logo;
                
                document.getElementById('editHouseId').value = casaId;
                document.getElementById('editHouseName').textContent = casaNome;
                document.getElementById('editHouseLogo').src = logo || 'https://via.placeholder.com/50';
                document.getElementById('currentBalance').value = formatCurrency(saldoAtual);
                document.getElementById('newBalance').value = saldoAtual.toFixed(2);
                document.getElementById('balanceNote').value = '';
                
                openModal(editBalanceModal);
            } else {
                 // console.log('Edit Balance Modal not found on this page');
            }
        }

        // Delete House Trigger (from dashboard cards)
        else if (button.matches('.btn-delete')) { // Assuming '.btn-delete' is for dashboard house deletion
            e.stopPropagation();
             // This delete is the generic one using showConfirmModal, typically from dashboard
            const casaId = button.dataset.id;
            const casaNome = button.dataset.nome;
            if (casaId && casaNome) { // Ensure it has the necessary data
                const confirmed = await showConfirmModal(`Tem certeza que deseja excluir a casa ${casaNome}? Todas as informações associadas também serão excluídas. Esta ação não pode ser desfeita.`);
                if (confirmed) {
                    try {
                        const response = await fetch(`${API_CASAS}/${casaId}`, {
                            method: 'DELETE',
                            headers: {'Content-Type': 'application/json'}
                        });
                        if (response.ok) {
                            showToast(`Casa ${casaNome} excluída com sucesso!`, 'success');
                            if (typeof loadDashboardSummary === 'function') loadDashboardSummary();
                            if (typeof loadBettingHouses === 'function') loadBettingHouses(); // This will re-render dashboard cards
                            if (typeof loadRecentTransactions === 'function') loadRecentTransactions();
                        } else {
                            const errorData = await response.json().catch(() => ({ message: 'Erro ao excluir casa de apostas' }));
                            throw new Error(errorData.message || 'Erro ao excluir casa de apostas');
                        }
                    } catch (error) {
                        handleError(error);
                    }
                }
            }
        }
        
        // More Options Trigger (from dashboard cards)
        else if (button.matches('.btn-more')) {
             e.stopPropagation();
             const casaId = button.dataset.id;
             showToast(`Mais opções para casa ID: ${casaId}`, 'info');
        }
    });
    
    // Modal functions
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const cancelAddBtn = document.getElementById('cancelAddHouse');
    const cancelEditBtn = document.getElementById('cancelEditBalance');
    
    // Function to open modal (generic)
    function openModal(modalElement) {
        // Close all modals first
        closeAllModals();
        
        // Open the specified modal
        modalElement.classList.add('active');
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    // Function to close all modals
    function closeAllModals() {
        // Reset all forms
        if (addHouseForm) addHouseForm.reset();
        if (editBalanceForm) editBalanceForm.reset();
        if (depositForm) depositForm.reset();     // Added reset
        if (withdrawForm) withdrawForm.reset();   // Added reset
        
        // Remove active class from all modals
        const allModals = document.querySelectorAll('.modal');
        allModals.forEach(modal => {
            modal.classList.remove('active');
        });
        
        // Hide overlay
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // Add event listeners for modals
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    if (cancelAddBtn) {
        cancelAddBtn.addEventListener('click', closeAllModals);
    }
    
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', closeAllModals);
    }
    
    // Add listeners for new modal cancel buttons
    if (cancelDepositBtn) {
        cancelDepositBtn.addEventListener('click', closeAllModals);
    }

    if (cancelWithdrawBtn) {
        cancelWithdrawBtn.addEventListener('click', closeAllModals);
    }
    
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeAllModals);
    }
    
    // Add new betting house button
    const addHouseBtn = document.querySelector('.section-header .btn-primary, #addHouseBtnDetailed'); // Make selector more general for both pages
    
    if (addHouseBtn) {
        addHouseBtn.addEventListener('click', function() {
            if (addHouseForm) addHouseForm.reset();
            // Preencher placeholder do logo se existir o campo (pode ser diferente entre modais)
            const houseLogoInput = document.getElementById('houseLogo');
            if (houseLogoInput) {
                // Idealmente, o DEFAULT_LOGO deveria ser uma constante acessível ou passada
                // Por agora, vamos assumir que o placeholder é definido no HTML ou não é crítico aqui.
            }
            if (addHouseModal) openModal(addHouseModal);
        });
    }
    
    // Add house form submission
    // Only add this listener from main.js if we are NOT on the casas-de-apostas page (which has its own handler)
    if (addHouseForm && !document.getElementById('detailedCasasGrid')) {
        addHouseForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitButton = addHouseForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Salvando...';
            
            const houseName = document.getElementById('houseName').value.trim();
            const houseLogo = document.getElementById('houseLogo').value.trim();
            const initialBalance = parseFloat(document.getElementById('initialBalance').value) || 0;
            
            if (!houseName) {
                showToast('O nome da casa de apostas é obrigatório!', 'warning');
                return;
            }
            
            try {
                const response = await fetch(API_CASAS, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        nome: houseName,
                        logo: houseLogo,
                        saldo: initialBalance
                    })
                });
                
                if (response.ok) {
                    // Close modal
                    closeAllModals();
                    
                    // Show success message
                    showToast('Casa de apostas adicionada com sucesso!', 'success');
                    
                    // Reload data
                    loadDashboardSummary();
                    loadBettingHouses();
                } else {
                    const errorData = await response.json().catch(() => ({ message: 'Erro ao adicionar casa de apostas' }));
                    throw new Error(errorData.message || 'Erro ao adicionar casa de apostas');
                }
            } catch (error) {
                handleError(error);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }
    
    // Edit balance form submission
    if (editBalanceForm) {
        editBalanceForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitButton = editBalanceForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Atualizando...';
            
            const casaId = document.getElementById('editHouseId').value;
            const casaNome = document.getElementById('editHouseName').textContent;
            const newBalance = parseFloat(document.getElementById('newBalance').value);
            const balanceNote = document.getElementById('balanceNote').value.trim();
            
            if (isNaN(newBalance) || newBalance < 0) {
                showToast('Por favor, insira um valor de saldo válido e não negativo!', 'warning');
                return;
            }
            
            try {
                // Primeiro, atualizamos o saldo da casa diretamente
                const updateResponse = await fetch(`${API_CASAS}/${casaId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        saldo: newBalance
                    })
                });
                
                if (updateResponse.ok) {
                    // Adicionar uma transação para registrar a mudança (opcional)
                    if (balanceNote) {
                        await fetch(API_TRANSACOES, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                casa_id: casaId,
                                tipo: 'ajuste',
                                valor: newBalance - parseFloat(document.getElementById('currentBalance').value.replace(/[^0-9,-]+/g,"").replace(",",".")), // Calcula a diferença para o valor da transação
                                descricao: `Ajuste manual de saldo: ${balanceNote || 'Correção de saldo.'}` // Adiciona uma descrição padrão se vazia
                            })
                        });
                    }
                    
                    // Fechar modal
                    closeAllModals();
                    
                    // Mostrar mensagem de sucesso
                    showToast(`Saldo de ${casaNome} atualizado com sucesso!`, 'success');
                    
                    // Recarregar dados
                    loadDashboardSummary();
                    loadBettingHouses();
                    loadRecentTransactions();
                } else {
                    const errorData = await updateResponse.json().catch(() => ({ message: 'Erro ao atualizar saldo' }));
                    throw new Error(errorData.message || 'Erro ao atualizar saldo');
                }
            } catch (error) {
                handleError(error);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }
    
    // Deposit form submission
    if (depositForm) {
        depositForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitButton = depositForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Confirmando...';

            const casaId = depositHouseIdInput.value;
            const valor = parseFloat(depositAmountInput.value);
            const descricao = depositDescriptionInput.value.trim() || `Depósito para ${depositHouseNameDisplay.textContent}`;

            if (!casaId || isNaN(valor) || valor <= 0) {
                showToast('Por favor, insira um valor de depósito válido.', 'warning');
                return;
            }

            try {
                const response = await fetch(API_TRANSACOES, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        casa_id: casaId,
                        tipo: 'deposito',
                        valor: valor,
                        descricao: descricao
                    })
                });

                if (response.ok) {
                    closeAllModals();
                    showToast('Depósito realizado com sucesso!', 'success');
                    // Reload data for dashboard if these functions exist
                    if (typeof loadDashboardSummary === 'function') loadDashboardSummary();
                    if (typeof loadBettingHouses === 'function') loadBettingHouses(); 
                    if (typeof loadRecentTransactions === 'function') loadRecentTransactions();

                    // Dispatch a custom event for other scripts to listen to
                    document.dispatchEvent(new CustomEvent('transactionComplete', { detail: { type: 'deposit' } }));
                } else {
                    const errorData = await response.json().catch(() => ({ message: 'Erro ao realizar depósito' }));
                    throw new Error(errorData.message || 'Erro ao realizar depósito');
                }
            } catch (error) {
                handleError(error);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }

    // Withdraw form submission
    if (withdrawForm) {
        withdrawForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitButton = withdrawForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Confirmando...';

            const casaId = withdrawHouseIdInput.value;
            const valor = parseFloat(withdrawAmountInput.value);
            const descricao = withdrawDescriptionInput.value.trim() || `Saque de ${withdrawHouseNameDisplay.textContent}`;

            if (!casaId || isNaN(valor) || valor <= 0) {
                showToast('Por favor, insira um valor de saque válido.', 'warning');
                return;
            }

            // Optional: Add a check here if current balance is sufficient for withdrawal if that data is readily available.
            // For now, server-side validation will handle it.

            try {
                const response = await fetch(API_TRANSACOES, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        casa_id: casaId,
                        tipo: 'saque',
                        valor: valor,
                        descricao: descricao
                    })
                });

                if (response.ok) {
                    closeAllModals();
                    showToast('Saque realizado com sucesso!', 'success');
                    // Reload data for dashboard if these functions exist
                    if (typeof loadDashboardSummary === 'function') loadDashboardSummary();
                    if (typeof loadBettingHouses === 'function') loadBettingHouses();
                    if (typeof loadRecentTransactions === 'function') loadRecentTransactions();

                    // Dispatch a custom event for other scripts to listen to
                    document.dispatchEvent(new CustomEvent('transactionComplete', { detail: { type: 'withdraw' } }));
                } else {
                    const errorData = await response.json().catch(() => ({ message: 'Erro ao realizar saque' }));
                    throw new Error(errorData.message || 'Erro ao realizar saque');
                }
            } catch (error) {
                handleError(error);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }
    
    // Make responsive tables
    function setupResponsiveTables() {
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
            const headerCells = table.querySelectorAll('thead th');
            const bodyCells = table.querySelectorAll('tbody td');
            
            // Add data-label attribute to each body cell
            if (headerCells.length > 0) {
                let headerIndex = 0;
                bodyCells.forEach((cell, index) => {
                    headerIndex = index % headerCells.length;
                    cell.setAttribute('data-label', headerCells[headerIndex].textContent);
                });
            }
        });
    }
    
    // Initial page load
    loadDashboardSummary();
    loadBettingHouses();
    loadRecentTransactions();
    setupResponsiveTables();
    
    // Log success
    console.log('Dashboard de gerenciamento de apostas carregado com sucesso!');
});
