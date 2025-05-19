document.addEventListener('DOMContentLoaded', function() {
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
    
    // Toast Notification System
    const toast = {
        success: function(message, duration = 3000) {
            this._show(message, 'success', duration);
        },
        error: function(message, duration = 4000) {
            this._show(message, 'error', duration);
        },
        info: function(message, duration = 3000) {
            this._show(message, 'info', duration);
        },
        warning: function(message, duration = 3500) {
            this._show(message, 'warning', duration);
        },
        _show: function(message, type, duration) {
            // Icon based on type
            let icon = '';
            switch (type) {
                case 'success':
                    icon = '<i class="fas fa-check-circle"></i>';
                    break;
                case 'error':
                    icon = '<i class="fas fa-exclamation-circle"></i>';
                    break;
                case 'info':
                    icon = '<i class="fas fa-info-circle"></i>';
                    break;
                case 'warning':
                    icon = '<i class="fas fa-exclamation-triangle"></i>';
                    break;
            }
            
            // Position based on screen size
            const position = window.innerWidth <= 768 ? "center" : "right";
            
            Toastify({
                text: message,
                duration: duration,
                gravity: "top",
                position: position,
                className: `custom-toast toast-${type}`,
                stopOnFocus: true,
                onClick: function(){},
                escapeMarkup: false,
                close: true,
                avatar: null, 
                offset: {
                    x: 15,
                    y: 15
                },
                style: {
                    display: "flex",
                    alignItems: "center"
                },
                node: null,
                selector: null,
                // Custom html template for the toast
                prependHTML: `<div class="toast-icon">${icon}</div>`
            }).showToast();
        }
    };
    
    // Confirmation Modal System
    const confirmModal = {
        modal: document.getElementById('confirmModal'),
        titleEl: document.getElementById('confirmTitle'),
        messageEl: document.getElementById('confirmMessage'),
        cancelBtn: document.getElementById('confirmCancel'),
        okBtn: document.getElementById('confirmOk'),
        overlay: document.getElementById('modalOverlay'),
        closeBtn: document.querySelector('#confirmModal .close-modal'),
        callback: null,
        
        // Show confirmation modal
        show: function(message, callback, title = 'Confirmação') {
            this.titleEl.textContent = title;
            this.messageEl.textContent = message;
            this.callback = callback;
            
            this.modal.classList.add('active');
            this.overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        },
        
        // Hide confirmation modal
        hide: function() {
            this.modal.classList.remove('active');
            this.overlay.classList.remove('active');
            document.body.style.overflow = '';
        },
        
        // Initialize event listeners
        init: function() {
            this.cancelBtn.addEventListener('click', () => {
                this.hide();
            });
            
            this.okBtn.addEventListener('click', () => {
                if (typeof this.callback === 'function') {
                    this.callback(true);
                }
                this.hide();
            });
            
            this.closeBtn.addEventListener('click', () => {
                this.hide();
            });
            
            this.overlay.addEventListener('click', () => {
                this.hide();
            });
        }
    };
    
    // Initialize confirmation modal
    confirmModal.init();
    
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
        return date.toLocaleDateString('pt-BR');
    }
    
    // Error handling
    function handleError(error) {
        console.error('Error:', error);
        toast.error('Ocorreu um erro ao carregar os dados. Por favor, tente novamente.');
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
                                <img src="${casa.logo || 'https://via.placeholder.com/50?text=' + casa.nome}" alt="${casa.nome}">
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
                                <button class="btn-outline btn-edit-balance" data-id="${casa.id}" data-nome="${casa.nome}" data-saldo="${casa.saldo}" data-logo="${casa.logo || 'https://via.placeholder.com/50?text=' + casa.nome}">
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
                
                // Add event listeners
                setupBettingHouseEvents();
            }
            
        } catch (error) {
            handleError(error);
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
                                        <img src="${transacao.casa_logo || 'https://via.placeholder.com/30?text=' + transacao.casa_nome}" alt="${transacao.casa_nome}">
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
                
                confirmModal.show('Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.', async (confirmed) => {
                    if (confirmed) {
                        try {
                            const response = await fetch(`${API_TRANSACOES}/${transacaoId}`, {
                                method: 'DELETE'
                            });
                            
                            if (response.ok) {
                                toast.success('Transação excluída com sucesso!');
                                // Recarregar dados
                                loadDashboardSummary();
                                loadBettingHouses();
                                loadRecentTransactions();
                            } else {
                                throw new Error('Erro ao excluir transação');
                            }
                        } catch (error) {
                            handleError(error);
                        }
                    }
                }, 'Excluir Transação');
                
                // Fechar o menu
                document.getElementById(`menu-${transacaoId}`).classList.remove('active');
            });
        });
    }
    
    // Format transaction type
    function formatTipoTransacao(tipo) {
        const tipos = {
            'deposito': 'Depósito',
            'saque': 'Saque',
            'aposta': 'Aposta',
            'ganho': 'Ganho'
        };
        return tipos[tipo] || tipo;
    }
    
    // Format status
    function formatStatus(status) {
        const statusMap = {
            'completo': 'Completo',
            'pendente': 'Pendente'
        };
        return statusMap[status] || status;
    }
    
    // Set up betting house events
    function setupBettingHouseEvents() {
        // Deposit buttons
        document.querySelectorAll('.btn-deposit').forEach(button => {
            button.addEventListener('click', async function(e) {
                e.stopPropagation();
                const casaId = this.getAttribute('data-id');
                const casaNome = this.getAttribute('data-nome');
                
                // Create a custom input modal instead of prompt
                const depositModal = document.createElement('div');
                depositModal.className = 'modal';
                depositModal.id = 'depositModal';
                
                depositModal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Depósito para ${casaNome}</h2>
                            <span class="close-modal">&times;</span>
                        </div>
                        <div class="modal-body">
                            <form id="depositForm">
                                <div class="form-group">
                                    <label for="depositValue">Valor do Depósito</label>
                                    <input type="number" id="depositValue" name="depositValue" placeholder="0.00" step="0.01" min="0" required>
                                </div>
                                <div class="form-actions">
                                    <button type="button" class="btn-outline" id="cancelDeposit">Cancelar</button>
                                    <button type="submit" class="btn-primary">Confirmar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(depositModal);
                
                const modal = document.getElementById('depositModal');
                const closeBtn = modal.querySelector('.close-modal');
                const cancelBtn = document.getElementById('cancelDeposit');
                const form = document.getElementById('depositForm');
                
                // Show modal
                openModal(modal);
                
                // Close events
                closeBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    closeAllModals();
                });
                
                cancelBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    closeAllModals();
                });
                
                // Form submission
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const valor = document.getElementById('depositValue').value;
                    
                    if (valor && !isNaN(valor) && parseFloat(valor) > 0) {
                        try {
                            const response = await fetch(API_TRANSACOES, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    casa_id: casaId,
                                    tipo: 'deposito',
                                    valor: parseFloat(valor),
                                    descricao: `Depósito para ${casaNome}`
                                })
                            });
                            
                            if (response.ok) {
                                toast.success('Depósito realizado com sucesso!');
                                // Reload data
                                loadDashboardSummary();
                                loadBettingHouses();
                                loadRecentTransactions();
                                document.body.removeChild(modal);
                                closeAllModals();
                            } else {
                                throw new Error('Erro ao realizar depósito');
                            }
                        } catch (error) {
                            handleError(error);
                        }
                    } else {
                        toast.error('Por favor, insira um valor válido.');
                    }
                });
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', async function(e) {
                e.stopPropagation();
                const casaId = this.getAttribute('data-id');
                const casaNome = this.getAttribute('data-nome');
                
                confirmModal.show(`Tem certeza que deseja excluir a casa ${casaNome}? Esta ação não pode ser desfeita.`, async (confirmed) => {
                    if (confirmed) {
                        try {
                            const response = await fetch(`${API_CASAS}/${casaId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });
                            
                            if (response.ok) {
                                toast.success(`Casa ${casaNome} excluída com sucesso!`);
                                // Reload data
                                loadDashboardSummary();
                                loadBettingHouses();
                                loadRecentTransactions();
                            } else {
                                throw new Error('Erro ao excluir casa de apostas');
                            }
                        } catch (error) {
                            handleError(error);
                        }
                    }
                }, 'Excluir Casa de Aposta');
            });
        });
        
        // Withdraw buttons
        document.querySelectorAll('.btn-withdraw').forEach(button => {
            button.addEventListener('click', async function(e) {
                e.stopPropagation();
                const casaId = this.getAttribute('data-id');
                const casaNome = this.getAttribute('data-nome');
                
                // Create a custom input modal instead of prompt
                const withdrawModal = document.createElement('div');
                withdrawModal.className = 'modal';
                withdrawModal.id = 'withdrawModal';
                
                withdrawModal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Saque de ${casaNome}</h2>
                            <span class="close-modal">&times;</span>
                        </div>
                        <div class="modal-body">
                            <form id="withdrawForm">
                                <div class="form-group">
                                    <label for="withdrawValue">Valor do Saque</label>
                                    <input type="number" id="withdrawValue" name="withdrawValue" placeholder="0.00" step="0.01" min="0" required>
                                </div>
                                <div class="form-actions">
                                    <button type="button" class="btn-outline" id="cancelWithdraw">Cancelar</button>
                                    <button type="submit" class="btn-primary">Confirmar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(withdrawModal);
                
                const modal = document.getElementById('withdrawModal');
                const closeBtn = modal.querySelector('.close-modal');
                const cancelBtn = document.getElementById('cancelWithdraw');
                const form = document.getElementById('withdrawForm');
                
                // Show modal
                openModal(modal);
                
                // Close events
                closeBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    closeAllModals();
                });
                
                cancelBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    closeAllModals();
                });
                
                // Form submission
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const valor = document.getElementById('withdrawValue').value;
                    
                    if (valor && !isNaN(valor) && parseFloat(valor) > 0) {
                        try {
                            const response = await fetch(API_TRANSACOES, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    casa_id: casaId,
                                    tipo: 'saque',
                                    valor: parseFloat(valor),
                                    descricao: `Saque de ${casaNome}`
                                })
                            });
                            
                            if (response.ok) {
                                toast.success('Saque realizado com sucesso!');
                                // Reload data
                                loadDashboardSummary();
                                loadBettingHouses();
                                loadRecentTransactions();
                                document.body.removeChild(modal);
                                closeAllModals();
                            } else {
                                throw new Error('Erro ao realizar saque');
                            }
                        } catch (error) {
                            handleError(error);
                        }
                    } else {
                        toast.error('Por favor, insira um valor válido.');
                    }
                });
            });
        });
        
        // Edit Balance buttons
        document.querySelectorAll('.btn-edit-balance').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const casaId = this.getAttribute('data-id');
                const casaNome = this.getAttribute('data-nome');
                const saldoAtual = parseFloat(this.getAttribute('data-saldo'));
                const logo = this.getAttribute('data-logo');
                
                // Preencher o modal com os dados da casa
                document.getElementById('editHouseId').value = casaId;
                document.getElementById('editHouseName').textContent = casaNome;
                document.getElementById('editHouseLogo').src = logo;
                document.getElementById('currentBalance').value = formatCurrency(saldoAtual);
                document.getElementById('newBalance').value = saldoAtual.toFixed(2);
                
                // Abrir o modal
                openModal(editBalanceModal);
            });
        });
        
        // More button
        document.querySelectorAll('.btn-more').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const casaId = this.getAttribute('data-id');
                toast.info(`Mais opções para casa ID: ${casaId}`);
            });
        });
        
        // Card click (for details)
        document.querySelectorAll('.betting-house-card').forEach(card => {
            card.addEventListener('click', function(e) {
                if (!e.target.closest('button')) {
                    const casaId = this.getAttribute('data-id');
                    toast.info(`Detalhes da casa ID: ${casaId}`);
                }
            });
        });
    }
    
    // Modal functions
    const addHouseModal = document.getElementById('addHouseModal');
    const editBalanceModal = document.getElementById('editBalanceModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const cancelAddBtn = document.getElementById('cancelAddHouse');
    const cancelEditBtn = document.getElementById('cancelEditBalance');
    const addHouseForm = document.getElementById('addHouseForm');
    const editBalanceForm = document.getElementById('editBalanceForm');
    
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
    
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeAllModals);
    }
    
    // Add new betting house button
    const addHouseBtn = document.querySelector('.section-header .btn-primary');
    
    if (addHouseBtn) {
        addHouseBtn.addEventListener('click', function() {
            openModal(addHouseModal);
        });
    }
    
    // Add house form submission
    if (addHouseForm) {
        addHouseForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const houseName = document.getElementById('houseName').value.trim();
            const houseLogo = document.getElementById('houseLogo').value.trim();
            const initialBalance = parseFloat(document.getElementById('initialBalance').value) || 0;
            
            if (!houseName) {
                toast.error('O nome da casa de apostas é obrigatório!');
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
                        logo: houseLogo || `https://via.placeholder.com/50?text=${encodeURIComponent(houseName)}`,
                        saldo: initialBalance
                    })
                });
                
                if (response.ok) {
                    // Close modal
                    closeAllModals();
                    
                    // Show success message
                    toast.success('Casa de apostas adicionada com sucesso!');
                    
                    // Reload data
                    loadDashboardSummary();
                    loadBettingHouses();
                } else {
                    throw new Error('Erro ao adicionar casa de apostas');
                }
            } catch (error) {
                handleError(error);
            }
        });
    }
    
    // Edit balance form submission
    if (editBalanceForm) {
        editBalanceForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const casaId = document.getElementById('editHouseId').value;
            const casaNome = document.getElementById('editHouseName').textContent;
            const newBalance = parseFloat(document.getElementById('newBalance').value);
            const balanceNote = document.getElementById('balanceNote').value.trim();
            
            if (isNaN(newBalance) || newBalance < 0) {
                toast.error('Por favor, insira um valor de saldo válido!');
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
                                valor: 0,  // Valor 0 porque já atualizamos o saldo diretamente
                                descricao: `Ajuste manual de saldo: ${balanceNote}`
                            })
                        });
                    }
                    
                    // Fechar modal
                    closeAllModals();
                    
                    // Mostrar mensagem de sucesso
                    toast.success(`Saldo de ${casaNome} atualizado com sucesso!`);
                    
                    // Recarregar dados
                    loadDashboardSummary();
                    loadBettingHouses();
                    loadRecentTransactions();
                } else {
                    throw new Error('Erro ao atualizar saldo');
                }
            } catch (error) {
                handleError(error);
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
