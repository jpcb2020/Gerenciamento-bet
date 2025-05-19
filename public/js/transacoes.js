document.addEventListener('DOMContentLoaded', () => {
    const transactionsTableBody = document.getElementById('transactionsTableBody');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const filterHouseSelect = document.getElementById('filterHouse');
    const filterTypeSelect = document.getElementById('filterType');
    const searchDescriptionInput = document.getElementById('searchDescription');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const filterDateRangeButton = document.getElementById('filterDateRange');

    // Dashboard panel elements
    const dailyIncomeElement = document.getElementById('dailyIncome');
    const dailyExpenseElement = document.getElementById('dailyExpense');
    const totalBalanceElement = document.getElementById('totalBalance');
    const balanceChangeElement = document.getElementById('balanceChange');
    const transactionCountElement = document.getElementById('transactionCount');
    const topHouseNameElement = document.getElementById('topHouseName');
    const topHouseCountElement = document.getElementById('topHouseCount');
    const topHouseBalanceElement = document.getElementById('topHouseBalance');

    // Modal elements (assuming generic modal handlers are in main.js)
    const transactionDetailModal = document.getElementById('transactionDetailModal');
    const editTransactionForm = document.getElementById('editTransactionForm');
    const transactionIdInput = document.getElementById('transactionId');
    const transactionDateInput = document.getElementById('transactionDate');
    const transactionHouseSelect = document.getElementById('transactionHouse');
    const transactionTypeSelect = document.getElementById('transactionType'); // In modal
    const transactionAmountInput = document.getElementById('transactionAmount');
    const transactionDescriptionInput = document.getElementById('transactionDescription');
    const deleteTransactionBtn = document.getElementById('deleteTransactionBtn');
    
    // Confirmation modal elements
    const confirmModalOverlay = document.getElementById('confirmModalOverlay');
    const confirmModal = document.getElementById('confirmModal');
    const confirmModalTitle = document.getElementById('confirmModalTitle');
    const confirmModalMessage = document.getElementById('confirmModalMessage');
    const confirmModalConfirmBtn = document.getElementById('confirmModalConfirmBtn');
    const confirmModalCancelBtn = document.getElementById('confirmModalCancelBtn');
    
    // Toast container
    const toastContainer = document.getElementById('toast-container');
    
    let allTransactions = [];
    let filteredTransactions = [];
    let bettingHouses = [];
    let currentPage = 1;
    const rowsPerPage = 15; // Or a user-configurable value
    let sortColumn = 'data';
    let sortDirection = 'desc';

    // Local implementation of showToast if it doesn't exist in global scope
    if (typeof window.showToast !== 'function') {
        window.showToast = function(message, type = 'info', duration = 3000) {
            if (!toastContainer) {
                console.error('Toast container not found');
                alert(message); // Fallback to alert if toast container not found
                return;
            }
            
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
    }
    
    // Local implementation of showConfirmModal if it doesn't exist in global scope
    if (typeof window.showConfirmModal !== 'function') {
        window.showConfirmModal = function(message, title = 'Confirmação') {
            if (!confirmModalOverlay || !confirmModal) {
                console.error('Confirmation modal elements not found');
                // Fallback to standard confirm
                return Promise.resolve(window.confirm(message));
            }
            
            return new Promise((resolve) => {
                if (confirmModalTitle) confirmModalTitle.textContent = title;
                confirmModalMessage.textContent = message;
                confirmModalOverlay.classList.add('active');
                
                const handleConfirm = () => {
                    cleanup();
                    resolve(true);
                };
                
                const handleCancel = () => {
                    cleanup();
                    resolve(false);
                };
                
                const cleanup = () => {
                    confirmModalOverlay.classList.remove('active');
                    confirmModalConfirmBtn.removeEventListener('click', handleConfirm);
                    confirmModalCancelBtn.removeEventListener('click', handleCancel);
                };
                
                confirmModalConfirmBtn.addEventListener('click', handleConfirm);
                confirmModalCancelBtn.addEventListener('click', handleCancel);
            });
        }
    }
    
    async function fetchTransactions() {
        try {
            const response = await fetch('/api/transacoes');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allTransactions = await response.json();
            // TODO: If saldo_anterior and saldo_posterior are needed, they must be fetched
            // or calculated. Currently, the API /api/transacoes does not provide them.
            // For now, they will appear as empty in the table.
            applyFiltersAndSort();
            updateDashboardPanels();
        } catch (error) {
            console.error('Erro ao buscar transações:', error);
            transactionsTableBody.innerHTML = `<tr><td colspan="8" class="empty-transactions"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Erro ao carregar transações</h3><p>${error.message}</p></div></td></tr>`;
            if (typeof showToast === 'function') {
                showToast(`Erro ao carregar transações: ${error.message}`, 'error');
            }
        }
    }

    async function fetchBettingHouses() {
        try {
            const response = await fetch('/api/casas');
            bettingHouses = await response.json();
            populateHouseFilter(bettingHouses);
            populateHouseSelectModal(bettingHouses);
        } catch (error) {
            console.error('Erro ao buscar casas de apostas:', error);
            if (typeof showToast === 'function') {
                showToast(`Erro ao buscar casas de apostas: ${error.message}`, 'error');
            }
        }
    }

    function populateHouseFilter(houses) {
        filterHouseSelect.innerHTML = '<option value="">Todas as Casas</option>'; // Reset
        houses.forEach(house => {
            const option = document.createElement('option');
            option.value = house.id;
            option.textContent = house.nome;
            filterHouseSelect.appendChild(option);
        });
    }
    
    function populateHouseSelectModal(houses) {
        transactionHouseSelect.innerHTML = ''; // Reset
        houses.forEach(house => {
            const option = document.createElement('option');
            option.value = house.id;
            option.textContent = house.nome;
            transactionHouseSelect.appendChild(option);
        });
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleString('pt-BR', options);
    }
    
    function formatCurrency(value) {
        if (typeof value !== 'number') return '-';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function renderTransactions() {
        transactionsTableBody.innerHTML = ''; // Clear existing rows

        if (filteredTransactions.length === 0) {
            transactionsTableBody.innerHTML = `<tr><td colspan="8" class="empty-transactions"><div class="empty-state"><i class="fas fa-search"></i><h3>Nenhuma transação encontrada</h3><p>Tente ajustar seus filtros ou aguarde novas transações.</p></div></td></tr>`;
            updatePaginationControls();
            return;
        }

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

        paginatedTransactions.forEach(t => {
            const row = transactionsTableBody.insertRow();
            row.insertCell().textContent = formatDate(t.data);
            
            const casaCell = row.insertCell();
            casaCell.classList.add('table-house-cell'); // Add a class for specific styling if needed
            const logoImg = document.createElement('img');
            logoImg.src = t.casa_logo || '/images/bet-default-icon.png'; // Fallback to default
            logoImg.alt = t.casa_nome || 'Logo da Casa';
            logoImg.classList.add('house-logo-small');
            logoImg.onerror = function() { // Handle broken image links gracefully
                this.src = '/images/bet-default-icon.png'; 
                this.alt = 'Logo Padrão';
            };
            casaCell.appendChild(logoImg);
            const houseNameSpan = document.createElement('span');
            houseNameSpan.textContent = t.casa_nome || 'N/A';
            casaCell.appendChild(houseNameSpan);
            
            row.insertCell().textContent = t.tipo ? t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1) : 'N/A';
            
            const valorCell = row.insertCell();
            const valorAbsoluto = Math.abs(parseFloat(t.valor) || 0);
            let sign = '';

            if (t.tipo === 'deposito' || t.tipo === 'ganho') {
                sign = '+';
                valorCell.classList.add('positive-value');
            } else if (t.tipo === 'saque' || t.tipo === 'aposta') {
                sign = '-';
                valorCell.classList.add('negative-value');
            } else {
                // For other types like 'correcao' if they can be positive or negative based on value
                // This part assumes t.valor itself might have a sign for 'correcao' or other future types
                // If 'correcao' also implies a sign, adjust logic above.
                if (parseFloat(t.valor) >= 0) {
                    sign = parseFloat(t.valor) > 0 ? '+' : ''; // No sign for zero
                    valorCell.classList.add('positive-value');
                } else {
                    sign = '-';
                    valorCell.classList.add('negative-value');
                }
            }
            // Remove R$ symbol from formatCurrency if it adds it, then prepend sign and R$.
            // Or, more simply, prepend sign to the already formatted currency string.
            // The formatCurrency function already gives R$ X,XX. So, sign + value.
            valorCell.textContent = sign + ' ' + formatCurrency(valorAbsoluto);
            
            // Placeholder for saldo_anterior and saldo_posterior
            row.insertCell().textContent = t.saldo_anterior ? formatCurrency(parseFloat(t.saldo_anterior)) : '-';
            row.insertCell().textContent = t.saldo_posterior ? formatCurrency(parseFloat(t.saldo_posterior)) : '-';
            
            row.insertCell().textContent = t.descricao || '-';
            
            const actionsCell = row.insertCell();
            actionsCell.classList.add('actions-cell');
            const editButton = document.createElement('button');
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.classList.add('btn-icon');
            editButton.title = "Editar/Ver Detalhes";
            editButton.addEventListener('click', () => openTransactionModal(t));
            actionsCell.appendChild(editButton);

            // Add a delete button directly in the row
            const deleteBtnRow = document.createElement('button');
            deleteBtnRow.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtnRow.classList.add('btn-icon', 'btn-danger-icon');
            deleteBtnRow.title = "Excluir Transação";
            deleteBtnRow.addEventListener('click', () => handleDeleteTransaction(t.id));
            actionsCell.appendChild(deleteBtnRow);
        });
        updatePaginationControls();
    }

    function updatePaginationControls() {
        const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage);
        pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages || totalPages === 0;
    }

    function applyFiltersAndSort() {
        let tempTransactions = [...allTransactions];

        // Date range filter
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Include the entire end day
            tempTransactions = tempTransactions.filter(t => {
                const transactionDate = new Date(t.data);
                return transactionDate >= start && transactionDate <= end;
            });
        } else if (startDate) {
            const start = new Date(startDate);
            tempTransactions = tempTransactions.filter(t => new Date(t.data) >= start);
        } else if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            tempTransactions = tempTransactions.filter(t => new Date(t.data) <= end);
        }
        
        // Type filter
        const type = filterTypeSelect.value;
        if (type) {
            tempTransactions = tempTransactions.filter(t => t.tipo === type);
        }

        // House filter
        const houseId = filterHouseSelect.value;
        if (houseId) {
            tempTransactions = tempTransactions.filter(t => t.casa_id == houseId);
        }

        // Description search
        const searchTerm = searchDescriptionInput.value.toLowerCase();
        if (searchTerm) {
            tempTransactions = tempTransactions.filter(t => 
                (t.descricao && t.descricao.toLowerCase().includes(searchTerm)) ||
                (t.tipo && t.tipo.toLowerCase().includes(searchTerm)) ||
                (t.casa_nome && t.casa_nome.toLowerCase().includes(searchTerm))
            );
        }

        // Sorting
        tempTransactions.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            // Type-specific comparison
            if (sortColumn === 'data') {
                valA = new Date(valA);
                valB = new Date(valB);
            } else if (sortColumn === 'valor' || sortColumn === 'saldo_anterior' || sortColumn === 'saldo_posterior') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        filteredTransactions = tempTransactions;
        currentPage = 1; // Reset to first page when filters change
        renderTransactions();
        updateDashboardPanels(); // Update dashboard after filtering
    }

    // Event Listeners for filters
    filterDateRangeButton.addEventListener('click', applyFiltersAndSort);
    startDateInput.addEventListener('change', applyFiltersAndSort);
    endDateInput.addEventListener('change', applyFiltersAndSort);
    filterTypeSelect.addEventListener('change', applyFiltersAndSort);
    filterHouseSelect.addEventListener('change', applyFiltersAndSort);
    searchDescriptionInput.addEventListener('input', applyFiltersAndSort); // Or 'keyup'

    // Event Listeners for pagination
    prevPageButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTransactions();
        }
    });

    nextPageButton.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTransactions();
        }
    });

    // Event Listeners for sorting
    document.querySelectorAll('.transactions-table-full th[data-sort]').forEach(headerCell => {
        headerCell.addEventListener('click', () => {
            const newSortColumn = headerCell.dataset.sort;
            if (sortColumn === newSortColumn) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = newSortColumn;
                sortDirection = 'asc'; // Default to ascending for new column
            }
            // Update sort icons (optional, for better UX)
            document.querySelectorAll('.transactions-table-full th[data-sort] i').forEach(icon => {
                icon.className = 'fas fa-sort'; // Reset icon
            });
            const currentIcon = headerCell.querySelector('i');
            if (currentIcon) {
                currentIcon.className = sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            }
            applyFiltersAndSort();
        });
    });

    // Modal Logic
    function openTransactionModal(transaction = null) {
        editTransactionForm.reset(); // Clear form
        populateHouseSelectModal(bettingHouses); // Ensure houses are populated

        if (transaction) { // Editing existing transaction
            transactionIdInput.value = transaction.id;
            // Format date for datetime-local input: YYYY-MM-DDTHH:mm
            transactionDateInput.value = transaction.data ? new Date(new Date(transaction.data).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0,16) : '';
            transactionHouseSelect.value = transaction.casa_id || '';
            transactionTypeSelect.value = transaction.tipo || '';
            transactionAmountInput.value = transaction.valor || '';
            transactionDescriptionInput.value = transaction.descricao || '';
            deleteTransactionBtn.style.display = 'inline-block';
            deleteTransactionBtn.dataset.id = transaction.id;
        } else { // Adding new transaction (if functionality is added)
            transactionIdInput.value = '';
            deleteTransactionBtn.style.display = 'none';
            // Set default values if needed for a new transaction
        }
        // This assumes a global function showModal exists from main.js or similar
        if (typeof showModal === 'function') {
            showModal('transactionDetailModal');
        } else {
            transactionDetailModal.style.display = 'block'; // Fallback basic show
            // Assuming a modal overlay is also handled by main.js or CSS
        }
    }
    
    // Add event listener for closing modal if not handled globally
    transactionDetailModal.querySelector('.close-modal')?.addEventListener('click', () => {
         if (typeof closeModal === 'function') {
            closeModal('transactionDetailModal');
        } else {
            transactionDetailModal.style.display = 'none'; // Fallback basic hide
        }
    });
    // Also for cancel button
    transactionDetailModal.querySelector('.btn-outline.close-modal')?.addEventListener('click', () => {
        if (typeof closeModal === 'function') {
           closeModal('transactionDetailModal');
       } else {
           transactionDetailModal.style.display = 'none'; // Fallback basic hide
       }
   });


    editTransactionForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const id = transactionIdInput.value;
        const casa_id_raw = transactionHouseSelect.value;
        const valor_raw = transactionAmountInput.value;

        // Basic validation
        if (!casa_id_raw) {
            if (typeof showToast === 'function') {
                showToast('Por favor, selecione uma casa de aposta.', 'warning');
            } else {
                alert('Por favor, selecione uma casa de aposta.');
            }
            return;
        }
        if (!valor_raw || isNaN(parseFloat(valor_raw))) {
            if (typeof showToast === 'function') {
                showToast('Por favor, insira um valor numérico válido.', 'warning');
            } else {
                alert('Por favor, insira um valor numérico válido.');
            }
            return;
        }


        const transactionData = {
            data: transactionDateInput.value,
            casa_id: parseInt(casa_id_raw),
            tipo: transactionTypeSelect.value,
            valor: parseFloat(valor_raw),
            descricao: transactionDescriptionInput.value
            // status is not in the form, default or handle as needed
        };

        try {
            let response;
            let method;

            if (id) { // Update existing transaction
                method = 'PUT';
                response = await fetch(`/api/transacoes/${id}`, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transactionData)
                });
            } else { // Add new transaction
                // This assumes we might add a "New Transaction" button eventually.
                // The POST /api/transacoes endpoint exists.
                method = 'POST';
                response = await fetch('/api/transacoes', {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transactionData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            // const result = await response.json(); // The new/updated transaction
            await fetchTransactions(); // Refresh the list

            if (typeof closeModal === 'function') {
                closeModal('transactionDetailModal');
            } else {
                transactionDetailModal.style.display = 'none';
            }
            // Show success toast/message
            if (typeof showToast === 'function') {
                showToast(`${id ? 'Transação atualizada' : 'Transação adicionada'} com sucesso!`, 'success');
            } else {
                alert(`${id ? 'Transação atualizada' : 'Transação adicionada'} com sucesso!`);
            }

        } catch (error) {
            console.error(`Erro ao ${id ? 'atualizar' : 'adicionar'} transação:`, error);
            // Show error toast/message
            if (typeof showToast === 'function') {
                showToast(`Erro: ${error.message}`, 'error');
            } else {
                alert(`Erro: ${error.message}`);
            }
        }
    });

    // Delete transaction handler (to be used by both the modal and row buttons)
    async function handleDeleteTransaction(id) {
        if (!id) return;

        try {
            // Use our window.showConfirmModal function
            const confirmed = await window.showConfirmModal(
                'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita e o saldo da casa será ajustado.',
                'Confirmar Exclusão'
            );
            
            if (confirmed) {
                const response = await fetch(`/api/transacoes/${id}`, { method: 'DELETE' });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                await fetchTransactions(); // Refresh list
                
                // Close modal if open
                if (typeof closeModal === 'function') {
                    closeModal('transactionDetailModal');
                } else {
                    transactionDetailModal.style.display = 'none';
                }
                
                // Show success toast with our own function
                window.showToast('Transação excluída com sucesso!', 'success');
                console.log('Toast shown for successful deletion');
            }
        } catch (error) {
            console.error('Erro ao excluir transação:', error);
            window.showToast(`Erro ao excluir: ${error.message}`, 'error');
        }
    }

    // Update the delete button in the modal to use the common handler
    deleteTransactionBtn.addEventListener('click', async () => {
        const id = deleteTransactionBtn.dataset.id;
        if (!id) return;
        
        handleDeleteTransaction(id);
    });

    // Function to update all dashboard panels
    function updateDashboardPanels() {
        updateMovimentacaoDoDia();
        updateSaldoConsolidado();
        updateTransactionCount();
        updateTopHouse();
    }

    // Update "Movimentação do Dia" panel
    function updateMovimentacaoDoDia() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayTransactions = allTransactions.filter(t => {
            const transactionDate = new Date(t.data);
            transactionDate.setHours(0, 0, 0, 0);
            return transactionDate.getTime() === today.getTime();
        });
        
        let income = 0;
        let expense = 0;
        
        todayTransactions.forEach(t => {
            const value = parseFloat(t.valor) || 0;
            if (t.tipo === 'deposito' || t.tipo === 'ganho') {
                income += value;
            } else if (t.tipo === 'saque' || t.tipo === 'aposta') {
                expense += Math.abs(value);
            } else if (t.tipo === 'correcao') {
                if (value > 0) {
                    income += value;
                } else {
                    expense += Math.abs(value);
                }
            }
        });
        
        dailyIncomeElement.textContent = formatCurrency(income);
        dailyExpenseElement.textContent = formatCurrency(expense);
    }
    
    // Update "Saldo Consolidado" panel
    function updateSaldoConsolidado() {
        // Calculate total balance across all transactions
        let totalBalance = 0;
        let yesterdayBalance = 0;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Primeiro agrupar o saldo por casa de apostas
        const casaBalances = {};
        
        // Inicializar o balanço de cada casa como 0
        bettingHouses.forEach(casa => {
            casaBalances[casa.id] = 0;
        });
        
        // Calcular o saldo atual de cada casa
        allTransactions.forEach(t => {
            if (!t || !t.casa_id || t.casa_id === undefined) return;
            
            const value = parseFloat(t.valor) || 0;
            const casaId = t.casa_id;
            
            // Se a casa não estiver no objeto, inicialize
            if (casaBalances[casaId] === undefined) {
                casaBalances[casaId] = 0;
            }
            
            // Calcular o saldo para cada casa
            if (t.tipo === 'deposito' || t.tipo === 'ganho') {
                casaBalances[casaId] += value;
            } else if (t.tipo === 'saque' || t.tipo === 'aposta') {
                casaBalances[casaId] -= Math.abs(value);
            } else if (t.tipo === 'correcao') {
                casaBalances[casaId] += value; // Pode ser positivo ou negativo
            }
        });
        
        // Somar o saldo de todas as casas
        totalBalance = Object.values(casaBalances).reduce((sum, balance) => sum + balance, 0);
        
        // Calcular o saldo de ontem
        const casaBalancesYesterday = { ...casaBalances };
        Object.keys(casaBalancesYesterday).forEach(casaId => {
            casaBalancesYesterday[casaId] = 0;
        });
        
        allTransactions.forEach(t => {
            if (!t || !t.casa_id || !t.data) return;
            
            const transactionDate = new Date(t.data);
            transactionDate.setHours(0, 0, 0, 0);
            
            // Considerar apenas transações até ontem
            if (transactionDate.getTime() <= yesterday.getTime()) {
                const value = parseFloat(t.valor) || 0;
                const casaId = t.casa_id;
                
                if (casaBalancesYesterday[casaId] === undefined) {
                    casaBalancesYesterday[casaId] = 0;
                }
                
                if (t.tipo === 'deposito' || t.tipo === 'ganho') {
                    casaBalancesYesterday[casaId] += value;
                } else if (t.tipo === 'saque' || t.tipo === 'aposta') {
                    casaBalancesYesterday[casaId] -= Math.abs(value);
                } else if (t.tipo === 'correcao') {
                    casaBalancesYesterday[casaId] += value;
                }
            }
        });
        
        yesterdayBalance = Object.values(casaBalancesYesterday).reduce((sum, balance) => sum + balance, 0);
        
        totalBalanceElement.textContent = formatCurrency(totalBalance);
        
        // Calculate percentage change from yesterday
        if (yesterdayBalance !== 0) {
            const percentChange = ((totalBalance - yesterdayBalance) / Math.abs(yesterdayBalance)) * 100;
            const sign = percentChange >= 0 ? '+' : '';
            balanceChangeElement.textContent = `${sign}${percentChange.toFixed(2)}% desde ontem`;
            balanceChangeElement.style.color = percentChange >= 0 ? '#2ecc71' : '#e74c3c';
        } else {
            balanceChangeElement.textContent = 'Primeiro dia de atividade';
            balanceChangeElement.style.color = '#666';
        }
    }
    
    // Update "Total de Transações" panel
    function updateTransactionCount() {
        transactionCountElement.textContent = filteredTransactions.length;
    }
    
    // Update "Casa Mais Ativa" panel
    function updateTopHouse() {
        // Filtrar transações pelo período selecionado
        const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
        const endDate = endDateInput.value ? new Date(endDateInput.value) : null;
        
        if (endDate) {
            endDate.setHours(23, 59, 59, 999); // Incluir o dia inteiro
        }
        
        // Filtrar transações por intervalo de data, se especificado
        const periodTransactions = allTransactions.filter(t => {
            if (!t || !t.data) return false;
            
            const transactionDate = new Date(t.data);
            
            if (startDate && endDate) {
                return transactionDate >= startDate && transactionDate <= endDate;
            } else if (startDate) {
                return transactionDate >= startDate;
            } else if (endDate) {
                return transactionDate <= endDate;
            }
            
            return true; // Se nenhum intervalo de data for especificado, incluir todas as transações
        });
        
        // Agrupar transações por casa de apostas
        const houseStats = {};
        
        periodTransactions.forEach(t => {
            if (!t || !t.casa_id) return;
            
            const casaId = t.casa_id;
            const casaNome = t.casa_nome || 'Casa Desconhecida';
            const value = parseFloat(t.valor) || 0;
            
            if (!houseStats[casaId]) {
                houseStats[casaId] = {
                    id: casaId,
                    nome: casaNome,
                    count: 0,
                    balance: 0
                };
            }
            
            // Incrementar contagem de transações
            houseStats[casaId].count += 1;
            
            // Atualizar saldo da casa
            if (t.tipo === 'deposito' || t.tipo === 'ganho') {
                houseStats[casaId].balance += value;
            } else if (t.tipo === 'saque' || t.tipo === 'aposta') {
                houseStats[casaId].balance -= Math.abs(value);
            } else if (t.tipo === 'correcao') {
                houseStats[casaId].balance += value; // Pode ser positivo ou negativo
            }
        });
        
        // Converter objeto em array para classificar
        const housesArray = Object.values(houseStats);
        
        if (housesArray.length === 0) {
            // Nenhuma casa encontrada no período
            topHouseNameElement.textContent = 'Nenhuma';
            topHouseCountElement.textContent = '0';
            topHouseBalanceElement.textContent = formatCurrency(0);
            return;
        }
        
        // Classificar pelo número de transações (mais ativa)
        housesArray.sort((a, b) => b.count - a.count);
        
        const topHouse = housesArray[0];
        
        // Atualizar elementos do painel
        topHouseNameElement.textContent = topHouse.nome;
        topHouseCountElement.textContent = topHouse.count;
        topHouseBalanceElement.textContent = formatCurrency(topHouse.balance);
        topHouseBalanceElement.style.color = topHouse.balance >= 0 ? '#2ecc71' : '#e74c3c';
    }

    // Initial data load
    fetchBettingHouses(); // Fetch houses first for filters
    fetchTransactions();
});

// Helper for styling positive/negative values - add to your style.css
/*
.positive-value {
    color: var(--green-color); // Or your theme's green
}
.negative-value {
    color: var(--red-color);   // Or your theme's red
}
.transactions-table-full th[data-sort] {
    cursor: pointer;
}
.transactions-table-full th[data-sort] i {
    margin-left: 5px;
    color: #ccc;
}
.transactions-table-full th[data-sort]:hover i {
    color: #333;
}
.actions-cell button {
    margin-right: 5px;
}
.filter-control {
    margin-right: 10px;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #ccc;
}
.date-filter input[type="date"] {
     padding: 8px;
    border-radius: 4px;
    border: 1px solid #ccc;
    margin: 0 5px;
}
.pagination-controls {
    margin-top: 20px;
    text-align: center;
}
.pagination-controls button {
    margin: 0 10px;
}

.modal-content .form-actions .btn-danger {
    background-color: var(--red-color);
    color: white;
}
.modal-content .form-actions .btn-danger:hover {
    background-color: darkred;
}

*/ 