document.addEventListener('DOMContentLoaded', function() {
    // Prevenir múltiplas inicializações
    if (window.sportsBetDetailInitialized) {
        return;
    }
    window.sportsBetDetailInitialized = true;
    
    // Sistema global de throttling para toasts
    if (!window.toastThrottle) {
        window.toastThrottle = new Map();
    }
    
    // Função helper para toasts com throttling
    const throttledToast = {
        success: (message) => {
            const key = `success-${message}`;
            const now = Date.now();
            if (window.toastThrottle.has(key) && now - window.toastThrottle.get(key) < 3000) {
                return;
            }
            window.toastThrottle.set(key, now);
            toast.success(message);
        },
        error: (message) => {
            const key = `error-${message}`;
            const now = Date.now();
            if (window.toastThrottle.has(key) && now - window.toastThrottle.get(key) < 3000) {
                return;
            }
            window.toastThrottle.set(key, now);
            toast.error(message);
        },
        info: (message) => {
            const key = `info-${message}`;
            const now = Date.now();
            if (window.toastThrottle.has(key) && now - window.toastThrottle.get(key) < 3000) {
                return;
            }
            window.toastThrottle.set(key, now);
            toast.info(message);
        }
    };
    
    const bankrollId = new URLSearchParams(window.location.search).get('id');

    // Formatação de moeda e data
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    };

    // Função helper para formatar status
    const formatStatus = (status) => {
        if (!status) return 'Pendente';
        const statusLower = status.toLowerCase();
        switch (statusLower) {
            case 'ganha':
            case 'ganhou':
            case 'win':
                return 'Ganha';
            case 'perdida':
            case 'perdeu':
            case 'loss':
                return 'Perdida';
            case 'pendente':
            case 'pending':
            default:
                return 'Pendente';
        }
    };

    // Variável global para controlar a página atual
    let currentPage = 1;
    const entriesPerPage = 5;
    
    // Variáveis para controle de edição
    let isEditMode = false;
    let editingEntryId = null;

    // Função para buscar e renderizar entradas de apostas esportivas
    async function fetchSportsBetEntries(filters = {}, page = 1) {
        if (!bankrollId) return;

        const entriesTableBody = document.getElementById('entriesTableBody');
        entriesTableBody.innerHTML = '<tr><td colspan="10" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Carregando apostas...</td></tr>';

        try {
            let apiUrl = `/api/sports-bet/entries/${bankrollId}`;
            const queryParams = new URLSearchParams();
            if (filters.period) queryParams.append('period', filters.period);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.search) queryParams.append('search', filters.search);
            queryParams.append('page', page);
            queryParams.append('limit', entriesPerPage);
            
            apiUrl += `?${queryParams.toString()}`;

            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Erro ao buscar entradas de apostas esportivas');
            }
            const data = await response.json();
            currentPage = page;
            renderEntriesTable(data.entries);
            renderPagination(data.pagination);
        } catch (error) {
            console.error('Erro ao buscar entradas:', error);
            entriesTableBody.innerHTML = `<tr><td colspan="10" class="empty-state"><div class="empty-state-content"><i class="fas fa-exclamation-triangle"></i><h3>Erro ao carregar apostas</h3><p>${error.message}</p></div></td></tr>`;
        }
    }

    function renderEntriesTable(entries) {
        const entriesTableBody = document.getElementById('entriesTableBody');
        entriesTableBody.innerHTML = '';

        if (entries.length === 0) {
            entriesTableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <div class="empty-state-content">
                            <i class="fas fa-futbol"></i>
                            <h3>Nenhuma aposta encontrada</h3>
                            <p>Adicione uma nova aposta usando o botão "Nova Aposta" ou ajuste os filtros.</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        entries.forEach(entry => {
            let exchangeInfo = '';
            if (entry.is_exchange) {
                const exchangeType = entry.bet_type === 'lay' ? 'Lay' : 'Back';
                const commission = entry.commission ? ` (${entry.commission}%)` : '';
                exchangeInfo = ` <span style="background: var(--accent-color); color: white; padding: 1px 4px; border-radius: 3px; font-size: 0.7rem;">${exchangeType}${commission}</span>`;
            }

            const logoPath = getLogoPath(entry.casa_apostas);
            const lucro = parseFloat(entry.lucro_total);
            
            // Determinar classe do lucro
            let profitClass = 'profit-zero';
            if (lucro > 0) profitClass = 'profit-positive';
            else if (lucro < 0) profitClass = 'profit-negative';
            
            // Determinar status
            const status = entry.status ? entry.status.toLowerCase() : 'pendente';
            const statusText = formatStatus(entry.status);

            const row = entriesTableBody.insertRow();
            row.innerHTML = `
                <td class="date-cell">${formatDate(entry.data_evento)}</td>
                <td class="creation-date-cell">${formatDate(entry.data_criacao)}</td>
                <td class="event-cell">
                    <div style="font-weight: 500; margin-bottom: 4px;">
                        ${entry.evento}
                        ${entry.bonus ? '<span style="background: var(--success-color); color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 8px;"><i class="fas fa-gift"></i> Gera Bônus</span>' : ''}
                        ${entry.used_bonus_value ? '<span style="background: var(--primary-color); color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 8px;"><i class="fas fa-star"></i> Usou Bônus</span>' : ''}
                    </div>
                    <div style="color: var(--text-light); font-size: 0.85rem; margin-bottom: 3px;">
                        ${entry.competicao || ''}
                    </div>
                    ${entry.used_bonus_value ? `
                        <div class="bonus-info-card used">
                            <div style="display: flex; align-items: center; gap: 6px; font-weight: 600;">
                                <i class="fas fa-arrow-down" style="font-size: 0.7rem; color: #1976d2;"></i>
                                <span style="color: #1976d2; font-size: 0.75rem;">Usou:</span>
                                <span style="color: #1565c0; font-weight: 700;">${formatCurrency(entry.used_bonus_value)}</span>
                                <span style="background: #1976d2; color: white; padding: 1px 6px; border-radius: 8px; font-size: 0.7rem; font-weight: 600;">${entry.used_bonus_house}</span>
                            </div>
                        </div>
                    ` : ''}
                    ${entry.bonus && entry.bonus_value ? `
                        <div class="bonus-info-card generated">
                            <div style="display: flex; align-items: center; gap: 6px; font-weight: 600;">
                                <i class="fas fa-arrow-up" style="font-size: 0.7rem; color: #2e7d32;"></i>
                                <span style="color: #2e7d32; font-size: 0.75rem;">Gera:</span>
                                <span style="color: #1b5e20; font-weight: 700;">${formatCurrency(entry.bonus_value)}</span>
                                <span style="background: #2e7d32; color: white; padding: 1px 6px; border-radius: 8px; font-size: 0.7rem; font-weight: 600;">${entry.bonus_house}</span>
                            </div>
                            ${entry.bonus_expiry_date ? `
                                <div style="margin-top: 2px; font-size: 0.65rem; color: #666; display: flex; align-items: center; gap: 3px;">
                                    <i class="fas fa-calendar-times"></i>
                                    <span>Exp: ${new Date(entry.bonus_expiry_date).toLocaleDateString('pt-BR')}</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </td>
                <td class="house-cell">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <img src="${logoPath}" alt="${entry.casa_apostas}" style="width: 20px; height: 20px; object-fit: contain; border-radius: 3px;">
                        <div>
                            <div style="font-weight: 500;">${entry.casa_apostas}${exchangeInfo}</div>
                            <small style="color: var(--text-light); font-size: 0.75rem;">${entry.mercado || 'Mercado não informado'}</small>
                        </div>
                    </div>
                </td>
                <td class="odds-cell">
                    <span style="color: var(--accent-color); font-weight: 600; font-size: 1.1rem;">${parseFloat(entry.odds || 0).toFixed(2)}</span>
                    ${entry.is_freebet ? '<small style="display: block; color: var(--success-color); font-size: 0.7rem;"><i class="fas fa-gift"></i> Freebet</small>' : ''}
                </td>
                <td class="value-cell">${formatCurrency(entry.valor_apostado)}</td>
                <td class="value-cell">${formatCurrency(entry.retorno_potencial)}</td>
                <td class="profit-cell">
                    <span class="${profitClass}">${formatCurrency(entry.lucro_total)}</span>
                </td>
                <td class="status-cell">
                    <select class="status-dropdown" data-entry-id="${entry.id}" data-current-status="${status}">
                        <option value="pendente" ${status === 'pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="ganha" ${status === 'ganha' ? 'selected' : ''}>Ganha</option>
                        <option value="perdida" ${status === 'perdida' ? 'selected' : ''}>Perdida</option>
                    </select>
                </td>
                <td class="actions-cell">
                    <a href="#" class="action-btn" title="Ver Detalhes" data-entry-id="${entry.id}">
                        <i class="fas fa-eye"></i>
                    </a>
                    <a href="#" class="action-btn edit" title="Editar" data-entry-id="${entry.id}">
                        <i class="fas fa-edit"></i>
                    </a>
                    <a href="#" class="action-btn delete" title="Excluir" data-entry-id="${entry.id}">
                        <i class="fas fa-trash"></i>
                    </a>
                </td>
            `;
        });
        
        // Aplicar cores iniciais aos dropdowns de status
        const statusDropdowns = entriesTableBody.querySelectorAll('.status-dropdown');
        statusDropdowns.forEach(dropdown => {
            const status = dropdown.dataset.currentStatus;
            updateStatusDropdownColor(dropdown, status);
        });
    }

    // Função para renderizar controles de paginação
    function renderPagination(pagination) {
        const paginationContainer = document.getElementById('paginationContainer');
        if (!paginationContainer) return;

        if (pagination.totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination-controls">';
        
        // Botão Anterior
        if (pagination.hasPreviousPage) {
            paginationHTML += `<button class="pagination-btn" onclick="changePage(${pagination.currentPage - 1})">
                Anterior
            </button>`;
        }
        
        // Campo para ir para página específica
        paginationHTML += `
            <div class="page-jump">
                <span class="page-info">${pagination.currentPage} de ${pagination.totalPages}</span>
                <input type="number" id="pageInput" min="1" max="${pagination.totalPages}" 
                       value="${pagination.currentPage}" class="page-input" placeholder="${pagination.currentPage}"
                       onkeypress="if(event.key === 'Enter') goToPage()">
                <button class="btn-go" onclick="goToPage()">Ir</button>
            </div>
        `;
        
        // Botão Próximo
        if (pagination.hasNextPage) {
            paginationHTML += `<button class="pagination-btn" onclick="changePage(${pagination.currentPage + 1})">
                Próximo
            </button>`;
        }
        
        paginationHTML += '</div>';
        paginationContainer.innerHTML = paginationHTML;
    }

    // Função para mudar de página
    window.changePage = function(page) {
        const filters = getCurrentFilters();
        fetchSportsBetEntries(filters, page);
    };

    // Função para ir diretamente para uma página específica
    window.goToPage = function() {
        const pageInput = document.getElementById('pageInput');
        if (!pageInput) return;
        
        const targetPage = parseInt(pageInput.value);
        if (isNaN(targetPage) || targetPage < 1) {
            toast.warning('Por favor, digite um número de página válido.');
            return;
        }
        
        const filters = getCurrentFilters();
        fetchSportsBetEntries(filters, targetPage);
    };

    // Função para obter filtros atuais
    function getCurrentFilters() {
        const filters = {};
        const dateFilter = document.getElementById('dateFilterEntries');
        const statusFilter = document.getElementById('statusFilterEntries');
        const searchInput = document.getElementById('searchEntries');
        
        if (dateFilter && dateFilter.value !== 'all') filters.period = dateFilter.value;
        if (statusFilter && statusFilter.value !== 'all') filters.status = statusFilter.value;
        if (searchInput && searchInput.value.trim()) filters.search = searchInput.value.trim();
        
        return filters;
    }

    // Inicialização das tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabTarget = button.dataset.tab;
            
            // Remover classe active de todos os botões e panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Adicionar classe active ao botão clicado e ao pane correspondente
            button.classList.add('active');
            document.getElementById(tabTarget + 'Tab').classList.add('active');

            // Carregar dados específicos da aba
            if (tabTarget === 'statistics') {
                loadStatistics();
            } else if (tabTarget === 'bonus') {
                fetchBonusData();
            }
        });
    });

    // Ativar primeira aba por padrão
    if (tabButtons.length > 0) {
        tabButtons[0].classList.add('active');
        if (tabPanes.length > 0) {
            tabPanes[0].classList.add('active');
        }
    }

    // Event listeners para filtros de estatísticas
    const statsDateFilter = document.getElementById('statsDateFilter');
    const applyCustomDateBtn = document.getElementById('applyCustomDate');
    const customDateRange = document.getElementById('customDateRange');

    if (statsDateFilter) {
        statsDateFilter.addEventListener('change', function() {
            if (this.value === 'custom') {
                if (customDateRange) customDateRange.style.display = 'flex';
            } else {
                if (customDateRange) customDateRange.style.display = 'none';
                // Carregar estatísticas automaticamente quando mudar período
                loadStatistics();
            }
        });
    }

    if (applyCustomDateBtn) {
        applyCustomDateBtn.addEventListener('click', function() {
            loadStatistics();
        });
    }

    // Event listeners para o modal
    const newEntryModal = document.getElementById('newEntryModal');
    const addSportsBetEntryBtn = document.getElementById('addSportsBetEntryBtn');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const cancelEntryBtn = document.getElementById('cancelEntryBtn');
    const newEntryForm = document.getElementById('newEntryForm');

    if (addSportsBetEntryBtn) {
        addSportsBetEntryBtn.addEventListener('click', () => {
            clearModal();
            newEntryModal.classList.add('active');
        });
    }

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            newEntryModal.classList.remove('active');
        });
    });

    if (cancelEntryBtn) {
        cancelEntryBtn.addEventListener('click', () => {
            newEntryModal.classList.remove('active');
        });
    }

    // Fechar modal clicando fora
    window.addEventListener('click', (event) => {
        if (event.target === newEntryModal) {
            newEntryModal.classList.remove('active');
        }
    });

    // Submissão do formulário
    if (newEntryForm) {
        newEntryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveSportsBetEntry();
        });
    }

    // Event listeners para filtros
    const dateFilter = document.getElementById('dateFilterEntries');
    const statusFilter = document.getElementById('statusFilterEntries');
    const searchInput = document.getElementById('searchEntries');

    if (dateFilter) {
        dateFilter.addEventListener('change', applyFilters);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyFilters, 500));
    }

    // Event delegation para ações da tabela (prevenir duplicatas)
    if (!window.sportsBetTableClickHandlerAdded) {
        window.sportsBetTableClickHandlerAdded = true;
        document.addEventListener('click', async (e) => {
        if (e.target.closest('.action-btn.edit')) {
            e.preventDefault();
            const entryId = e.target.closest('.action-btn.edit').getAttribute('data-entry-id');
            await loadSportsBetForEdit(entryId);
        } else if (e.target.closest('.action-btn.delete')) {
            e.preventDefault();
            const entryId = e.target.closest('.action-btn.delete').getAttribute('data-entry-id');
            await deleteSportsBetEntry(entryId);
        } else if (e.target.closest('.action-btn') && !e.target.closest('.action-btn.edit') && !e.target.closest('.action-btn.delete')) {
            e.preventDefault();
            const entryId = e.target.closest('.action-btn').getAttribute('data-entry-id');
            await showSportsBetDetails(entryId);
        }
        });
    }

    // Event delegation para dropdowns de status (prevenir duplicatas)
    if (!window.sportsBetChangeHandlerAdded) {
        window.sportsBetChangeHandlerAdded = true;
        document.addEventListener('change', async (e) => {
            if (e.target.classList.contains('status-dropdown')) {
                const entryId = e.target.getAttribute('data-entry-id');
                const newStatus = e.target.value;
                await updateEntryStatus(entryId, newStatus, e.target);
            }
        });
    }

    // Função para limpar o modal
    function clearModal() {
        if (newEntryForm) {
            newEntryForm.reset();
        }
        editingEntryId = null;
        isEditMode = false;
        
        // Resetar campos específicos
        const bonusFields = document.getElementById('bonusFields');
        const exchangeFields = document.getElementById('exchangeFields');
        const liabilityRow = document.getElementById('liabilityRow');
        
        if (bonusFields) bonusFields.style.display = 'none';
        if (exchangeFields) exchangeFields.style.display = 'none';
        if (liabilityRow) liabilityRow.style.display = 'none';
        
        // Atualizar título do modal
        const modalTitle = document.querySelector('#newEntryModal h3');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-futbol"></i> Nova Aposta Esportiva';
        }
    }

    // Função para carregar aposta para edição
    async function loadSportsBetForEdit(entryId) {
        try {
            const response = await fetch(`/api/sports-bet/entries/single/${entryId}`);
            if (!response.ok) {
                throw new Error('Erro ao carregar dados da aposta');
            }
            
            const entry = await response.json();
            
            // Preencher o formulário
            document.getElementById('entryEvent').value = entry.evento || '';
            document.getElementById('entryCompetition').value = entry.competicao || '';
            
            // Converter data/hora
            if (entry.data_evento) {
                const eventDate = new Date(entry.data_evento);
                document.getElementById('entryDate').value = eventDate.toISOString().split('T')[0];
                document.getElementById('entryTime').value = eventDate.toTimeString().split(' ')[0].substring(0, 5);
            }
            
            // Dados da aposta
            document.getElementById('betHouse').value = entry.casa_apostas || '';
            document.getElementById('betMarket').value = entry.mercado || '';
            document.getElementById('betOdds').value = entry.odds || '';
            document.getElementById('betStake').value = entry.valor_apostado || '';
            
            // Exchange
            if (entry.is_exchange) {
                document.getElementById('isExchange').checked = true;
                toggleExchangeFields();
                if (entry.bet_type) document.getElementById('betType').value = entry.bet_type;
                if (entry.commission) document.getElementById('commission').value = entry.commission;
                if (entry.liability) document.getElementById('liability').value = entry.liability;
            }
            
            // Freebet
            if (entry.is_freebet) {
                document.getElementById('isFreebet').checked = true;
            }
            
            // Bônus
            if (entry.bonus) {
                document.getElementById('entryBonus').checked = true;
                toggleBonusFields();
                if (entry.bonus_value) document.getElementById('bonusValue').value = entry.bonus_value;
                if (entry.bonus_house) document.getElementById('bonusHouse').value = entry.bonus_house;
                if (entry.bonus_expiry_date) {
                    document.getElementById('bonusExpiryDate').value = entry.bonus_expiry_date.split('T')[0];
                }
            }
            
            // Observações
            document.getElementById('entryNotes').value = entry.observacoes || '';
            
            // Configurar modo de edição
            isEditMode = true;
            editingEntryId = entryId;
            
            // Atualizar título do modal
            const modalTitle = document.querySelector('#newEntryModal h3');
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Aposta Esportiva';
            }
            
            // Abrir modal
            newEntryModal.classList.add('active');
            
        } catch (error) {
            console.error('Erro ao carregar aposta para edição:', error);
            toast.error('Erro ao carregar dados da aposta: ' + error.message);
        }
    }

    // Função para salvar aposta esportiva
    async function saveSportsBetEntry() {
        // Prevenir múltiplas chamadas simultâneas
        if (window.sportsBetSaving) {
            return;
        }
        window.sportsBetSaving = true;
        
        try {
            const formData = {
                bankrollId: bankrollId,
                entryEvent: document.getElementById('entryEvent').value,
                entryCompetition: document.getElementById('entryCompetition').value,
                useExistingBonus: document.getElementById('useExistingBonus').value,
                entryDate: document.getElementById('entryDate').value,
                entryTime: document.getElementById('entryTime').value,
                betHouse: document.getElementById('betHouse').value,
                betMarket: document.getElementById('betMarket').value,
                betOdds: document.getElementById('betOdds').value,
                betStake: document.getElementById('betStake').value,
                isExchange: document.getElementById('isExchange').checked,
                betType: document.getElementById('betType').value,
                commission: document.getElementById('commission').value,
                liability: document.getElementById('liability').value,
                isFreebet: document.getElementById('isFreebet').checked,
                entryNotes: document.getElementById('entryNotes').value,
                entryBonus: document.getElementById('entryBonus').checked,
                bonusValue: document.getElementById('bonusValue').value,
                bonusHouse: document.getElementById('bonusHouse').value,
                bonusExpiryDate: document.getElementById('bonusExpiryDate').value
            };

            let url = '/api/sports-bet/entries';
            let method = 'POST';
            
            if (isEditMode && editingEntryId) {
                url = `/api/sports-bet/entries/${editingEntryId}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Erro ao salvar aposta');
            }

            const result = await response.json();
            
            newEntryModal.classList.remove('active');
            toast.success(result.msg);
            
            // Recarregar dados
            fetchSportsBetEntries();
            updateBalanceDisplay();
            loadHeaderStatistics();
            
            // Recarregar gráfico de evolução
            if (window.reloadEvolutionChart) {
                window.reloadEvolutionChart();
            }

        } catch (error) {
            console.error('Erro ao salvar aposta:', error);
            throttledToast.error('Erro ao salvar aposta: ' + error.message);
        } finally {
            // Limpar flag de salvamento
            window.sportsBetSaving = false;
        }
    }

    // Função para deletar entrada
    async function deleteSportsBetEntry(entryId) {
        try {
            // Usar o modal de confirmação customizado
            const confirmed = await confirmModal.delete(
                'Esta ação não pode ser desfeita. Tem certeza que deseja excluir esta aposta?',
                {
                    title: 'Confirmar Exclusão',
                    subtitle: 'Atenção: Esta ação é irreversível'
                }
            );
            
            if (!confirmed) {
                return;
            }
            const response = await fetch(`/api/sports-bet/entries/${bankrollId}/${entryId}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Erro ao excluir aposta');
            }
            
            const result = await response.json();
            throttledToast.success(result.msg);
            
            // Recarregar dados
            fetchSportsBetEntries();
            updateBalanceDisplay();
            loadHeaderStatistics();
            
            // Recarregar gráfico de evolução
            if (window.reloadEvolutionChart) {
                window.reloadEvolutionChart();
            }

        } catch (error) {
            console.error('Erro ao excluir aposta:', error);
            throttledToast.error('Erro ao excluir aposta: ' + error.message);
        }
    }

    // Função para aplicar filtros
    function applyFilters() {
        const filters = getCurrentFilters();
        fetchSportsBetEntries(filters, 1); // Sempre voltar para a primeira página ao filtrar
    }

    // Função para atualizar status da entrada
    async function updateEntryStatus(entryId, newStatus, selectElement) {
        // Prevenir múltiplas chamadas simultâneas para o mesmo entry
        const updateKey = `status-${entryId}`;
        if (window.statusUpdating && window.statusUpdating[updateKey]) {
            return;
        }
        if (!window.statusUpdating) window.statusUpdating = {};
        window.statusUpdating[updateKey] = true;
        
        const originalStatus = selectElement.dataset.currentStatus;
        
        try {
            const response = await fetch(`/api/sports-bet/entries/${entryId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Erro ao atualizar status');
            }

            const result = await response.json();
            selectElement.dataset.currentStatus = newStatus;
            updateStatusDropdownColor(selectElement, newStatus);
            throttledToast.success(result.msg);
            
            // Atualizar saldo se necessário
            updateBalanceDisplay();
            loadHeaderStatistics();
            
            // Recarregar gráfico de evolução
            if (window.reloadEvolutionChart) {
                window.reloadEvolutionChart();
            }

        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            throttledToast.error('Erro ao atualizar status: ' + error.message);
            
            // Reverter mudança no select
            selectElement.value = originalStatus;
            updateStatusDropdownColor(selectElement, originalStatus);
        } finally {
            // Limpar flag de atualização
            const updateKey = `status-${entryId}`;
            if (window.statusUpdating) {
                delete window.statusUpdating[updateKey];
            }
        }
    }

    // Função para atualizar cores do status dropdown
    function updateStatusDropdownColor(selectElement, status) {
        selectElement.dataset.currentStatus = status;
        
        // Remover classes anteriores
        selectElement.classList.remove('status-pendente', 'status-ganha', 'status-perdida');
        
        // Adicionar nova classe baseada no status
        if (status === 'pendente') {
            selectElement.classList.add('status-pendente');
        } else if (status === 'ganha') {
            selectElement.classList.add('status-ganha');
        } else if (status === 'perdida') {
            selectElement.classList.add('status-perdida');
        }
    }

    // Função para carregar estatísticas do header
    async function loadHeaderStatistics() {
        try {
            const response = await fetch(`/api/sports-bet/header-stats/${bankrollId}`);
            if (!response.ok) return;
            
            const stats = await response.json();
            
            const roiElement = document.getElementById('roiValue');
            const periodElement = document.getElementById('periodValue');
            
            if (roiElement) {
                roiElement.textContent = `${stats.roi.toFixed(2)}%`;
                roiElement.className = stats.roi > 0 ? 'positive' : stats.roi < 0 ? 'negative' : 'neutral';
            }
            
            if (periodElement) {
                periodElement.textContent = stats.period;
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas do header:', error);
        }
    }

    // Função para atualizar saldo
    async function updateBalanceDisplay() {
        try {
            const response = await fetch(`/api/bankrolls/${bankrollId}`);
            if (!response.ok) return;
            
            const bankroll = await response.json();
            const balanceElement = document.getElementById('currentBalance');
            
            if (balanceElement) {
                balanceElement.textContent = formatCurrency(bankroll.saldo_atual);
                balanceElement.className = bankroll.saldo_atual < 0 ? 'negative' : '';
            }
        } catch (error) {
            console.error('Erro ao atualizar saldo:', error);
        }
    }

    // Função para buscar dados de bônus
    async function fetchBonusData() {
        // Implementar se necessário
    }

    // Função para carregar estatísticas
    async function loadStatistics() {
        console.log('Carregando estatísticas...');
        
        try {
            const statsDateFilter = document.getElementById('statsDateFilter');
            const period = statsDateFilter ? statsDateFilter.value : '30';
            
            console.log('Período selecionado:', period);
            
            let url = `/api/sports-bet/statistics/${bankrollId}?period=${period}`;
            
            // Se for período personalizado, adicionar datas
            if (period === 'custom') {
                const startDate = document.getElementById('startDate')?.value;
                const endDate = document.getElementById('endDate')?.value;
                
                if (!startDate || !endDate) {
                    toast.error('Por favor, selecione as datas de início e fim');
                    return;
                }
                
                if (new Date(startDate) > new Date(endDate)) {
                    toast.error('A data de início deve ser anterior à data de fim');
                    return;
                }
                
                url += `&startDate=${startDate}&endDate=${endDate}`;
            }
            
            console.log('URL da requisição:', url);
            
            const response = await fetch(url);
            
            console.log('Status da resposta:', response.status);
            
            if (!response.ok) {
                throw new Error(`Erro na requisição: ${response.status}`);
            }
            
            const stats = await response.json();
            
            console.log('Dados de estatísticas recebidos:', stats);
            
            updateGeneralMetrics(stats.general);
            
            if (stats.profitByPeriod && stats.profitByPeriod.length > 0) {
                console.log('Criando gráfico de lucro por período...');
                createProfitByPeriodChart(stats.profitByPeriod);
            } else {
                console.log('Nenhum dado de lucro por período encontrado');
                const profitChart = document.getElementById('profitByPeriodChart');
                if (profitChart) {
                    profitChart.innerHTML = `
                        <div class="no-data-message">
                            <i class="fas fa-chart-line"></i>
                            <p>Nenhum dado de lucro disponível</p>
                            <small>Adicione apostas resolvidas para ver o gráfico</small>
                        </div>
                    `;
                }
            }
            
            if (stats.bookmakerDistribution && stats.bookmakerDistribution.length > 0) {
                console.log('Criando gráfico de distribuição por casas...');
                createBookmakerDistributionChart(stats.bookmakerDistribution);
            } else {
                console.log('Nenhum dado de distribuição por casas encontrado');
                const bookmakerChart = document.getElementById('bookmakerDistributionChart');
                if (bookmakerChart) {
                    bookmakerChart.innerHTML = `
                        <div class="no-data-message">
                            <i class="fas fa-chart-pie"></i>
                            <p>Nenhum dado de casas disponível</p>
                            <small>Adicione apostas para ver a distribuição</small>
                        </div>
                    `;
                }
            }
            
            console.log('Estatísticas carregadas com sucesso');
            
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            toast.error('Erro ao carregar estatísticas: ' + error.message);
        }
    }

    // Função para atualizar métricas gerais
    function updateGeneralMetrics(generalStats) {
        const elements = {
            totalBetsCount: document.getElementById('totalBetsCount'),
            totalProfit: document.getElementById('totalProfit'),
            averageROI: document.getElementById('averageROI'),
            averageStake: document.getElementById('averageStake')
        };

        if (elements.totalBetsCount) {
            elements.totalBetsCount.textContent = generalStats.totalBets.toString();
        }
        if (elements.totalProfit) {
            elements.totalProfit.textContent = formatCurrency(generalStats.totalProfit);
            elements.totalProfit.className = generalStats.totalProfit > 0 ? 'positive' : generalStats.totalProfit < 0 ? 'negative' : '';
        }
        if (elements.averageROI) {
            elements.averageROI.textContent = `${generalStats.averageROI.toFixed(2)}%`;
            elements.averageROI.className = generalStats.averageROI > 0 ? 'positive' : generalStats.averageROI < 0 ? 'negative' : '';
        }
        if (elements.averageStake) {
            elements.averageStake.textContent = formatCurrency(generalStats.averageStake);
        }
    }

    // Função para criar gráfico de lucro por período
    function createProfitByPeriodChart(profitData) {
        const ctx = document.getElementById('profitByPeriodChart');
        if (!ctx) {
            console.error('Elemento profitByPeriodChart não encontrado');
            return;
        }

        console.log('Criando gráfico de lucro com dados:', profitData);

        // Limpar conteúdo anterior
        ctx.innerHTML = '';
        
        // Criar canvas
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 200;
        ctx.appendChild(canvas);

        // Destruir gráfico existente se houver
        if (window.profitChart) {
            window.profitChart.destroy();
        }

        if (!profitData || profitData.length === 0) {
            ctx.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-chart-line"></i>
                    <p>Nenhum dado disponível</p>
                    <small>Adicione apostas resolvidas para ver o gráfico</small>
                </div>
            `;
            return;
        }

        const labels = profitData.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        });

        const data = profitData.map(item => parseFloat(item.daily_profit || 0));

        try {
            window.profitChart = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Lucro Diário',
                        data: data,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return formatCurrency(value);
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return 'Lucro: ' + formatCurrency(context.parsed.y);
                                }
                            }
                        },
                        legend: {
                            display: false
                        }
                    }
                }
            });
            console.log('Gráfico de lucro criado com sucesso');
        } catch (error) {
            console.error('Erro ao criar gráfico de lucro:', error);
            ctx.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erro ao carregar gráfico</p>
                </div>
            `;
        }
    }

    // Função para criar gráfico de distribuição por casas
    function createBookmakerDistributionChart(bookmakerData) {
        const ctx = document.getElementById('bookmakerDistributionChart');
        if (!ctx) {
            console.error('Elemento bookmakerDistributionChart não encontrado');
            return;
        }

        console.log('Criando gráfico de casas com dados:', bookmakerData);

        // Limpar conteúdo anterior
        ctx.innerHTML = '';
        
        // Criar canvas
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 200;
        ctx.appendChild(canvas);

        // Destruir gráfico existente se houver
        if (window.bookmakerChart) {
            window.bookmakerChart.destroy();
        }

        if (!bookmakerData || bookmakerData.length === 0) {
            ctx.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-chart-pie"></i>
                    <p>Nenhum dado disponível</p>
                    <small>Adicione apostas para ver a distribuição</small>
                </div>
            `;
            return;
        }

        const labels = bookmakerData.map(item => item.casa_apostas);
        const data = bookmakerData.map(item => parseInt(item.bet_count || 0));
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
            '#4BC0C0', '#FF6384'
        ];

        try {
            window.bookmakerChart = new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors.slice(0, data.length),
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: ${context.parsed} apostas (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
            console.log('Gráfico de casas criado com sucesso');
        } catch (error) {
            console.error('Erro ao criar gráfico de casas:', error);
            ctx.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erro ao carregar gráfico</p>
                </div>
            `;
        }
    }

    // Função para mostrar detalhes da aposta
    async function showSportsBetDetails(entryId) {
        try {
            const response = await fetch(`/api/sports-bet/entries/single/${entryId}`);
            if (!response.ok) {
                throw new Error('Erro ao buscar dados da entrada');
            }
            
            const entry = await response.json();
            
            // Criar modal de detalhes se não existir
            let detailsModal = document.getElementById('sportsBetDetailsModal');
            if (!detailsModal) {
                createSportsBetDetailsModal();
                detailsModal = document.getElementById('sportsBetDetailsModal');
            }
            
            // Preencher dados no modal
            populateSportsBetDetailsModal(entry);
            
            // Abrir modal
            detailsModal.classList.add('active');
            
        } catch (error) {
            console.error('Erro ao carregar detalhes da entrada:', error);
            toast.error('Erro ao carregar detalhes da entrada');
        }
    }

    // Função para criar o modal de detalhes
    function createSportsBetDetailsModal() {
        const modalHTML = `
            <div id="sportsBetDetailsModal" class="modal">
                <div class="modal-content details-modal-content">
                    <div class="modal-header details-header">
                        <div class="header-content">
                            <div class="header-icon">
                                <i class="fas fa-eye"></i>
                            </div>
                            <div class="header-text">
                                <h3>Detalhes da Aposta Esportiva</h3>
                                <p>Informações completas da aposta</p>
                            </div>
                        </div>
                        <button class="close-modal details-close" type="button">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body-scrollable details-body">
                        <!-- Informações Gerais -->
                        <div class="details-section">
                            <div class="section-header">
                                <i class="fas fa-info-circle"></i>
                                <h4>Informações Gerais</h4>
                            </div>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <label>Evento:</label>
                                    <span id="detailsEvento">-</span>
                                </div>
                                <div class="detail-item">
                                    <label>Competição:</label>
                                    <span id="detailsCompeticao">-</span>
                                </div>
                                <div class="detail-item">
                                    <label>Data do Evento:</label>
                                    <span id="detailsDataEvento">-</span>
                                </div>
                                <div class="detail-item">
                                    <label>Status:</label>
                                    <span id="detailsStatus" class="status-badge">-</span>
                                </div>
                                <div class="detail-item">
                                    <label>Data de Criação:</label>
                                    <span id="detailsDataCriacao">-</span>
                                </div>
                            </div>
                        </div>

                        <!-- Resumo Financeiro -->
                        <div class="details-section">
                            <div class="section-header">
                                <i class="fas fa-calculator"></i>
                                <h4>Resumo Financeiro</h4>
                            </div>
                            <div class="financial-summary">
                                <div class="summary-card">
                                    <div class="summary-label">Valor Apostado</div>
                                    <div class="summary-value" id="detailsValorApostado">R$ 0,00</div>
                                </div>
                                <div class="summary-card">
                                    <div class="summary-label">Retorno Potencial</div>
                                    <div class="summary-value" id="detailsRetornoPotencial">R$ 0,00</div>
                                </div>
                                <div class="summary-card profit-card">
                                    <div class="summary-label">Lucro/Prejuízo</div>
                                    <div class="summary-value" id="detailsLucroTotal">R$ 0,00</div>
                                </div>
                                <div class="summary-card">
                                    <div class="summary-label">ROI</div>
                                    <div class="summary-value" id="detailsROI">0%</div>
                                </div>
                            </div>
                        </div>

                        <!-- Detalhes da Aposta -->
                        <div class="details-section">
                            <div class="section-header">
                                <i class="fas fa-futbol"></i>
                                <h4>Detalhes da Aposta</h4>
                            </div>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <label>Casa de Apostas:</label>
                                    <span id="detailsCasaApostas">-</span>
                                </div>
                                <div class="detail-item">
                                    <label>Mercado:</label>
                                    <span id="detailsMercado">-</span>
                                </div>
                                <div class="detail-item">
                                    <label>Odds:</label>
                                    <span id="detailsOdds">-</span>
                                </div>
                                <div class="detail-item">
                                    <label>Tipo:</label>
                                    <span id="detailsTipoAposta">Tradicional</span>
                                </div>
                            </div>
                        </div>

                        <!-- Exchange Info (se aplicável) -->
                        <div class="details-section" id="exchangeSection" style="display: none;">
                            <div class="section-header">
                                <i class="fas fa-exchange-alt"></i>
                                <h4>Informações de Exchange</h4>
                            </div>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <label>Tipo de Aposta:</label>
                                    <span id="detailsBetType">-</span>
                                </div>
                                <div class="detail-item">
                                    <label>Comissão:</label>
                                    <span id="detailsCommission">-</span>
                                </div>
                                <div class="detail-item">
                                    <label>Responsabilidade:</label>
                                    <span id="detailsLiability">-</span>
                                </div>
                            </div>
                        </div>

                        <!-- Informações de Bônus -->
                        <div class="details-section" id="bonusSection" style="display: none;">
                            <div class="section-header">
                                <i class="fas fa-gift"></i>
                                <h4>Informações de Bônus</h4>
                            </div>
                            <div id="bonusDetailsContainer">
                                <!-- Informações de bônus serão inseridas aqui -->
                            </div>
                        </div>

                        <!-- Observações -->
                        <div class="details-section" id="notesSection" style="display: none;">
                            <div class="section-header">
                                <i class="fas fa-sticky-note"></i>
                                <h4>Observações</h4>
                            </div>
                            <div class="notes-content">
                                <p id="detailsNotes">-</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer details-footer">
                        <button type="button" class="btn-close-details">
                            <i class="fas fa-times"></i>
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Adicionar event listeners
        const modal = document.getElementById('sportsBetDetailsModal');
        const closeBtn = modal.querySelector('.details-close');
        const footerCloseBtn = modal.querySelector('.btn-close-details');
        
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
        footerCloseBtn.addEventListener('click', () => modal.classList.remove('active'));
        
        // Fechar ao clicar fora do modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
        
        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                modal.classList.remove('active');
            }
        });
    }

    // Função para preencher dados no modal de detalhes
    function populateSportsBetDetailsModal(entry) {
        // Informações gerais
        document.getElementById('detailsEvento').textContent = entry.evento || '-';
        document.getElementById('detailsCompeticao').textContent = entry.competicao || '-';
        
        // Data do evento
        if (entry.data_evento) {
            const eventDate = new Date(entry.data_evento);
            document.getElementById('detailsDataEvento').textContent = eventDate.toLocaleString('pt-BR');
        } else {
            document.getElementById('detailsDataEvento').textContent = '-';
        }
        
        // Status
        const statusElement = document.getElementById('detailsStatus');
        const formattedStatus = formatStatus(entry.status);
        statusElement.textContent = formattedStatus;
        statusElement.className = `status-badge ${entry.status ? entry.status.toLowerCase() : 'pendente'}`;
        
        // Data de criação
        if (entry.data_criacao) {
            const creationDate = new Date(entry.data_criacao);
            document.getElementById('detailsDataCriacao').textContent = creationDate.toLocaleString('pt-BR');
        } else {
            document.getElementById('detailsDataCriacao').textContent = '-';
        }
        
        // Resumo financeiro
        document.getElementById('detailsValorApostado').textContent = formatCurrency(entry.valor_apostado || 0);
        document.getElementById('detailsRetornoPotencial').textContent = formatCurrency(entry.retorno_potencial || 0);
        
        const lucroTotal = parseFloat(entry.lucro_total || 0);
        const lucroElement = document.getElementById('detailsLucroTotal');
        lucroElement.textContent = formatCurrency(lucroTotal);
        lucroElement.className = `summary-value ${lucroTotal > 0 ? 'profit-positive' : lucroTotal < 0 ? 'profit-negative' : 'profit-zero'}`;
        
        // ROI
        const valorApostado = parseFloat(entry.valor_apostado || 0);
        const roi = valorApostado > 0 ? ((lucroTotal / valorApostado) * 100) : 0;
        document.getElementById('detailsROI').textContent = `${roi.toFixed(2)}%`;
        
        // Detalhes da aposta
        document.getElementById('detailsCasaApostas').textContent = entry.casa_apostas || '-';
        document.getElementById('detailsMercado').textContent = entry.mercado || '-';
        document.getElementById('detailsOdds').textContent = entry.odds ? parseFloat(entry.odds).toFixed(2) : '-';
        
        // Tipo de aposta
        let tipoAposta = 'Tradicional';
        if (entry.is_exchange) {
            tipoAposta = 'Exchange';
        }
        if (entry.is_freebet) {
            tipoAposta += ' (Freebet)';
        }
        document.getElementById('detailsTipoAposta').textContent = tipoAposta;
        
        // Exchange info
        const exchangeSection = document.getElementById('exchangeSection');
        if (entry.is_exchange) {
            exchangeSection.style.display = 'block';
            document.getElementById('detailsBetType').textContent = entry.bet_type === 'lay' ? 'Lay (Contra)' : 'Back (A Favor)';
            document.getElementById('detailsCommission').textContent = entry.commission ? `${entry.commission}%` : '-';
            document.getElementById('detailsLiability').textContent = entry.liability ? formatCurrency(entry.liability) : '-';
        } else {
            exchangeSection.style.display = 'none';
        }
        
        // Informações de bônus
        const bonusSection = document.getElementById('bonusSection');
        const bonusContainer = document.getElementById('bonusDetailsContainer');
        
        if (entry.bonus || entry.used_bonus_value) {
            bonusSection.style.display = 'block';
            let bonusHTML = '';
            
            if (entry.used_bonus_value) {
                bonusHTML += `
                    <div class="bonus-detail-card used">
                        <div class="bonus-detail-header">
                            <i class="fas fa-arrow-down"></i>
                            <h5>Bônus Utilizado</h5>
                        </div>
                        <div class="bonus-detail-content">
                            <div class="detail-item">
                                <label>Casa:</label>
                                <span>${entry.used_bonus_house || '-'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Valor:</label>
                                <span>${formatCurrency(entry.used_bonus_value)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            if (entry.bonus && entry.bonus_value) {
                bonusHTML += `
                    <div class="bonus-detail-card generated">
                        <div class="bonus-detail-header">
                            <i class="fas fa-arrow-up"></i>
                            <h5>Bônus Gerado</h5>
                        </div>
                        <div class="bonus-detail-content">
                            <div class="detail-item">
                                <label>Casa:</label>
                                <span>${entry.bonus_house || '-'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Valor:</label>
                                <span>${formatCurrency(entry.bonus_value)}</span>
                            </div>
                            ${entry.bonus_expiry_date ? `
                                <div class="detail-item">
                                    <label>Expira em:</label>
                                    <span>${new Date(entry.bonus_expiry_date).toLocaleDateString('pt-BR')}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
            
            bonusContainer.innerHTML = bonusHTML;
        } else {
            bonusSection.style.display = 'none';
        }
        
        // Observações
        const notesSection = document.getElementById('notesSection');
        if (entry.observacoes && entry.observacoes.trim()) {
            notesSection.style.display = 'block';
            document.getElementById('detailsNotes').textContent = entry.observacoes;
        } else {
            notesSection.style.display = 'none';
        }
    }

    // Funções auxiliares do formulário
    window.toggleBonusFields = function() {
        const bonusFields = document.getElementById('bonusFields');
        const entryBonus = document.getElementById('entryBonus');
        
        if (bonusFields) {
            bonusFields.style.display = entryBonus.checked ? 'block' : 'none';
        }
    };

    window.toggleExchangeFields = function() {
        const exchangeFields = document.getElementById('exchangeFields');
        const isExchange = document.getElementById('isExchange');
        
        if (exchangeFields) {
            exchangeFields.style.display = isExchange.checked ? 'block' : 'none';
        }
        
        if (isExchange.checked) {
            toggleLiabilityField();
        }
    };

    window.toggleLiabilityField = function() {
        const liabilityRow = document.getElementById('liabilityRow');
        const betType = document.getElementById('betType');
        
        if (liabilityRow && betType) {
            liabilityRow.style.display = betType.value === 'lay' ? 'block' : 'none';
            
            if (betType.value === 'lay') {
                calculateLiability();
            }
        }
    };

    window.calculateLiability = function() {
        const odds = parseFloat(document.getElementById('betOdds').value) || 0;
        const stake = parseFloat(document.getElementById('betStake').value) || 0;
        const liabilityInput = document.getElementById('liability');
        
        if (odds > 0 && stake > 0 && liabilityInput) {
            const liability = (odds - 1) * stake;
            liabilityInput.value = liability.toFixed(2);
        }
    };

    window.toggleFreebetOdds = function() {
        // Implementar lógica de freebet se necessário
    };

    window.handleExistingBonusSelection = function() {
        // Implementar lógica de seleção de bônus se necessário
    };

    // Event listeners para cálculos automáticos
    document.addEventListener('input', (e) => {
        if (e.target.id === 'betOdds' || e.target.id === 'betStake') {
            if (document.getElementById('betType') && document.getElementById('betType').value === 'lay') {
                calculateLiability();
            }
        }
    });

    // Função debounce para otimizar a busca
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Lista de casas de apostas para autocomplete
    const bettingHouses = [
        "BETANO", "SUPERBET", "REI DO PITACO", "SPORTINGBET", "BETBOO",
        "BIG", "APOSTAR", "BETNACIONAL", "KTO", "BETSSON",
        "GALERA.BET", "F12.BET", "LUVA.BET", "SPORTYBET", "ESTRELABET",
        "REALS", "UX", "BETFAIR", "7GAMES", "BETAO",
        "R7", "HIPERBET", "NOVIBET", "SEGURO BET", "KING PANDA",
        "9F", "6R", "BET.APP", "FOGO777", "P9",
        "BET365", "APOSTA GANHA", "BRAZINO777", "4WIN", "4PLAY",
        "PAGOL", "SEUBET", "H2 BET", "VBET", "CASA DE APOSTAS",
        "BETSUL", "ESPORTES DA SORTE", "ONABET", "BETFAST", "FAZ1BET",
        "TIVOBET", "SUPREMABET", "MAXIMABET", "XPBET", "BETESPORTE",
        "LANCE DE SORTE", "BETMGM", "BRAVO", "TRADICIONAL", "SORTE ONLINE",
        "PIXBET", "FLABET", "BET DA SORTE", "APOSTOU", "B1.BET",
        "BRBET", "BET GORILLAS", "BET BUFFALOS", "BET FALCONS", "BETBRA",
        "BOLSA DE APOSTA", "CASA DE APOSTAS", "FULLTBET", "STAKE", "BATEU BET",
        "HANZBET", "ESPORTIVA BET", "BETWARRIOR", "SORTENABET", "BETOU",
        "BETFUSION", "BANDBET", "AFUN", "6Z", "BLAZE",
        "JONBET", "7K", "CASSINO", "VERA", "UPBETBR",
        "9D", "WJCASINO", "ALFA.BET", "MMA", "BETVIP",
        "PAPIGAMES", "BET4", "APOSTA BET", "FAZ O BET", "ESPORTIVAVIP",
        "CBESPORTES", "DONOSDABOLA", "BR4BET", "GOL DE BET", "LOTOGREEN",
        "PINNACLE", "MATCHBOOK", "APOSTA1", "APOSTAMAX", "GINGABET",
        "QGBET", "VIVASORTE", "BACANAPLAY", "PLAYUZU", "BRASIL DA SORTE",
        "MULTIBET", "RICOBET", "BRXBET", "SPIN", "OLEYBET",
        "BETPARK", "MERIDIANBET", "LUCK.BET", "1 PRA 1", "STARTBET",
        "ESPORTE 365", "BET AKI", "JOGO DE OURO", "LÍDERBET", "GERALBET",
        "B2XBET", "BULLSBET", "JOGÃO", "BET.BET", "DONALDBET",
        "RIVALO", "A247", "MCGAMES"
    ];

    // Mapeamento de logos das casas de apostas
    const logoMapping = {
        "BET365": "BET365.png",
        "BETANO": "Betano.png",
        "SPORTINGBET": "sportingbet.png",
        "BETFAIR": "BETFAIR.png",
        "RIVALO": "RIVALO.png",
        "BETWAY": "betway.png",
        "PINNACLE": "PINNACLE.webp",
        "BETSSON": "Betsson.png",
        "BWIN": "bwin.png",
        "UNIBET": "unibet.png",
        "PAGOL": "Pagol.png",
        "SEUBET": "SEUBET.jpg",
        "H2 BET": "H2 BET.jpg",
        "VBET": "VBET.png",
        "CASA DE APOSTAS": "CASA DE APOSTAS.jpg",
        "BETSUL": "BETSUL.png",
        "ESPORTES DA SORTE": "ESPORTES DA SORTE.png",
        "ONABET": "ONABET.png",
        "BETFAST": "BETFAST.jpg",
        "FAZ1BET": "FAZ1BET.png",
        "TIVOBET": "tivobet.png",
        "SUPREMABET": "SUPREMABET.png",
        "MAXIMABET": "MAXIMABET.png",
        "XPBET": "XPBET.jpg",
        "BETESPORTE": "BETESPORTE.jpg",
        "LANCE DE SORTE": "LANCE DE SORTE.png",
        "BETMGM": "BETMGM.jpg",
        "BRAVO": "BRAVO.png",
        "TRADICIONAL": "TRADICIONAL.jpg",
        "BETBOO": "Betboo.jpg",
        "BETNACIONAL": "Betnacional.png",
        "SUPERBET": "Superbet.png",
        "GALERA.BET": "Galera.bet.png",
        "F12.BET": "F12.bet.png",
        "LUVA.BET": "luvabet.png",
        "PIXBET": "PIXBET.png",
        "BLAZE": "BLAZE.png",
        "STAKE": "STAKE.png",
        "KTO": "KTO.png",
        "NOVIBET": "NOVIBET.png",
        "APOSTA GANHA": "APOSTA GANHA.png",
        "BRAZINO777": "BRAZINO777.png",
        "ESTRELABET": "ESTRELABET.png",
        "REALS": "Reals.jpg",
        "MATCHBOOK": "MATCHBOOK.jpg",
        "REI DO PITACO": "Reidopitaco.png",
        "BIG": "Big.png",
        "APOSTAR": "Apostar.webp",
        "SPORTYBET": "SPORTYBET.png",
        "UX": "UX.png",
        "7GAMES": "7GAMES.jpg",
        "BETAO": "BETAO.png",
        "R7": "R7.jpg",
        "HIPERBET": "HIPERBET.jpg",
        "SEGURO BET": "SEGURO BET.jpg",
        "KING PANDA": "KING PANDA.jpg",
        "9F": "9F bet.png",
        "6R": "6R bet.jpg",
        "BET.APP": "betapp.png",
        "FOGO777": "FOGO777.png",
        "P9": "P9 bet.jpg",
        "4WIN": "4win bet.jpg",
        "4PLAY": "4PLAY bet.png",
        "SORTE ONLINE": "SORTE ONLINE.png",
        "FLABET": "FLABET.png",
        "BET DA SORTE": "BET DA SORTE.webp",
        "APOSTOU": "APOSTOU.jpg",
        "B1.BET": "B1.BET.png",
        "BRBET": "BRBET.jpg",
        "BET GORILLAS": "BET GORILLAS.png",
        "BET BUFFALOS": "betbuffalos.png",
        "BET FALCONS": "betfalcons.png",
        "BETBRA": "BETBRA.png",
        "BOLSA DE APOSTA": "BOLSA DE APOSTA.jpg",
        "FULLTBET": "FULLTBET.jpg",
        "BATEU BET": "BATEU BET.png",
        "HANZBET": "HANZBET.png",
        "ESPORTIVA BET": "ESPORTIVA BET.png",
        "BETWARRIOR": "BETWARRIOR.png",
        "SORTENABET": "SORTENABET.png",
        "BETOU": "BETOU.png",
        "BETFUSION": "BETFUSION.png",
        "BANDBET": "BANDBET.png",
        "AFUN": "AFUN.jpg",
        "6Z": "6z.png",
        "JONBET": "JONBET.png",
        "7K": "7K.jpg",
        "CASSINO": "CASSINO.jpg",
        "VERA": "VERA.png",
        "UPBETBR": "UPBETBR.jpg",
        "9D": "9D.png",
        "WJCASINO": "WJCASINO.jpg",
        "ALFA.BET": "ALFA.BET.png",
        "MMA": "MMA.png",
        "BETVIP": "BETVIP.png",
        "PAPIGAMES": "PAPIGAMES.png",
        "BET4": "BET4.png",
        "APOSTA BET": "APOSTA BET.svg",
        "FAZ O BET": "FAZ O BET.png",
        "ESPORTIVAVIP": "ESPORTIVAVIP.jpg",
        "CBESPORTES": "CBESPORTES.png",
        "DONOSDABOLA": "DONOSDABOLA.png",
        "BR4BET": "BR4BET.jpg",
        "GOL DE BET": "GOL DE BET.png",
        "LOTOGREEN": "LOTOGREEN.jpg",
        "APOSTA1": "APOSTA1.png",
        "APOSTAMAX": "APOSTAMAX.png",
        "GINGABET": "GINGABET.jpg",
        "QGBET": "QGBET.png",
        "VIVASORTE": "VIVASORTE.jpg",
        "BACANAPLAY": "BACANAPLAY.png",
        "PLAYUZU": "PLAYUZU.png",
        "BRASIL DA SORTE": "BRASIL DA SORTE.jpg",
        "MULTIBET": "MULTIBET.png",
        "RICOBET": "RICOBET.png",
        "BRXBET": "BRXBET.png",
        "SPIN": "SPIN.jpg",
        "OLEYBET": "OLEYBET.png",
        "BETPARK": "BETPARK.png",
        "MERIDIANBET": "MERIDIANBET.jpg",
        "LUCK.BET": "LUCK.BET.png",
        "1 PRA 1": "1 PRA 1.png",
        "STARTBET": "STARTBET.png",
        "ESPORTE 365": "ESPORTE 365.png",
        "BET AKI": "BET AKI.png",
        "JOGO DE OURO": "JOGO DE OURO.png",
        "LÍDERBET": "LÍDERBET.jpg",
        "GERALBET": "GERALBET.jpg",
        "B2XBET": "B2XBET.png",
        "BULLSBET": "BULLSBET.png",
        "JOGÃO": "JOGÃO.png",
        "BET.BET": "BET.BET.png",
        "DONALDBET": "DONALDBET.png",
        "A247": "A247.png",
        "MCGAMES": "MCGAMES.png"
    };

    // Função para obter o caminho do logo
    function getLogoPath(houseName) {
        if (!houseName) return '/images/bet-default-icon.png';
        const logoFile = logoMapping[houseName.toUpperCase()];
        return logoFile ? `/images/logos/${logoFile}` : '/images/bet-default-icon.png';
    }

    // Função para configurar autocomplete em campos de casa de apostas
    function setupBettingHouseAutocomplete(inputElement) {
        if (!inputElement) return;
        
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 8px 8px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;
        
        inputElement.parentElement.style.position = 'relative';
        inputElement.parentElement.appendChild(dropdown);
        
        function populateDropdown(filterValue = '') {
            dropdown.innerHTML = '';
            
            const filteredHouses = filterValue.length === 0 
                ? bettingHouses
                : bettingHouses.filter(house => 
                    house.toLowerCase().startsWith(filterValue.toLowerCase())
                ).slice(0, 10);
            
            if (filteredHouses.length === 0) {
                dropdown.style.display = 'none';
                return;
            }
            
            filteredHouses.forEach(house => {
                const option = document.createElement('div');
                option.textContent = house;
                option.style.cssText = `
                    padding: 12px 16px;
                    cursor: pointer;
                    border-bottom: 1px solid #f0f0f0;
                    transition: background-color 0.2s;
                `;
                
                option.addEventListener('mouseenter', function() {
                    this.style.backgroundColor = '#f8f9fa';
                });
                
                option.addEventListener('mouseleave', function() {
                    this.style.backgroundColor = 'white';
                });
                
                option.addEventListener('click', function() {
                    inputElement.value = house;
                    dropdown.style.display = 'none';
                    inputElement.focus();
                });
                
                dropdown.appendChild(option);
            });
            
            dropdown.style.display = 'block';
        }
        
        inputElement.addEventListener('focus', function() {
            populateDropdown(this.value);
        });
        
        inputElement.addEventListener('input', function() {
            populateDropdown(this.value);
        });
        
        document.addEventListener('click', function(e) {
            if (inputElement.parentElement && !inputElement.parentElement.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
        
        inputElement.addEventListener('keydown', function(e) {
            const options = dropdown.querySelectorAll('div');
            let selectedIndex = Array.from(options).findIndex(option => 
                option.style.backgroundColor === 'rgb(248, 249, 250)' || 
                option.style.backgroundColor === '#f8f9fa'
            );
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = selectedIndex < options.length - 1 ? selectedIndex + 1 : 0;
                updateSelection(options, selectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
                updateSelection(options, selectedIndex);
            } else if (e.key === 'Enter' && selectedIndex >= 0 && options[selectedIndex]) {
                e.preventDefault();
                options[selectedIndex].click();
            } else if (e.key === 'Escape') {
                dropdown.style.display = 'none';
            }
        });
        
        function updateSelection(options, selectedIndex) {
            options.forEach(option => option.style.backgroundColor = 'white');
            if (options[selectedIndex]) {
                options[selectedIndex].style.backgroundColor = '#f8f9fa';
            }
        }
    }

    // Configurar autocomplete para casas de apostas
    const betHouseInput = document.getElementById('betHouse');
    if (betHouseInput) {
        setupBettingHouseAutocomplete(betHouseInput);
    }

    const bonusHouseInput = document.getElementById('bonusHouse');
    if (bonusHouseInput) {
        setupBettingHouseAutocomplete(bonusHouseInput);
    }

    // Event listeners para a funcionalidade de PDF
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', openPdfConfigModal);
    }

    // Event listeners para o modal de configuração do PDF
    const closePdfConfigBtn = document.getElementById('closePdfConfigModal');
    const cancelPdfConfigBtn = document.getElementById('cancelPdfConfig');
    const pdfConfigForm = document.getElementById('pdfConfigForm');
    const pdfPeriodSelect = document.getElementById('pdfPeriodSelect');

    if (closePdfConfigBtn) {
        closePdfConfigBtn.addEventListener('click', closePdfConfigModal);
    }

    if (cancelPdfConfigBtn) {
        cancelPdfConfigBtn.addEventListener('click', closePdfConfigModal);
    }

    // Event listener para mudança no período
    if (pdfPeriodSelect) {
        pdfPeriodSelect.addEventListener('change', function() {
            const customRange = document.getElementById('pdfCustomDateRange');
            if (this.value === 'custom') {
                customRange.style.display = 'block';
            } else {
                customRange.style.display = 'none';
            }
            updatePdfPreview();
        });
    }

    // Event listeners para atualizar preview
    const pdfStartDate = document.getElementById('pdfStartDate');
    const pdfEndDate = document.getElementById('pdfEndDate');
    const includePendingEntries = document.getElementById('includePendingEntries');

    if (pdfStartDate) {
        pdfStartDate.addEventListener('change', updatePdfPreview);
    }

    if (pdfEndDate) {
        pdfEndDate.addEventListener('change', updatePdfPreview);
    }

    if (includePendingEntries) {
        includePendingEntries.addEventListener('change', updatePdfPreview);
    }

    // Event listener para o formulário de configuração do PDF
    if (pdfConfigForm) {
        pdfConfigForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Mostrar loading no botão
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando PDF...';

            try {
                // Coletar configurações
                const period = document.getElementById('pdfPeriodSelect').value;
                const startDate = document.getElementById('pdfStartDate').value;
                const endDate = document.getElementById('pdfEndDate').value;
                const includePending = document.getElementById('includePendingEntries').checked;
                const includeStatistics = document.getElementById('includeStatistics').checked;
                const includeBonus = document.getElementById('includeBonus').checked;
                const includeNotes = document.getElementById('includeNotes').checked;

                // Validar datas personalizadas
                if (period === 'custom') {
                    if (!startDate || !endDate) {
                        toast.error('Por favor, selecione as datas de início e fim para o período personalizado');
                        return;
                    }
                    if (new Date(startDate) > new Date(endDate)) {
                        toast.error('A data de início deve ser anterior à data de fim');
                        return;
                    }
                }

                // Fechar modal
                closePdfConfigModal();

                // Gerar PDF com configurações
                await generatePDFReport({
                    period,
                    startDate: period === 'custom' ? startDate : null,
                    endDate: period === 'custom' ? endDate : null,
                    includePending,
                    includeStatistics,
                    includeBonus,
                    includeNotes
                });

            } catch (error) {
                console.error('Erro ao configurar PDF:', error);
                toast.error('Erro ao gerar relatório: ' + error.message);
            } finally {
                // Restaurar botão
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // Fechar modal clicando fora
    const pdfConfigModal = document.getElementById('pdfConfigModal');
    if (pdfConfigModal) {
        pdfConfigModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closePdfConfigModal();
            }
        });
    }

    // Funcionalidade de Modal de Configuração do PDF
    function openPdfConfigModal() {
        const modal = document.getElementById('pdfConfigModal');
        modal.classList.add('active');
        
        // Definir data máxima como hoje
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('pdfEndDate').max = today;
        document.getElementById('pdfStartDate').max = today;
        
        // Definir valores padrão para datas personalizadas
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        document.getElementById('pdfStartDate').value = thirtyDaysAgo.toISOString().split('T')[0];
        document.getElementById('pdfEndDate').value = today;
        
        // Atualizar preview inicial
        updatePdfPreview();
    }

    async function updatePdfPreview() {
        const preview = document.getElementById('pdfPreview');
        const previewText = document.getElementById('pdfPreviewText');
        
        try {
            preview.classList.add('active');
            previewText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando...';
            
            const period = document.getElementById('pdfPeriodSelect').value;
            const startDate = document.getElementById('pdfStartDate').value;
            const endDate = document.getElementById('pdfEndDate').value;
            const includePending = document.getElementById('includePendingEntries').checked;
            
            // Construir URL para preview
            let previewUrl = `/api/sports-bet/entries/${bankrollId}?limit=1&page=1`;
            if (period !== 'all') {
                if (period === 'custom' && startDate && endDate) {
                    previewUrl += `&period=custom&startDate=${startDate}&endDate=${endDate}`;
                } else {
                    previewUrl += `&period=${period}`;
                }
            }
            if (!includePending) {
                previewUrl += `&status=ganha,perdida`;
            }
            
            const response = await fetch(previewUrl);
            const data = await response.json();
            
            const totalEntries = data.pagination?.totalEntries || 0;
            const periodName = period === 'custom' && startDate && endDate 
                ? `${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`
                : period === 'all' ? 'todo o período' : `últimos ${period} dias`;
            
            previewText.innerHTML = `📊 <strong>${totalEntries}</strong> apostas encontradas para <strong>${periodName}</strong>`;
            
        } catch (error) {
            console.error('Erro ao buscar preview:', error);
            previewText.innerHTML = '⚠️ Erro ao carregar preview';
        }
    }

    function closePdfConfigModal() {
        const modal = document.getElementById('pdfConfigModal');
        modal.classList.remove('active');
    }

    // Funcionalidade de Exportar PDF
    async function generatePDFReport(config = {}) {
        try {
            // Obter configurações do modal ou usar padrões
            const period = config.period || 'all';
            const startDate = config.startDate;
            const endDate = config.endDate;
            const includePending = config.includePending !== false;
            const includeStatistics = config.includeStatistics !== false;
            const includeBonus = config.includeBonus !== false;
            const includeNotes = config.includeNotes !== false;

            // Buscar todos os dados necessários
            
            // Buscar dados do bankroll
            const bankrollResponse = await fetch(`/api/bankrolls/${bankrollId}`);
            const bankrollData = await bankrollResponse.json();
            
            // Construir URL para entradas com filtros
            let entriesUrl = `/api/sports-bet/entries/${bankrollId}?limit=1000`;
            if (period !== 'all') {
                if (period === 'custom' && startDate && endDate) {
                    entriesUrl += `&period=custom&startDate=${startDate}&endDate=${endDate}`;
                } else {
                    entriesUrl += `&period=${period}`;
                }
            }
            if (!includePending) {
                entriesUrl += `&status=ganha,perdida`;
            }
            
            // Buscar entradas
            const entriesResponse = await fetch(entriesUrl);
            const entriesData = await entriesResponse.json();
            
            // Construir URL para estatísticas
            let statsUrl = `/api/sports-bet/statistics/${bankrollId}`;
            if (period !== 'all') {
                if (period === 'custom' && startDate && endDate) {
                    statsUrl += `?period=custom&startDate=${startDate}&endDate=${endDate}`;
                } else {
                    statsUrl += `?period=${period}`;
                }
            } else {
                statsUrl += `?period=all`;
            }
            
            // Buscar estatísticas se habilitado
            let statsData = {};
            if (includeStatistics) {
                const statsResponse = await fetch(statsUrl);
                statsData = await statsResponse.json();
            }
            
            // Buscar bônus se habilitado
            let bonusData = [];
            if (includeBonus) {
                try {
                    const bonusResponse = await fetch(`/api/user/bonus`);
                    bonusData = await bonusResponse.json();
                } catch (error) {
                    console.log('Erro ao buscar bônus (não crítico):', error);
                    bonusData = [];
                }
            }

            // Preencher template do PDF
            populatePDFTemplate(bankrollData, entriesData.entries || [], statsData, bonusData, {
                period,
                startDate,
                endDate,
                includePending,
                includeStatistics,
                includeBonus,
                includeNotes
            });
            
            // Gerar nome do arquivo baseado no período
            let periodText = '';
            if (period === 'custom' && startDate && endDate) {
                periodText = `${startDate}_${endDate}`;
            } else if (period !== 'all') {
                periodText = `${period}dias`;
            } else {
                periodText = 'completo';
            }
            
            // Configurações do PDF
            const options = {
                margin: [5, 5, 5, 5],
                filename: `relatorio-apostas-esportivas-${bankrollData.nome.replace(/\s+/g, '_')}-${periodText}-${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    letterRendering: true,
                    allowTaint: false
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait',
                    compress: true
                }
            };

            // Gerar PDF
            const element = document.getElementById('pdfReportTemplate').firstElementChild;
            element.style.display = 'block';
            
            await html2pdf().set(options).from(element).save();
            
            element.style.display = 'none';
            
            toast.success('Relatório PDF gerado com sucesso!');
            
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            toast.error('Erro ao gerar relatório PDF: ' + error.message);
        }
    }

    function populatePDFTemplate(bankroll, entries, statistics, bonus, config = {}) {
        const now = new Date();
        
        // Preencher dados básicos
        document.getElementById('pdfDate').textContent = now.toLocaleDateString('pt-BR');
        document.getElementById('pdfGeneratedDate').textContent = now.toLocaleString('pt-BR');
        
        // Informações do bankroll
        document.getElementById('pdfBankrollName').textContent = bankroll.nome;
        document.getElementById('pdfCurrentBalance').textContent = formatCurrency(bankroll.saldo_atual);
        document.getElementById('pdfROI').textContent = (bankroll.roi || '0') + '%';
        
        // Período analisado
        let periodText = '';
        if (config.period === 'custom' && config.startDate && config.endDate) {
            periodText = `${new Date(config.startDate).toLocaleDateString('pt-BR')} até ${new Date(config.endDate).toLocaleDateString('pt-BR')}`;
        } else if (config.period === 'all') {
            periodText = 'Todo o período';
        } else {
            periodText = `Últimos ${config.period} dias`;
        }
        document.getElementById('pdfPeriod').textContent = periodText;
        
        // Estatísticas gerais
        if (statistics.general) {
            document.getElementById('pdfTotalBets').textContent = statistics.general.totalBets || 0;
            document.getElementById('pdfTotalProfit').textContent = formatCurrency(statistics.general.totalProfit || 0);
            document.getElementById('pdfAverageROI').textContent = `${(statistics.general.averageROI || 0).toFixed(2)}%`;
            document.getElementById('pdfAverageStake').textContent = formatCurrency(statistics.general.averageStake || 0);
        }
        
        // Preencher tabela de entradas
        const entriesTableBody = document.getElementById('pdfEntriesTableBody');
        entriesTableBody.innerHTML = '';
        
        if (entries && entries.length > 0) {
            entries.forEach(entry => {
                const row = entriesTableBody.insertRow();
                const statusText = formatStatus(entry.status);
                const statusClass = entry.status === 'ganha' ? 'pdf-profit-positive' : 
                                  entry.status === 'perdida' ? 'pdf-profit-negative' : 'pdf-status-pending';
                
                row.innerHTML = `
                    <td>${formatDate(entry.data_evento)}</td>
                    <td>${entry.evento || 'N/A'}</td>
                    <td>${entry.casa_apostas || 'N/A'}</td>
                    <td>${formatCurrency(entry.valor_apostado)}</td>
                    <td>${formatCurrency(entry.retorno_potencial)}</td>
                    <td class="${entry.lucro_total > 0 ? 'pdf-profit-positive' : entry.lucro_total < 0 ? 'pdf-profit-negative' : 'pdf-profit-zero'}">${formatCurrency(entry.lucro_total)}</td>
                    <td class="${statusClass}">${statusText}</td>
                `;
            });
        } else {
            const row = entriesTableBody.insertRow();
            row.innerHTML = '<td colspan="7" class="pdf-empty-state">Nenhuma aposta encontrada para o período selecionado</td>';
        }
        
        // Preencher informações de bônus
        const bonusContent = document.getElementById('pdfBonusContent');
        if (config.includeBonus && bonus && bonus.length > 0) {
            let bonusHTML = '<div class="pdf-bonus-list">';
            bonus.forEach(b => {
                const statusClass = b.status.toLowerCase() === 'ativo' ? 'pdf-profit-positive' : 'pdf-profit-negative';
                bonusHTML += `
                    <div class="pdf-bonus-item">
                        <div class="pdf-bonus-info">
                            <span class="pdf-bonus-house">${b.bonus_house}</span>
                            <span class="pdf-bonus-value">${formatCurrency(b.bonus_value)}</span>
                            <span class="pdf-bonus-expiry">Expira: ${new Date(b.bonus_expiry_date).toLocaleDateString('pt-BR')}</span>
                            <span class="${statusClass}">${b.status}</span>
                        </div>
                    </div>
                `;
            });
            bonusHTML += '</div>';
            bonusContent.innerHTML = bonusHTML;
        } else {
            bonusContent.innerHTML = '<p class="pdf-empty-state">Nenhum bônus ativo no momento</p>';
        }
    }

    // Inicializar página
    fetchSportsBetEntries();
    loadHeaderStatistics();
    updateBalanceDisplay();
    
    // Carregar gráfico de evolução do bankroll
    loadEvolutionChart();
    
    // Armazenar referência para poder recarregar
    window.reloadEvolutionChart = loadEvolutionChart;

    // Event listener para navegação entre abas
    document.addEventListener('click', function(e) {
        if (e.target.closest('.tab-btn')) {
            const tabBtn = e.target.closest('.tab-btn');
            const tabName = tabBtn.getAttribute('data-tab');
            
            // Se clicou na aba de estatísticas, carregar os dados
            if (tabName === 'statistics') {
                loadStatistics();
            }
        }
    });

    // Função para carregar e renderizar o gráfico de evolução
    async function loadEvolutionChart() {
        if (!bankrollId) return;
        
        const chartContainer = document.getElementById('balanceChart');
        if (!chartContainer) return;
        
        try {
            const response = await fetch(`/api/sports-bet/evolution/${bankrollId}`);
            if (!response.ok) {
                throw new Error('Erro ao buscar dados de evolução');
            }
            
            const evolutionData = await response.json();
            
            // Verificar se há dados suficientes
            if (evolutionData.length === 0) {
                chartContainer.innerHTML = `
                    <div class="no-data-message">
                        <i class="fas fa-chart-line"></i>
                        <p>Ainda não há dados para mostrar a evolução</p>
                        <small>Adicione apostas esportivas para ver a evolução do bankroll</small>
                    </div>
                `;
                return;
            }
            
            // Preparar dados para o Chart.js
            const labels = evolutionData.map(item => {
                const date = new Date(item.data);
                return date.toLocaleDateString('pt-BR');
            });
            
            const data = evolutionData.map(item => parseFloat(item.saldo));
            
            // Limpar container e criar canvas
            chartContainer.innerHTML = '<canvas id="evolutionChart" width="400" height="200"></canvas>';
            const canvas = document.getElementById('evolutionChart');
            const ctx = canvas.getContext('2d');
            
            // Configurar cores baseadas na performance
            const isPositive = data[data.length - 1] >= data[0];
            const lineColor = isPositive ? '#28a745' : '#dc3545';
            const gradientColor = isPositive ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)';
            
            // Criar gradiente
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, gradientColor);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            // Criar o gráfico
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Saldo do Bankroll',
                        data: data,
                        borderColor: lineColor,
                        backgroundColor: gradient,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: lineColor,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: lineColor,
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return 'Saldo: ' + formatCurrency(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#6c757d',
                                font: {
                                    size: 11
                                }
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                                color: '#6c757d',
                                font: {
                                    size: 11
                                },
                                callback: function(value) {
                                    return formatCurrency(value);
                                }
                            }
                        }
                    },
                    elements: {
                        point: {
                            hoverBackgroundColor: lineColor
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('Erro ao carregar gráfico de evolução:', error);
            chartContainer.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erro ao carregar gráfico</p>
                    <small>Tente novamente mais tarde</small>
                </div>
            `;
        }
    }

    // Funcionalidade do Modal de Edição de Saldo
    class EditBalanceModal {
        constructor() {
            this.modal = document.getElementById('editBalanceModal');
            this.form = document.getElementById('editBalanceForm');
            this.currentBalanceDisplay = document.getElementById('currentBalanceDisplay');
            this.newBalanceInput = document.getElementById('newBalance');
            this.bankrollId = null;
            this.currentBalance = 0;
            
            this.init();
        }
        
        init() {
            // Usar uma função para tentar inicializar após o DOM estar pronto
            const tryInit = () => {
                const editBtn = document.getElementById('editBalanceBtn');
                const closeBtn = document.getElementById('closeEditBalanceModal');
                const cancelBtn = document.getElementById('cancelEditBalance');
                const overlay = this.modal?.querySelector('.modal-overlay');
                
                if (!editBtn) {
                    console.log('Botão de editar saldo não encontrado, tentando novamente...');
                    setTimeout(tryInit, 100);
                    return;
                }
                
                // Event listeners para abrir modal
                editBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.open();
                });
                
                // Event listeners para fechar modal
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.close());
                }
                
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => this.close());
                }
                
                if (overlay) {
                    overlay.addEventListener('click', () => this.close());
                }
                
                console.log('EditBalanceModal inicializado com sucesso');
            };
            
                         tryInit();
            
            // Event listener para o formulário
            if (this.form) {
                this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            }
            
            // Event listener para ESC key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal?.classList.contains('active')) {
                    this.close();
                }
            });
            
            // Obter ID do bankroll da URL
            const urlParams = new URLSearchParams(window.location.search);
            this.bankrollId = urlParams.get('id');
        }
        
        async open() {
            if (!this.modal) {
                console.error('Modal element not found');
                return;
            }
            
            try {
                // Buscar dados atuais do bankroll
                const response = await fetch(`/api/bankrolls/${this.bankrollId}`);
                if (!response.ok) {
                    throw new Error('Erro ao buscar dados do bankroll');
                }
                
                const bankrollData = await response.json();
                this.currentBalance = parseFloat(bankrollData.saldo_atual);
                
                // Atualizar display do saldo atual
                const formattedBalance = formatCurrency(this.currentBalance);
                if (this.currentBalanceDisplay) {
                    this.currentBalanceDisplay.textContent = formattedBalance;
                }
                
                // Limpar formulário
                this.form?.reset();
                if (this.newBalanceInput) {
                    this.newBalanceInput.value = '';
                }
                
                // Mostrar modal
                this.modal.classList.add('active');
                
                // Focar no input do novo saldo
                setTimeout(() => {
                    this.newBalanceInput?.focus();
                }, 300);
                
            } catch (error) {
                console.error('Erro ao abrir modal:', error);
                toast.error('Erro ao carregar dados do saldo');
            }
        }
        
        close() {
            if (this.modal) {
                this.modal.classList.remove('active');
            }
        }
        
        async handleSubmit(e) {
            e.preventDefault();
            
            const newBalance = parseFloat(this.newBalanceInput?.value);
            
            // Validações
            if (isNaN(newBalance)) {
                toast.error('Por favor, insira um valor válido para o saldo');
                return;
            }
            
            // Confirmar alteração se for uma mudança significativa
            const difference = Math.abs(newBalance - this.currentBalance);
            if (difference > 1000) {
                const confirmed = await confirmModal.confirm(
                    `Você está alterando o saldo de ${formatCurrency(this.currentBalance)} para ${formatCurrency(newBalance)}. Esta é uma alteração significativa. Deseja continuar?`,
                    {
                        title: 'Confirmar Alteração Significativa',
                        subtitle: 'Mudança de valor elevada detectada'
                    }
                );
                
                if (!confirmed) {
                    return;
                }
            }
            
            try {
                // Desabilitar botão de salvar
                const saveBtn = document.getElementById('saveEditBalance');
                const originalText = saveBtn?.innerHTML;
                if (saveBtn) {
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
                }
                
                // Enviar requisição para atualizar saldo
                const response = await fetch(`/api/bankrolls/${this.bankrollId}/saldo`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        saldo_atual: newBalance
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.msg || 'Erro ao atualizar saldo');
                }
                
                // Atualizar interface
                await updateBalanceDisplay();
                
                // Recarregar gráfico de evolução
                if (window.reloadEvolutionChart) {
                    window.reloadEvolutionChart();
                }
                
                // Fechar modal
                this.close();
                
                // Mostrar toast de sucesso
                const changeText = newBalance > this.currentBalance ? 'aumentado' : 'reduzido';
                toast.success(`Saldo ${changeText} com sucesso! Novo saldo: ${formatCurrency(newBalance)}`);
                
                // Recarregar entradas para refletir mudanças
                fetchSportsBetEntries();
                
            } catch (error) {
                console.error('Erro ao atualizar saldo:', error);
                toast.error(`Erro ao atualizar saldo: ${error.message}`);
            } finally {
                // Reabilitar botão de salvar
                const saveBtn = document.getElementById('saveEditBalance');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Alteração';
                }
            }
        }
    }

    // Inicializar modal de edição de saldo
    new EditBalanceModal();
}); 