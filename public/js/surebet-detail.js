document.addEventListener('DOMContentLoaded', function() {
    const bankrollId = new URLSearchParams(window.location.search).get('id');

    // Formatação de moeda e data
    const formatCurrency = (value) => {
        return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + 
               date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    // Variável global para controlar a página atual
    let currentPage = 1;
    const entriesPerPage = 5;

    // Função para buscar e renderizar entradas de surebet
    async function fetchSurebetEntries(filters = {}, page = 1) {
        if (!bankrollId) return;

        const entriesTableBody = document.getElementById('entriesTableBody');
        entriesTableBody.innerHTML = '<tr><td colspan="9" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Carregando entradas...</td></tr>';

        try {
            let apiUrl = `/api/surebet/entries/${bankrollId}`;
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
                throw new Error(errorData.msg || 'Erro ao buscar entradas de surebet');
            }
            const data = await response.json();
            currentPage = page;
            renderEntriesTable(data.entries);
            renderPagination(data.pagination);
        } catch (error) {
            console.error('Erro ao buscar entradas:', error);
            entriesTableBody.innerHTML = `<tr><td colspan="9" class="empty-state"><div class="empty-state-content"><i class="fas fa-exclamation-triangle"></i><h3>Erro ao carregar entradas</h3><p>${error.message}</p></div></td></tr>`;
        }
    }

    function renderEntriesTable(entries) {
        const entriesTableBody = document.getElementById('entriesTableBody');
        entriesTableBody.innerHTML = ''; // Limpar tabela

        if (entries.length === 0) {
            entriesTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <div class="empty-state-content">
                            <i class="fas fa-list"></i>
                            <h3>Nenhuma entrada encontrada</h3>
                            <p>Adicione uma nova entrada usando o botão "Nova Entrada" ou ajuste os filtros.</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        entries.forEach(entry => {
            const casasApostas = entry.bets.map(b => {
                let exchangeInfo = '';
                if (b.is_exchange) {
                    const exchangeType = b.bet_type === 'lay' ? 'Lay' : 'Back';
                    const commission = b.commission ? ` (${b.commission}%)` : '';
                    exchangeInfo = ` <span style="background: var(--accent-color); color: white; padding: 1px 4px; border-radius: 3px; font-size: 0.7rem;">${exchangeType}${commission}</span>`;
                }
                const logoPath = getLogoPath(b.casa_apostas);
                return `<div style="margin-bottom: 4px; display: flex; align-items: flex-start; gap: 8px;"><img src="${logoPath}" alt="${b.casa_apostas}" style="width: 20px; height: 20px; object-fit: contain; border-radius: 3px; margin-top: 2px;"><div><div>${b.casa_apostas}${exchangeInfo} <span style="color: var(--primary-color); font-weight: 500;">(${formatCurrency(b.valor_apostado)})</span></div><small style="color: var(--text-light); font-size: 0.75rem;">${b.mercado || 'Mercado não informado'} - <span style="color: var(--accent-color); font-weight: 600;">${parseFloat(b.odds || 0).toFixed(2)}</span></small></div></div>`;
            }).join('');
            const valorTotalApostado = entry.bets.reduce((sum, b) => sum + parseFloat(b.valor_apostado), 0);
            const lucro = parseFloat(entry.lucro_total);
            
            // Determinar classe do lucro
            let profitClass = 'profit-zero';
            if (lucro > 0) profitClass = 'profit-positive';
            else if (lucro < 0) profitClass = 'profit-negative';
            
            // Determinar status
            const status = entry.status ? entry.status.toLowerCase() : 'pendente';
            const statusText = entry.status || 'Pendente';

            const row = entriesTableBody.insertRow();
            row.innerHTML = `
                <td class="date-cell">${formatDate(entry.data_evento)}</td>
                <td class="creation-date-cell">${formatDate(entry.data_criacao)}</td>
                <td class="event-cell">
                    <div style="font-weight: 500; margin-bottom: 2px;">
                        ${entry.evento}
                        ${entry.bonus ? '<span style="background: var(--success-color); color: white; padding: 2px 6px; border-radius: 12px; font-size: 0.7rem; margin-left: 8px;"><i class="fas fa-gift"></i> Bonus</span>' : ''}
                    </div>
                    <small style="color: var(--text-light); font-size: 0.8rem;">
                        ${entry.competicao || ''}
                        ${entry.bonus && entry.bonus_value ? `<br><div class="bonus-display"><div class="bonus-value"><i class="fas fa-gift"></i><span>${formatCurrency(entry.bonus_value)}</span><span style="color: #6c757d; font-weight: 500;">•</span><span style="color: #495057; font-weight: 600;">${entry.bonus_house}</span></div>${entry.bonus_expiry_date ? `<div class="bonus-expiry"><i class="fas fa-calendar-times"></i><span>Expira: ${formatDate(entry.bonus_expiry_date)}</span></div>` : ''}</div>` : ''}
                    </small>
                </td>
                <td class="house-cell">
                    <span style="font-weight: 500;">${casasApostas}</span>
                </td>
                <td class="value-cell">${formatCurrency(valorTotalApostado)}</td>
                <td class="value-cell">${formatCurrency(entry.retorno_total)}</td>
                <td class="profit-cell">
                    <span class="${profitClass}">${formatCurrency(entry.lucro_total)}</span>
                </td>
                <td class="status-cell">
                    <select class="status-dropdown" data-entry-id="${entry.id}" data-current-status="${status}">
                        <option value="pendente" ${status === 'pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="resolvido" ${status === 'resolvido' || status === 'complete' ? 'selected' : ''}>Resolvido</option>
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
        
        // Informações da página
        paginationHTML += `<span class="pagination-info">
            Página ${pagination.currentPage} de ${pagination.totalPages}
        </span>`;
        
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
        fetchSurebetEntries(filters, page);
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
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            tabPanes.forEach(pane => {
                pane.classList.toggle('active', pane.id === tabTarget + 'Tab');
            });

            if (tabTarget === 'entries') {
                fetchSurebetEntries(); // Carregar entradas ao abrir a aba
            }
        });
    });

    // Manipulação do modal de nova entrada
    const newEntryModal = document.getElementById('newEntryModal');
    const addSurebetEntryBtn = document.getElementById('addSurebetEntryBtn');
    const closeModalBtn = document.querySelector('.modal .close-modal');
    const cancelEntryBtn = document.getElementById('cancelEntryBtn');

    // Função para limpar o modal
    function clearModal() {
        // Limpar campos de informações do evento
        document.getElementById('entryEvent').value = '';
        document.getElementById('entryCompetition').value = '';
        document.getElementById('entryDate').value = '';
        document.getElementById('entryTime').value = '';
        document.getElementById('entryBonus').checked = false;
        document.getElementById('bonusValue').value = '';
        document.getElementById('bonusHouse').value = '';
        document.getElementById('bonusExpiryDate').value = '';
        
        // Ocultar campos de bonus
        const bonusFields = document.getElementById('bonusFields');
        if (bonusFields) {
            bonusFields.style.display = 'none';
        }
        
        // Limpar campos das apostas
        const betInputs = document.querySelectorAll('#newEntryModal input[type="text"], #newEntryModal input[type="number"]');
        betInputs.forEach(input => {
            if (input.id !== 'entryEvent' && input.id !== 'entryCompetition' && input.id !== 'entryDate' && input.id !== 'entryTime') {
                input.value = '';
            }
        });
        
        // Limpar checkboxes de exchange
        const exchangeCheckboxes = document.querySelectorAll('#newEntryModal input[type="checkbox"]');
        exchangeCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Limpar selects de tipo de aposta
        const betTypeSelects = document.querySelectorAll('#newEntryModal select');
        betTypeSelects.forEach(select => {
            select.value = '';
        });
        
        // Ocultar campos de exchange
        const exchangeFields = document.querySelectorAll('#newEntryModal .exchange-fields');
        exchangeFields.forEach(field => {
            field.style.display = 'none';
        });
        
        // Resetar contador de apostas para 2 (primeira e segunda aposta)
        betCount = 2;
        
        // Remover apostas extras (manter apenas as duas primeiras)
        const allBets = document.querySelectorAll('#newEntryModal .entry-bet');
        for (let i = 2; i < allBets.length; i++) {
            allBets[i].remove();
        }
        
        // Renumerar as apostas restantes
        renumberBets();
    }

    if (addSurebetEntryBtn) {
        addSurebetEntryBtn.addEventListener('click', () => {
            clearModal();
            newEntryModal.classList.add('active');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            newEntryModal.classList.remove('active');
        });
    }

    if (cancelEntryBtn) {
        cancelEntryBtn.addEventListener('click', () => {
            newEntryModal.classList.remove('active');
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === newEntryModal) {
            newEntryModal.classList.remove('active');
        }
    });

    // Botão para adicionar mais apostas no formulário
    const addMoreBetBtn = document.getElementById('addMoreBetBtn');
    const entryBetsContainer = document.getElementById('entryBetsContainer');
    let betCount = 2;

    // Função para renumerar todas as apostas
    function renumberBets() {
        const betElements = entryBetsContainer.querySelectorAll('.entry-bet');
        betElements.forEach((betElement, index) => {
            const betNumber = index + 1;
            
            // Atualiza o badge e título
            const badge = betElement.querySelector('.bet-badge');
            const title = betElement.querySelector('h5');
            if (badge) badge.textContent = betNumber;
            if (title) title.textContent = `Aposta ${betNumber}`;
            
            // Atualiza os IDs dos inputs e labels
            const inputsAndSelects = betElement.querySelectorAll('input, select');
            const labels = betElement.querySelectorAll('label');

            inputsAndSelects.forEach(el => {
                const oldId = el.id;
                if (oldId) {
                    const newId = oldId.replace(/\d+$/, '') + betNumber;
                    el.id = newId;
                }
            });

            labels.forEach(label => {
                const oldFor = label.getAttribute('for');
                if (oldFor) {
                    const newFor = oldFor.replace(/\d+$/, '') + betNumber;
                    label.setAttribute('for', newFor);
                }
            });
        });
        
        // Atualiza o contador global
        betCount = betElements.length;
        
        // Reconfigura autocomplete para todos os campos após renumeração
        betElements.forEach((betElement, index) => {
            const betNumber = index + 1;
            const betHouseInput = document.getElementById(`betHouse${betNumber}`);
            if (betHouseInput) {
                setupBettingHouseAutocomplete(betHouseInput);
            }
        });
    }

    if (addMoreBetBtn) {
        addMoreBetBtn.addEventListener('click', () => {
            betCount++;
            const newBet = document.createElement('div');
            newBet.className = 'entry-bet modern-bet-card';
            newBet.innerHTML = `
                <div class="bet-header">
                    <div class="bet-number">
                        <span class="bet-badge">${betCount}</span>
                        <h5>Aposta ${betCount}</h5>
                    </div>
                    <button type="button" class="btn-icon-small remove-bet"><i class="fas fa-times"></i></button>
                </div>
                
                <div class="bet-content">
                    <div class="form-row">
                        <div class="form-group modern-input">
                            <label for="betHouse${betCount}">
                                <i class="fas fa-home"></i>
                                Casa de Apostas
                            </label>
                            <input type="text" id="betHouse${betCount}" required placeholder="Ex: Sportingbet" autocomplete="off">
                        </div>
                        <div class="form-group modern-input">
                            <label for="betMarket${betCount}">
                                <i class="fas fa-target"></i>
                                Mercado
                            </label>
                            <input type="text" id="betMarket${betCount}" required placeholder="Ex: Mais/Menos Gols">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group modern-input">
                            <label for="betOdds${betCount}">
                                <i class="fas fa-percentage"></i>
                                Odds
                            </label>
                            <input type="number" id="betOdds${betCount}" required step="0.01" min="1" placeholder="2.00">
                        </div>
                        <div class="form-group modern-input">
                            <label for="betStake${betCount}">
                                <i class="fas fa-dollar-sign"></i>
                                Valor Apostado (R$)
                            </label>
                            <input type="number" id="betStake${betCount}" required step="0.01" min="0" placeholder="100.00">
                        </div>
                    </div>
                    
                    <!-- Exchange Options -->
                    <div class="form-row">
                        <div class="form-group modern-checkbox">
                            <label class="checkbox-container">
                                <input type="checkbox" id="isExchange${betCount}" onchange="toggleExchangeFields(${betCount})">
                                <span class="checkmark"></span>
                                <i class="fas fa-exchange-alt"></i>
                                É Exchange?
                            </label>
                        </div>
                    </div>
                    
                    <div class="exchange-fields" id="exchangeFields${betCount}" style="display: none;">
                        <div class="form-row">
                            <div class="form-group modern-input">
                                <label for="betType${betCount}">
                                    <i class="fas fa-arrows-alt-h"></i>
                                    Tipo de Aposta
                                </label>
                                <select id="betType${betCount}" onchange="toggleLiabilityField(${betCount})">
                                    <option value="back">Back (Apostar A Favor)</option>
                                    <option value="lay">Lay (Apostar Contra)</option>
                                </select>
                            </div>
                            <div class="form-group modern-input">
                                <label for="commission${betCount}">
                                    <i class="fas fa-percent"></i>
                                    Comissão (%)
                                </label>
                                <input type="number" id="commission${betCount}" step="0.1" min="0" max="100" placeholder="5.0">
                            </div>
                        </div>
                        <div class="form-row liability-row" id="liabilityRow${betCount}" style="display: none;">
                            <div class="form-group modern-input">
                                <label for="liability${betCount}">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    Responsabilidade (R$)
                                </label>
                                <input type="number" id="liability${betCount}" step="0.01" min="0" placeholder="Calculado automaticamente" readonly>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Insere antes do botão
            entryBetsContainer.insertBefore(newBet, addMoreBetBtn);
            
            // Configura autocomplete para o novo campo de casa de apostas
            const newBetHouseInput = document.getElementById(`betHouse${betCount}`);
            if (newBetHouseInput) {
                setupBettingHouseAutocomplete(newBetHouseInput);
            }
            
            // Adiciona handler para remover aposta
            const removeBtn = newBet.querySelector('.remove-bet');
            removeBtn.addEventListener('click', function() {
                newBet.remove();
                renumberBets(); // Renumera após remoção
            });
        });
    }
    
    // Adiciona handler para apostas já existentes (se houver)
    document.querySelectorAll('.remove-bet').forEach(btn => {
        btn.addEventListener('click', function() {
            btn.closest('.entry-bet').remove();
            renumberBets(); // Renumera após remoção
        });
    });

    // Formulário de nova entrada
    const newEntryForm = document.getElementById('newEntryForm');
    if (newEntryForm) {
        newEntryForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const bankrollId = new URLSearchParams(window.location.search).get('id');
            const entryEvent = document.getElementById('entryEvent').value;
            const entryCompetition = document.getElementById('entryCompetition').value;
            const entryDate = document.getElementById('entryDate').value;
            const entryTime = document.getElementById('entryTime').value;
            const entryNotes = document.getElementById('entryNotes').value;
            const entryBonus = document.getElementById('entryBonus').checked;
            const bonusValue = document.getElementById('bonusValue').value;
            const bonusHouse = document.getElementById('bonusHouse').value;
            const bonusExpiryDate = document.getElementById('bonusExpiryDate').value;

            const entryBetsData = [];
            const betElements = entryBetsContainer.querySelectorAll('.entry-bet');
            
            for (let i = 0; i < betElements.length; i++) {
                const betElement = betElements[i];
                const betNumber = i + 1; // Os IDs são baseados em 1-indexed

                const house = betElement.querySelector(`#betHouse${betNumber}`).value;
                const market = betElement.querySelector(`#betMarket${betNumber}`).value;
                const odds = betElement.querySelector(`#betOdds${betNumber}`).value;
                const stake = betElement.querySelector(`#betStake${betNumber}`).value;
                
                const isExchangeCheckbox = betElement.querySelector(`#isExchange${betNumber}`);
                const isExchange = isExchangeCheckbox ? isExchangeCheckbox.checked : false;
                const betTypeSelect = betElement.querySelector(`#betType${betNumber}`);
                const betType = betTypeSelect ? betTypeSelect.value : null;
                const commissionInput = betElement.querySelector(`#commission${betNumber}`);
                const commission = commissionInput ? parseFloat(commissionInput.value) || 0 : 0;
                const liabilityInput = betElement.querySelector(`#liability${betNumber}`);
                const liability = liabilityInput ? parseFloat(liabilityInput.value) || 0 : 0;

                if (!house || !market || !odds || !stake) {
                    toast.warning('Por favor, preencha todos os campos de todas as apostas.');
                    return;
                }
                
                const betData = { house, market, odds, stake };
                
                if (isExchange) {
                    betData.isExchange = true;
                    betData.betType = betType;
                    betData.commission = commission;
                    if (betType === 'lay') {
                        betData.liability = liability;
                    }
                }
                
                entryBetsData.push(betData);
            }

            if (entryBetsData.length === 0) {
                toast.warning('Adicione pelo menos uma aposta para a entrada.');
                return;
            }

            // Validação dos campos de bonus
            if (entryBonus && (!bonusValue || !bonusHouse || !bonusExpiryDate)) {
                toast.warning('Por favor, preencha o valor, a casa de apostas e a data de expiração do bonus.');
                return;
            }

            const formData = {
                bankrollId,
                entryEvent,
                entryCompetition,
                entryDate,
                entryTime,
                entryNotes,
                entryBonus,
                bonusValue: entryBonus ? parseFloat(bonusValue) : null,
                bonusHouse: entryBonus ? bonusHouse : null,
                bonusExpiryDate: entryBonus ? bonusExpiryDate : null,
                entryBets: entryBetsData
            };

            try {
                const response = await fetch('/api/surebet/entries', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.msg || `Erro HTTP: ${response.status}`);
                }

                toast.success(result.msg || 'Entrada salva com sucesso!');
                newEntryForm.reset();
                clearModal(); // Limpa e reseta o modal
                newEntryModal.classList.remove('active');
                fetchSurebetEntries(); // Atualizar a tabela após salvar

            } catch (error) {
                console.error('Erro ao salvar entrada:', error);
                toast.error(`Erro ao salvar entrada: ${error.message}`);
            }
        });
    }



    // Carregar entradas inicialmente se a aba "Entries" estiver ativa por padrão
    if (document.querySelector('.tab-btn[data-tab="entries"].active')) {
        fetchSurebetEntries();
    }

    // Event listener para navegação entre abas
    document.addEventListener('click', function(e) {
        if (e.target.closest('.tab-btn')) {
            const tabBtn = e.target.closest('.tab-btn');
            const tabName = tabBtn.getAttribute('data-tab');
            
            // Se clicou na aba de bonus, atualizar os dados
            if (tabName === 'bonus') {
                fetchBonusData();
            }
        }
    });

    // Função para buscar e atualizar dados de bônus
    async function fetchBonusData() {
        try {
            const response = await fetch('/api/user/bonus');
            if (!response.ok) {
                throw new Error('Erro ao buscar dados de bônus');
            }
            
            const bonusData = await response.json();
            updateBonusDisplay(bonusData);
            
        } catch (error) {
            console.error('Erro ao buscar dados de bônus:', error);
            showToast('Erro ao atualizar dados de bônus', 'error');
        }
    }

    // Função para atualizar a exibição dos bônus
    function updateBonusDisplay(bonusData) {
        const bonusGrid = document.querySelector('.bonus-grid');
        if (!bonusGrid) return;
        
        // Limpar conteúdo atual
        bonusGrid.innerHTML = '';
        
        if (bonusData.length > 0) {
            bonusData.forEach(bonus => {
                const bonusCard = createBonusCard(bonus);
                bonusGrid.appendChild(bonusCard);
            });
        } else {
            // Mostrar card de "nenhum bônus"
            const noBonusCard = createNoBonusCard();
            bonusGrid.appendChild(noBonusCard);
        }
    }

    // Função para criar card de bônus
    function createBonusCard(bonus) {
        const isActive = bonus.status.toLowerCase() === 'ativo';
        const cardClass = isActive ? 'active' : 'expired';
        const statusIcon = isActive ? 'check-circle' : 'times-circle';
        const expiryText = isActive ? 'Expira em:' : 'Expirou em:';
        const expiryDate = new Date(bonus.bonus_expiry_date).toLocaleDateString('pt-BR');
        const bonusValue = parseFloat(bonus.bonus_value).toFixed(2).replace('.', ',');
        
        const cardHTML = `
            <div class="bonus-card ${cardClass}">
                <div class="bonus-card-header">
                    <div class="bonus-house">
                        <i class="fas fa-home"></i>
                        <span>${bonus.bonus_house}</span>
                    </div>
                    <div class="bonus-status ${cardClass}">
                        <i class="fas fa-${statusIcon}"></i>
                        <span>${bonus.status}</span>
                    </div>
                </div>
                <div class="bonus-card-body">
                    <div class="bonus-value">
                        <span class="currency">R$</span>
                        <span class="amount">${bonusValue}</span>
                    </div>
                    <div class="bonus-type">Aposta Grátis</div>
                </div>
                <div class="bonus-card-footer">
                    <div class="bonus-expiry">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${expiryText} ${expiryDate}</span>
                    </div>
                    <div class="bonus-actions">
                        ${isActive ? 
                            `<button class="btn btn-sm btn-primary use-bonus-btn" data-bonus-id="${bonus.id}">
                                <i class="fas fa-play"></i>
                                Usar
                            </button>` : 
                            `<button class="btn btn-sm btn-secondary" disabled>
                                <i class="fas fa-ban"></i>
                                Expirado
                            </button>`
                        }
                        <button class="btn btn-sm btn-danger delete-bonus-btn" data-bonus-id="${bonus.id}" title="Deletar aposta grátis">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const cardElement = document.createElement('div');
        cardElement.innerHTML = cardHTML;
        return cardElement.firstElementChild;
    }

    // Função para criar card de "nenhum bônus"
    function createNoBonusCard() {
        const cardHTML = `
            <div class="no-bonus-card">
                <div class="no-bonus-content">
                    <i class="fas fa-gift fa-3x"></i>
                    <h4>Nenhum bônus disponível</h4>
                    <p>Você não possui apostas grátis no momento. Complete surebets com bônus para receber novas apostas grátis!</p>
                </div>
            </div>
        `;
        
        const cardElement = document.createElement('div');
        cardElement.innerHTML = cardHTML;
        return cardElement.firstElementChild;
    }

    // Função para mostrar/ocultar campos de bonus
    window.toggleBonusFields = function() {
        const bonusCheckbox = document.getElementById('entryBonus');
        const bonusFields = document.getElementById('bonusFields');
        
        if (bonusCheckbox && bonusFields) {
            bonusFields.style.display = bonusCheckbox.checked ? 'block' : 'none';
        }
    };

    // Event listener para botões de deletar
    document.addEventListener('click', function(e) {
        if (e.target.closest('.action-btn.delete')) {
            e.preventDefault();
            const entryId = e.target.closest('.action-btn.delete').dataset.entryId;
            deleteSurebetEntry(entryId);
        }
        
        // Event listener para botões de deletar bônus
        if (e.target.closest('.delete-bonus-btn')) {
            e.preventDefault();
            const bonusId = e.target.closest('.delete-bonus-btn').dataset.bonusId;
            deleteBonusEntry(bonusId);
        }
    });

    // Função para deletar entrada de surebet
    async function deleteSurebetEntry(entryId) {
        const confirmed = await confirmModal.delete('Tem certeza que deseja excluir esta entrada de surebet? Esta ação não pode ser desfeita.');
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`/api/surebet/entries/${bankrollId}/${entryId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.msg || 'Entrada de surebet excluída com sucesso!');
                fetchSurebetEntries();
                // Atualizar o saldo na interface
                await updateBalanceDisplay();
            } else {
                toast.error('Erro ao excluir entrada: ' + (data.msg || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao excluir entrada de surebet:', error);
            toast.error('Erro ao excluir entrada de surebet');
        }
    }

    // Função para deletar bônus
    async function deleteBonusEntry(bonusId) {
        const confirmed = await confirmModal.delete('Tem certeza que deseja excluir esta aposta grátis? Esta ação não pode ser desfeita.');
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`/api/user/bonus/${bonusId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.msg || 'Aposta grátis excluída com sucesso!');
                // Atualizar a exibição dos bônus
                fetchBonusData();
            } else {
                toast.error('Erro ao excluir aposta grátis: ' + (data.error || 'Erro desconhecido'));
            }
        } catch (error) {
              console.error('Erro ao excluir aposta grátis:', error);
              toast.error('Erro ao excluir aposta grátis. Tente novamente.');
          }
      }

    // Lógica para filtros da tabela de entradas
    const dateFilterEntries = document.getElementById('dateFilterEntries');
    const statusFilterEntries = document.getElementById('statusFilterEntries');
    const searchEntriesInput = document.getElementById('searchEntries');

    // Função para aplicar filtros e resetar para página 1
    function applyFilters() {
        const filters = getCurrentFilters();
        currentPage = 1;
        fetchSurebetEntries(filters, 1);
    }

    if (dateFilterEntries) dateFilterEntries.addEventListener('change', applyFilters);
    if (statusFilterEntries) statusFilterEntries.addEventListener('change', applyFilters);
    if (searchEntriesInput) {
        searchEntriesInput.addEventListener('input', () => {
            clearTimeout(searchEntriesInput.timer);
            searchEntriesInput.timer = setTimeout(applyFilters, 500);
        });
    }
});

// Funções globais para onchange nos inputs HTML
function toggleExchangeFields(betNumber) {
    const isExchangeCheckbox = document.getElementById(`isExchange${betNumber}`);
    const exchangeFields = document.getElementById(`exchangeFields${betNumber}`);
    
    if (!isExchangeCheckbox || !exchangeFields) return;

    if (isExchangeCheckbox.checked) {
        exchangeFields.style.display = 'block';
        toggleLiabilityField(betNumber);
    } else {
        exchangeFields.style.display = 'none';
    }
}

function toggleLiabilityField(betNumber) {
    const betTypeSelect = document.getElementById(`betType${betNumber}`);
    const liabilityRow = document.getElementById(`liabilityRow${betNumber}`);
    const liabilityInput = document.getElementById(`liability${betNumber}`);
    
    if (!betTypeSelect || !liabilityRow || !liabilityInput) return;

    if (betTypeSelect.value === 'lay') {
        liabilityRow.style.display = 'block';
        calculateLiability(betNumber);
    } else {
        liabilityRow.style.display = 'none';
        liabilityInput.value = '';
    }
}

function calculateLiability(betNumber) {
    const oddsInput = document.getElementById(`betOdds${betNumber}`);
    const stakeInput = document.getElementById(`betStake${betNumber}`);
    const liabilityInput = document.getElementById(`liability${betNumber}`);
    
    if (!oddsInput || !stakeInput || !liabilityInput) return;

    const odds = parseFloat(oddsInput.value) || 0;
    const stake = parseFloat(stakeInput.value) || 0;
    
    if (odds > 1 && stake > 0) {
        const liability = (odds - 1) * stake;
        liabilityInput.value = liability.toFixed(2);
    } else {
        liabilityInput.value = '';
    }
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
        options.forEach((option, index) => {
            option.style.backgroundColor = index === selectedIndex ? '#f8f9fa' : 'white';
        });
    }
}

// Configurar autocomplete para campos existentes no DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    setupBettingHouseAutocomplete(document.getElementById('betHouse1'));
    setupBettingHouseAutocomplete(document.getElementById('betHouse2'));
    setupBettingHouseAutocomplete(document.getElementById('bookmaker1'));
    setupBettingHouseAutocomplete(document.getElementById('bookmaker2'));
    setupBettingHouseAutocomplete(document.getElementById('bonusHouse'));
});

// Adicionar event listeners para recalcular responsabilidade quando odds ou stake mudarem
document.addEventListener('input', function(e) {
    if (e.target && (e.target.id.includes('betOdds') || e.target.id.includes('betStake'))) {
        const betNumberMatch = e.target.id.match(/\d+/);
        if (betNumberMatch) {
            const betNumber = betNumberMatch[0];
            const betTypeSelect = document.getElementById(`betType${betNumber}`);
            const isExchangeCheckbox = document.getElementById(`isExchange${betNumber}`);
            
            if (isExchangeCheckbox && isExchangeCheckbox.checked && 
                betTypeSelect && betTypeSelect.value === 'lay') {
                calculateLiability(betNumber);
            }
        }
    }
});

// Event listener para mudanças no dropdown de status
document.addEventListener('change', function(e) {
    if (e.target && e.target.classList.contains('status-dropdown')) {
        const entryId = e.target.getAttribute('data-entry-id');
        const newStatus = e.target.value;
        const currentStatus = e.target.getAttribute('data-current-status');
        
        if (newStatus !== currentStatus) {
            updateEntryStatus(entryId, newStatus, e.target);
        }
    }
});

// Função para atualizar o status da entrada
async function updateEntryStatus(entryId, newStatus, selectElement) {
    try {
        // Desabilitar o dropdown durante a atualização
        selectElement.disabled = true;
        
        const response = await fetch(`/api/surebet/entries/${entryId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Erro ao atualizar status');
        }
        
        const responseData = await response.json();
        
        // Atualizar o atributo data-current-status
        selectElement.setAttribute('data-current-status', newStatus);
        
        // Atualizar o saldo na interface se houve mudança
        await updateBalanceDisplay();
        
        // Mostrar toast de sucesso
        showToast(responseData.msg || 'Status atualizado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        
        // Reverter a seleção para o status anterior
        const currentStatus = selectElement.getAttribute('data-current-status');
        selectElement.value = currentStatus;
        
        // Mostrar toast de erro
        showToast(`Erro ao atualizar status: ${error.message}`, 'error');
    } finally {
        // Reabilitar o dropdown
        selectElement.disabled = false;
    }
}

// Função para atualizar o saldo exibido na interface
async function updateBalanceDisplay() {
    try {
        // Obter o ID do bankroll da URL (parâmetro 'id')
        const urlParams = new URLSearchParams(window.location.search);
        const bankrollId = urlParams.get('id');
        
        if (!bankrollId) {
            console.warn('ID do bankroll não encontrado na URL');
            return;
        }
        
        // Buscar o saldo atual do bankroll
        const response = await fetch(`/api/bankrolls/${bankrollId}`);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar dados do bankroll');
        }
        
        const bankrollData = await response.json();
        
        // Atualizar o elemento do saldo na interface
        const balanceElement = document.getElementById('currentBalance');
        if (balanceElement && bankrollData.saldo_atual !== undefined) {
            const saldoAtual = parseFloat(bankrollData.saldo_atual);
            const formattedBalance = saldoAtual.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
            balanceElement.textContent = formattedBalance;
            
            // Aplicar classe 'negative' se o saldo for negativo
            if (saldoAtual < 0) {
                balanceElement.classList.add('negative');
            } else {
                balanceElement.classList.remove('negative');
            }
        }
        
    } catch (error) {
        console.error('Erro ao atualizar saldo na interface:', error);
    }
}