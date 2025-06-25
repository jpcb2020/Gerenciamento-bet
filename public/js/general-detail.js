document.addEventListener('DOMContentLoaded', function() {
    const bankrollId = new URLSearchParams(window.location.search).get('id');

    // Sistema de throttling para toasts (evita spam)
    if (!window.toastThrottle) {
        window.toastThrottle = new Map();
    }

    const throttledShowToast = (message, type, key = null) => {
        const throttleKey = key || `${type}_${message.substring(0, 50)}`;
        const now = Date.now();
        
        if (window.toastThrottle.has(throttleKey) && now - window.toastThrottle.get(throttleKey) < 3000) {
            return; // Bloquear toast duplicado dentro de 3 segundos
        }
        
        window.toastThrottle.set(throttleKey, now);
        showToast(message, type);
    };

    // Formatação de moeda e data
    const formatCurrency = (value) => {
        return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
    
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + 
               date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    // Variável global para controlar a página atual
    let currentPage = 1;
    const entriesPerPage = 10;
    
    // Variáveis para controle de edição
    let isEditMode = false;
    let editingEntryId = null;

    // Elementos do DOM
    const addGeneralEntryBtn = document.getElementById('addGeneralEntryBtn');
    const newEntryModal = document.getElementById('newEntryModal');
    const newEntryForm = document.getElementById('newEntryForm');
    const closeModalBtns = document.querySelectorAll('.close-modal, .btn-cancel');
    const editBalanceBtn = document.getElementById('editBalanceBtn');
    const editBalanceModal = document.getElementById('editBalanceModal');

    // Função para buscar e renderizar entradas gerais
    async function fetchGeneralEntries(filters = {}, page = 1) {
        if (!bankrollId) return;

        const entriesTableBody = document.getElementById('entriesTableBody');
        entriesTableBody.innerHTML = '<tr><td colspan="5" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Carregando entradas...</td></tr>';

        try {
            let apiUrl = `/api/general/entries/${bankrollId}`;
            const queryParams = new URLSearchParams();
            if (filters.period) queryParams.append('period', filters.period);
            if (filters.search) queryParams.append('search', filters.search);
            queryParams.append('page', page);
            queryParams.append('limit', entriesPerPage);
            
            apiUrl += `?${queryParams.toString()}`;

            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Erro ao buscar entradas gerais');
            }
            const data = await response.json();
            currentPage = page;
            renderEntriesTable(data.entries);
            renderPagination(data.pagination);
        } catch (error) {
            console.error('Erro ao buscar entradas:', error);
            entriesTableBody.innerHTML = `<tr><td colspan="5" class="empty-state"><div class="empty-state-content"><i class="fas fa-exclamation-triangle"></i><h3>Erro ao carregar entradas</h3><p>${error.message}</p></div></td></tr>`;
        }
    }

    function renderEntriesTable(entries) {
        const entriesTableBody = document.getElementById('entriesTableBody');
        entriesTableBody.innerHTML = ''; // Limpar tabela

        if (entries.length === 0) {
            entriesTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
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
            const quantia = parseFloat(entry.quantia_lucro);
            
            // Determinar classe do valor
            let amountClass = 'amount-zero';
            if (quantia > 0) amountClass = 'amount-positive';
            else if (quantia < 0) amountClass = 'amount-negative';

            const row = entriesTableBody.insertRow();
            row.innerHTML = `
                <td class="creation-date-cell">${formatDateTime(entry.data_criacao)}</td>
                <td class="description-cell">
                    <div style="font-weight: 500; margin-bottom: 4px;">
                        ${entry.descricao_lucro}
                    </div>
                    ${entry.observacoes ? `<small style="color: #64748b;">${entry.observacoes}</small>` : ''}
                </td>
                <td class="amount-cell">
                    <span class="${amountClass}">${formatCurrency(entry.quantia_lucro)}</span>
                </td>
                <td class="actions-cell">
                    <a href="#" class="action-btn edit" title="Editar" data-entry-id="${entry.id}">
                        <i class="fas fa-edit"></i>
                    </a>
                    <a href="#" class="action-btn delete" title="Excluir" data-entry-id="${entry.id}">
                        <i class="fas fa-trash"></i>
                    </a>
                </td>
            `;

            // Adicionar eventos aos botões
            const editBtn = row.querySelector('.action-btn.edit');
            const deleteBtn = row.querySelector('.action-btn.delete');

            editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                loadEntryForEdit(entry);
            });

            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                deleteGeneralEntry(entry.id);
            });
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
        
        // Campo para ir para página específica (design simplificado)
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
        fetchGeneralEntries(filters, page);
    };

    // Função para ir diretamente para uma página específica
    window.goToPage = function() {
        const pageInput = document.getElementById('pageInput');
        if (!pageInput) return;
        
        const targetPage = parseInt(pageInput.value);
        if (isNaN(targetPage) || targetPage < 1) {
            showToast('Por favor, digite um número de página válido.', 'warning');
            return;
        }
        
        const filters = getCurrentFilters();
        fetchGeneralEntries(filters, targetPage);
    };

    // Função para obter filtros atuais
    function getCurrentFilters() {
        const filters = {};
        const dateFilter = document.getElementById('dateFilterEntries');
        const searchFilter = document.getElementById('searchEntries');
        
        if (dateFilter && dateFilter.value && dateFilter.value !== 'all') {
            filters.period = dateFilter.value;
        }
        if (searchFilter && searchFilter.value.trim()) {
            filters.search = searchFilter.value.trim();
        }
        
        return filters;
    }

    // Função para carregar entrada para edição
    function loadEntryForEdit(entry) {
        isEditMode = true;
        editingEntryId = entry.id;
        
        // Preencher formulário
        document.getElementById('entryDescription').value = entry.descricao_lucro;
        document.getElementById('entryAmount').value = entry.quantia_lucro;
        document.getElementById('entryNotes').value = entry.observacoes || '';
        
        // Atualizar título do modal
        const modalTitle = document.querySelector('#newEntryModal .header-text h3');
        const modalSubtitle = document.querySelector('#newEntryModal .header-text p');
        modalTitle.textContent = 'Editar Entrada de Lucro';
        modalSubtitle.textContent = 'Altere as informações da entrada';
        
        // Mostrar modal
        newEntryModal.classList.add('active');
    }

    // Função para limpar e resetar o modal
    function clearModal() {
        isEditMode = false;
        editingEntryId = null;
        newEntryForm.reset();
        
        // Restaurar título do modal
        const modalTitle = document.querySelector('#newEntryModal .header-text h3');
        const modalSubtitle = document.querySelector('#newEntryModal .header-text p');
        modalTitle.textContent = 'Nova Entrada de Lucro';
        modalSubtitle.textContent = 'Adicione um novo registro de lucro/prejuízo';
    }

    // Função para salvar entrada (criar ou editar)
    async function saveGeneralEntry(event) {
        event.preventDefault();
        
        const formData = {
            bankrollId: bankrollId,
            descricaoLucro: document.getElementById('entryDescription').value,
            quantiaLucro: parseFloat(document.getElementById('entryAmount').value),
            observacoes: document.getElementById('entryNotes').value
        };

        // Validações
        if (!formData.descricaoLucro || isNaN(formData.quantiaLucro)) {
            showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }

        try {
            let url = '/api/general/entries';
            let method = 'POST';

            if (isEditMode && editingEntryId) {
                url = `/api/general/entries/${editingEntryId}`;
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
                throw new Error(errorData.msg || 'Erro ao salvar entrada');
            }

            const result = await response.json();
            
            // Fechar modal
            newEntryModal.classList.remove('active');
            clearModal();
            
            // Recarregar entradas
            fetchGeneralEntries(getCurrentFilters(), currentPage);
            
            // Atualizar saldo do cabeçalho
            updateBalanceDisplay();
            
            // Atualizar gráfico
            if (window.reloadEvolutionChart) {
                window.reloadEvolutionChart();
            }
            
            // Mostrar mensagem de sucesso
            const action = isEditMode ? 'atualizada' : 'criada';
            throttledShowToast(`Entrada ${action} com sucesso!`, 'success');
            
        } catch (error) {
            console.error('Erro ao salvar entrada:', error);
            throttledShowToast(`Erro ao salvar entrada: ${error.message}`, 'error');
        }
    }

    // Função para deletar entrada
    async function deleteGeneralEntry(entryId) {
        if (!confirm('Tem certeza que deseja excluir esta entrada? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            const response = await fetch(`/api/general/entries/${entryId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Erro ao excluir entrada');
            }

            // Recarregar entradas
            fetchGeneralEntries(getCurrentFilters(), currentPage);
            
            // Atualizar saldo do cabeçalho
            updateBalanceDisplay();
            
            // Atualizar gráfico
            if (window.reloadEvolutionChart) {
                window.reloadEvolutionChart();
            }
            
            throttledShowToast('Entrada excluída com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao excluir entrada:', error);
            throttledShowToast(`Erro ao excluir entrada: ${error.message}`, 'error');
        }
    }

    // Função para atualizar exibição do saldo
    async function updateBalanceDisplay() {
        try {
            const response = await fetch(`/api/bankrolls/${bankrollId}`);
            if (!response.ok) throw new Error('Erro ao buscar saldo atualizado');
            
            const bankroll = await response.json();
            const balanceElement = document.getElementById('currentBalance');
            const saldo = parseFloat(bankroll.saldo_atual);
            
            balanceElement.textContent = formatCurrency(saldo);
            
            // Atualizar classe baseada no saldo
            balanceElement.className = saldo < 0 ? 'negative' : '';
            
        } catch (error) {
            console.error('Erro ao atualizar saldo:', error);
        }
    }

    // Função para carregar e renderizar o gráfico de evolução
    async function loadEvolutionChart() {
        if (!bankrollId) return;
        
        const chartContainer = document.getElementById('balanceChart');
        if (!chartContainer) return;
        
        try {
            const response = await fetch(`/api/general/evolution/${bankrollId}`);
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
            chartContainer.innerHTML = '<canvas id="evolutionChart"></canvas>';
            const canvas = document.getElementById('evolutionChart');
            const ctx = canvas.getContext('2d');
            
            // Definir tamanho do canvas baseado no container
            const containerRect = chartContainer.getBoundingClientRect();
            canvas.width = containerRect.width - 40;
            canvas.height = 180;
            
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
                    aspectRatio: 2,
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
                </div>
            `;
        }
    }

    // Event Listeners
    
    // Botão adicionar nova entrada
    if (addGeneralEntryBtn) {
        addGeneralEntryBtn.addEventListener('click', () => {
            clearModal();
            newEntryModal.classList.add('active');
        });
    }

    // Fechar modais
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            newEntryModal.classList.remove('active');
            editBalanceModal.classList.remove('active');
            clearModal();
        });
    });

    // Fechar modal clicando fora
    window.addEventListener('click', (event) => {
        if (event.target === newEntryModal) {
            newEntryModal.classList.remove('active');
            clearModal();
        }
        if (event.target === editBalanceModal) {
            editBalanceModal.classList.remove('active');
        }
    });

    // Submit do formulário
    if (newEntryForm) {
        newEntryForm.addEventListener('submit', saveGeneralEntry);
    }

    // Filtros
    const dateFilter = document.getElementById('dateFilterEntries');
    const searchFilter = document.getElementById('searchEntries');

    if (dateFilter) {
        dateFilter.addEventListener('change', () => {
            fetchGeneralEntries(getCurrentFilters(), 1);
        });
    }

    if (searchFilter) {
        let searchTimeout;
        searchFilter.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                fetchGeneralEntries(getCurrentFilters(), 1);
            }, 500);
        });
    }

    // Modal de edição de saldo
    if (editBalanceBtn) {
        editBalanceBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`/api/bankrolls/${bankrollId}`);
                if (!response.ok) throw new Error('Erro ao buscar dados do bankroll');
                
                const bankroll = await response.json();
                document.getElementById('currentBalanceDisplay').textContent = formatCurrency(bankroll.saldo_atual);
                document.getElementById('newBalance').value = bankroll.saldo_atual;
                
                editBalanceModal.classList.add('active');
            } catch (error) {
                throttledShowToast('Erro ao carregar dados do bankroll', 'error');
            }
        });
    }

    // Submit do formulário de edição de saldo
    const editBalanceForm = document.getElementById('editBalanceForm');
    if (editBalanceForm) {
        editBalanceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newBalance = parseFloat(document.getElementById('newBalance').value);
            const reason = document.getElementById('balanceReason').value;
            const notes = document.getElementById('balanceNotes').value;
            
            if (isNaN(newBalance) || !reason) {
                throttledShowToast('Por favor, preencha todos os campos obrigatórios.', 'error');
                return;
            }
            
            try {
                const response = await fetch(`/api/bankrolls/${bankrollId}/saldo`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        saldo_atual: newBalance
                    }),
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.msg || 'Erro ao atualizar saldo');
                }
                
                editBalanceModal.classList.remove('active');
                updateBalanceDisplay();
                
                // Atualizar gráfico
                if (window.reloadEvolutionChart) {
                    window.reloadEvolutionChart();
                }
                
                throttledShowToast('Saldo atualizado com sucesso!', 'success');
                
            } catch (error) {
                console.error('Erro ao atualizar saldo:', error);
                throttledShowToast(`Erro ao atualizar saldo: ${error.message}`, 'error');
            }
        });
    }

    // Fechar modal de edição de saldo
    const cancelBalanceEdit = document.getElementById('cancelBalanceEdit');
    const modalClose = document.querySelector('.edit-balance-modal .modal-close');
    
    if (cancelBalanceEdit) {
        cancelBalanceEdit.addEventListener('click', () => {
            editBalanceModal.classList.remove('active');
        });
    }
    
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            editBalanceModal.classList.remove('active');
        });
    }

    // Exportar PDF (funcionalidade básica)
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            throttledShowToast('Funcionalidade de exportação em desenvolvimento', 'info');
        });
    }

    // Inicialização
    fetchGeneralEntries();
    
    // Carregar gráfico de evolução
    loadEvolutionChart();
    
    // Tornar função disponível globalmente para recarga
    window.reloadEvolutionChart = loadEvolutionChart;
}); 