document.addEventListener('DOMContentLoaded', function() {
    // Inject Toast Container
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);

    // Inject Confirm Modal HTML
    const confirmModalHTML = `
        <div id="confirmModalOverlay" class="confirm-modal-overlay">
            <div id="confirmModal" class="confirm-modal">
                <h4 id="confirmModalTitle" class="confirm-modal-title">Confirmação</h4>
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
    const confirmModalTitleEl = document.getElementById('confirmModalTitle');
    const confirmModalMessageEl = document.getElementById('confirmModalMessage');
    const confirmModalConfirmBtn = document.getElementById('confirmModalConfirmBtn');
    const confirmModalCancelBtn = document.getElementById('confirmModalCancelBtn');

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
            setTimeout(() => toast.remove(), 300); // Animation duration
        };
        toast.appendChild(closeButton);

        toastContainer.appendChild(toast);

        // Trigger reflow to enable animation
        toast.offsetHeight;
        toast.classList.add('toast--visible');

        setTimeout(() => {
            toast.classList.remove('toast--visible');
            toast.classList.add('toast--hiding');
            setTimeout(() => toast.remove(), 300); // Animation duration
        }, duration);
    }

    // --- Confirmation Modal Function ---
    function showConfirmModal(message, title = 'Confirmação') {
        return new Promise((resolve) => {
            confirmModalTitleEl.textContent = title;
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
    
    // Set up betting house events
    function setupBettingHouseEvents() {
        // Deposit buttons
        document.querySelectorAll('.btn-deposit').forEach(button => {
            button.addEventListener('click', async function(e) {
                e.stopPropagation();
                const casaId = this.getAttribute('data-id');
                const casaNome = this.getAttribute('data-nome');
                const valor = prompt(`Valor do depósito para ${casaNome}:`);
                
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
                            showToast('Depósito realizado com sucesso!', 'success');
                            // Reload data
                            loadDashboardSummary();
                            loadBettingHouses();
                            loadRecentTransactions();
                        } else {
                            const errorData = await response.json().catch(() => ({ message: 'Erro ao realizar depósito' }));
                            throw new Error(errorData.message || 'Erro ao realizar depósito');
                        }
                    } catch (error) {
                        handleError(error);
                    }
                } else if (valor !== null) {
                    showToast('Por favor, insira um valor válido.', 'warning');
                }
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', async function(e) {
                e.stopPropagation();
                const casaId = this.getAttribute('data-id');
                const casaNome = this.getAttribute('data-nome');
                
                const confirmed = await showConfirmModal(`Tem certeza que deseja excluir a casa ${casaNome}? Todas as transações associadas também serão excluídas. Esta ação não pode ser desfeita.`);
                
                if (confirmed) {
                    try {
                        const response = await fetch(`${API_CASAS}/${casaId}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (response.ok) {
                            showToast(`Casa ${casaNome} excluída com sucesso!`, 'success');
                            // Reload data
                            loadDashboardSummary();
                            loadBettingHouses();
                            loadRecentTransactions();
                        } else {
                            const errorData = await response.json().catch(() => ({ message: 'Erro ao excluir casa de apostas' }));
                            throw new Error(errorData.message || 'Erro ao excluir casa de apostas');
                        }
                    } catch (error) {
                        handleError(error);
                    }
                }
            });
        });
        
        // Withdraw buttons
        document.querySelectorAll('.btn-withdraw').forEach(button => {
            button.addEventListener('click', async function(e) {
                e.stopPropagation();
                const casaId = this.getAttribute('data-id');
                const casaNome = this.getAttribute('data-nome');
                const valor = prompt(`Valor do saque de ${casaNome}:`);
                
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
                            showToast('Saque realizado com sucesso!', 'success');
                            // Reload data
                            loadDashboardSummary();
                            loadBettingHouses();
                            loadRecentTransactions();
                        } else {
                            const errorData = await response.json().catch(() => ({ message: 'Erro ao realizar saque' }));
                            throw new Error(errorData.message || 'Erro ao realizar saque');
                        }
                    } catch (error) {
                        handleError(error);
                    }
                } else if (valor !== null) {
                    showToast('Por favor, insira um valor válido.', 'warning');
                }
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
                showToast(`Mais opções para casa ID: ${casaId}`, 'info');
            });
        });
        
        // Card click (for details)
        document.querySelectorAll('.betting-house-card').forEach(card => {
            card.addEventListener('click', function(e) {
                if (!e.target.closest('button')) {
                    const casaId = this.getAttribute('data-id');
                    // For now, a toast. This could navigate to a detail page or open a detailed modal.
                    showToast(`Detalhes da casa ID: ${casaId}. Clique nos botões para ações.`, 'info');
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
                        logo: houseLogo || `https://via.placeholder.com/50?text=${encodeURIComponent(houseName)}`,
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
