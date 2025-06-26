// Relatórios - Funcionalidades JavaScript

document.addEventListener('DOMContentLoaded', function() {
    let relatoriosData = null;
    let evolucaoChart = null;
    let categoriasChart = null;
    let sortDirection = { column: null, asc: true };

    // Elementos DOM
    const loadingState = document.getElementById('loadingState');
    const statisticsOverview = document.getElementById('statisticsOverview');
    const chartsSection = document.getElementById('chartsSection');
    const bankrollsTable = document.getElementById('bankrollsTable');
    const emptyState = document.getElementById('emptyState');
    const periodoFilter = document.getElementById('periodoFilter');
    const exportBtn = document.getElementById('exportBtn');
    const searchBankroll = document.getElementById('searchBankroll');

    // Inicializar página
    init();

    function init() {
        loadRelatórios();
        setupEventListeners();
    }

    function setupEventListeners() {
        // Filtro de período
        if (periodoFilter) {
            periodoFilter.addEventListener('change', function() {
                loadRelatórios();
            });
        }

        // Botão de exportação
        if (exportBtn) {
            exportBtn.addEventListener('click', exportarRelatorios);
        }

        // Pesquisa de bankrolls
        if (searchBankroll) {
            searchBankroll.addEventListener('input', function() {
                filterBankrollsTable(this.value);
            });
        }

        // Ordenação da tabela
        const sortableHeaders = document.querySelectorAll('.bankrolls-table th[data-sort]');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const column = this.getAttribute('data-sort');
                sortBankrollsTable(column);
            });
        });
    }

    async function loadRelatórios() {
        try {
            showLoading();
            
            const periodo = periodoFilter ? periodoFilter.value : '30';
            const response = await fetch(`/api/dashboard/relatorios?periodo=${periodo}`);
            
            if (!response.ok) {
                throw new Error('Erro ao carregar relatórios');
            }

            relatoriosData = await response.json();
            
            if (relatoriosData.bankrolls && relatoriosData.bankrolls.length > 0) {
                displayRelatórios();
            } else {
                showEmptyState();
            }
        } catch (error) {
            console.error('Erro ao carregar relatórios:', error);
            showError('Erro ao carregar relatórios. Tente novamente.');
            showEmptyState();
        }
    }

    function showLoading() {
        loadingState.style.display = 'block';
        statisticsOverview.style.display = 'none';
        chartsSection.style.display = 'none';
        bankrollsTable.style.display = 'none';
        emptyState.style.display = 'none';
    }

    function displayRelatórios() {
        hideLoading();
        displayStatistics();
        displayCharts();
        displayBankrollsTable();
    }

    function hideLoading() {
        loadingState.style.display = 'none';
        statisticsOverview.style.display = 'block';
        chartsSection.style.display = 'block';
        bankrollsTable.style.display = 'block';
        emptyState.style.display = 'none';
    }

    function showEmptyState() {
        loadingState.style.display = 'none';
        statisticsOverview.style.display = 'none';
        chartsSection.style.display = 'none';
        bankrollsTable.style.display = 'none';
        emptyState.style.display = 'block';
    }

    function displayStatistics() {
        const stats = relatoriosData.estatisticas;
        
        // Total Investido
        const totalInvestido = document.getElementById('totalInvestido');
        if (totalInvestido) {
            totalInvestido.textContent = formatCurrency(stats.total_investido || 0);
        }

        // Valor Atual
        const valorAtual = document.getElementById('valorAtual');
        if (valorAtual) {
            valorAtual.textContent = formatCurrency(stats.total_atual || 0);
        }

        // Lucro/Prejuízo
        const lucroTotal = document.getElementById('lucroTotal');
        const percentualRetorno = document.getElementById('percentualRetorno');
        const lucro = stats.lucro_total || 0;
        const investido = stats.total_investido || 0;
        
        if (lucroTotal) {
            lucroTotal.textContent = formatCurrency(lucro);
            lucroTotal.className = 'stat-value ' + (lucro >= 0 ? 'positive' : 'negative');
        }

        if (percentualRetorno) {
            const percentual = investido > 0 ? ((lucro / investido) * 100) : 0;
            percentualRetorno.textContent = formatPercentage(percentual);
            percentualRetorno.className = 'stat-label ' + (percentual >= 0 ? 'positive' : 'negative');
        }

        // Total Bankrolls
        const totalBankrolls = document.getElementById('totalBankrolls');
        if (totalBankrolls) {
            totalBankrolls.textContent = stats.total_bankrolls || 0;
        }
    }

    function displayCharts() {
        setupEvolucaoChart();
        setupCategoriasChart();
    }

    function setupEvolucaoChart() {
        const ctx = document.getElementById('evolucaoChart');
        if (!ctx) return;

        // Destruir gráfico anterior se existir
        if (evolucaoChart) {
            evolucaoChart.destroy();
        }

        const evolucao = relatoriosData.evolucao || [];
        
        // Processar dados para o gráfico
        const labels = [];
        const data = [];
        let saldoAcumulado = relatoriosData.estatisticas.total_investido || 0;

        // Se não há dados de evolução, mostrar pelo menos o saldo atual
        if (evolucao.length === 0) {
            labels.push('Hoje');
            data.push(relatoriosData.estatisticas.total_atual || 0);
        } else {
            evolucao.forEach(item => {
                labels.push(formatDate(item.data));
                saldoAcumulado += parseFloat(item.variacao_diaria || 0);
                data.push(saldoAcumulado);
            });
        }

        evolucaoChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Patrimônio',
                    data: data,
                    borderColor: '#6c5ce7',
                    backgroundColor: 'rgba(108, 92, 231, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6c5ce7',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
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
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#6c5ce7',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return 'Patrimônio: ' + formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    function setupCategoriasChart() {
        const ctx = document.getElementById('categoriasChart');
        if (!ctx) return;

        // Destruir gráfico anterior se existir
        if (categoriasChart) {
            categoriasChart.destroy();
        }

        const categorias = relatoriosData.categorias || [];
        
        if (categorias.length === 0) {
            // Mostrar gráfico vazio
            ctx.getContext('2d').fillText('Nenhum dado disponível', 50, 50);
            return;
        }

        const labels = categorias.map(cat => cat.categoria);
        const data = categorias.map(cat => parseFloat(cat.total_saldo || 0));
        const colors = [
            '#6c5ce7',
            '#0984e3',
            '#00b894',
            '#e67e22',
            '#e74c3c',
            '#9b59b6'
        ];

        categoriasChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 0,
                    hoverBorderWidth: 3,
                    hoverBorderColor: '#ffffff'
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
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#6c5ce7',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    function displayBankrollsTable() {
        const tbody = document.getElementById('bankrollsTableBody');
        if (!tbody) return;

        const bankrolls = relatoriosData.bankrolls || [];
        
        tbody.innerHTML = '';
        
        if (bankrolls.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-wallet"></i>
                            <h3>Nenhum bankroll encontrado</h3>
                            <p>Crie um bankroll para começar a acompanhar seus lucros.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        bankrolls.forEach(bankroll => {
            const row = createBankrollRow(bankroll);
            tbody.appendChild(row);
        });
    }

    function createBankrollRow(bankroll) {
        const row = document.createElement('tr');
        const lucro = parseFloat(bankroll.lucro_prejuizo || 0);
        const percentual = parseFloat(bankroll.percentual_retorno || 0);
        
        row.innerHTML = `
            <td>
                <strong>${escapeHtml(bankroll.nome)}</strong>
            </td>
            <td>
                <span class="categoria-badge categoria-${getCategoriaClass(bankroll.categoria)}">
                    ${escapeHtml(bankroll.categoria)}
                </span>
            </td>
            <td>${formatCurrency(bankroll.saldo_inicial)}</td>
            <td>${formatCurrency(bankroll.saldo_atual)}</td>
            <td class="${lucro >= 0 ? 'valor-positivo' : 'valor-negativo'}">
                ${formatCurrency(lucro)}
            </td>
            <td>
                <span class="percentual-badge percentual-${percentual >= 0 ? 'positivo' : 'negativo'}">
                    ${formatPercentage(percentual)}
                </span>
            </td>
            <td class="data-badge">
                ${formatDate(bankroll.created_at)}
            </td>
            <td>
                <div class="table-actions-cell">
                    <button class="btn-icon-small btn-view" onclick="viewBankroll(${bankroll.id})" title="Ver detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon-small btn-edit" onclick="editBankroll(${bankroll.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }

    function getCategoriaClass(categoria) {
        switch (categoria) {
            case 'Surebet': return 'surebet';
            case 'Apostas esportivas': return 'apostas';
            default: return 'geral';
        }
    }

    function sortBankrollsTable(column) {
        if (!relatoriosData || !relatoriosData.bankrolls) return;

        const isAsc = sortDirection.column === column ? !sortDirection.asc : true;
        sortDirection = { column, asc: isAsc };

        relatoriosData.bankrolls.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Converter strings para números quando apropriado
            if (['saldo_inicial', 'saldo_atual', 'lucro_prejuizo', 'percentual_retorno'].includes(column)) {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (column === 'created_at') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }

            if (aVal < bVal) return isAsc ? -1 : 1;
            if (aVal > bVal) return isAsc ? 1 : -1;
            return 0;
        });

        // Atualizar indicadores de ordenação
        updateSortIndicators(column, isAsc);
        
        // Re-renderizar tabela
        displayBankrollsTable();
    }

    function updateSortIndicators(activeColumn, isAsc) {
        const headers = document.querySelectorAll('.bankrolls-table th[data-sort]');
        headers.forEach(header => {
            const icon = header.querySelector('i');
            if (header.getAttribute('data-sort') === activeColumn) {
                icon.className = isAsc ? 'fas fa-sort-up' : 'fas fa-sort-down';
            } else {
                icon.className = 'fas fa-sort';
            }
        });
    }

    function filterBankrollsTable(searchTerm) {
        if (!relatoriosData || !relatoriosData.bankrolls) return;

        const tbody = document.getElementById('bankrollsTableBody');
        const rows = tbody.querySelectorAll('tr');

        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const rowText = Array.from(cells).map(cell => cell.textContent.toLowerCase()).join(' ');
            
            if (rowText.includes(term)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    function exportarRelatorios() {
        if (!relatoriosData || !relatoriosData.bankrolls) {
            showError('Nenhum dado disponível para exportação');
            return;
        }

        try {
            const csvContent = generateCSV();
            downloadCSV(csvContent, 'relatorios-bankrolls.csv');
            showSuccess('Relatório exportado com sucesso!');
        } catch (error) {
            console.error('Erro ao exportar relatórios:', error);
            showError('Erro ao exportar relatórios');
        }
    }

    function generateCSV() {
        const headers = ['Nome', 'Categoria', 'Investimento', 'Valor Atual', 'Lucro/Prejuízo', 'Retorno %', 'Criado em'];
        const rows = relatoriosData.bankrolls.map(bankroll => [
            bankroll.nome,
            bankroll.categoria,
            formatCurrency(bankroll.saldo_inicial).replace('R$ ', ''),
            formatCurrency(bankroll.saldo_atual).replace('R$ ', ''),
            formatCurrency(bankroll.lucro_prejuizo).replace('R$ ', ''),
            formatPercentage(bankroll.percentual_retorno).replace('%', ''),
            formatDate(bankroll.created_at)
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    function downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Funções globais para ações da tabela
    window.viewBankroll = function(id) {
        const bankroll = relatoriosData.bankrolls.find(b => b.id === id);
        if (bankroll) {
            if (bankroll.categoria === 'Surebet') {
                window.location.href = `/surebet-detail?id=${id}`;
            } else if (bankroll.categoria === 'Apostas esportivas') {
                window.location.href = `/sports-bet-detail?id=${id}`;
            } else {
                window.location.href = `/general-detail?id=${id}`;
            }
        }
    };

    window.editBankroll = function(id) {
        window.location.href = `/bankrolls?edit=${id}`;
    };

    // Funções utilitárias
    function formatCurrency(value) {
        const num = parseFloat(value) || 0;
        return 'R$ ' + num.toLocaleString('pt-BR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    }

    function formatPercentage(value) {
        const num = parseFloat(value) || 0;
        return num.toFixed(1) + '%';
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showSuccess(message) {
        // Implementar sistema de toast se disponível
        console.log('Success:', message);
    }

    function showError(message) {
        // Implementar sistema de toast se disponível
        console.error('Error:', message);
    }
}); 