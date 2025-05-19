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
    
    let allTransactions = [];
    let filteredTransactions = [];
    let bettingHouses = [];
    let currentPage = 1;
    const rowsPerPage = 15; // Or a user-configurable value
    let sortColumn = 'data';
    let sortDirection = 'desc';

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
        } catch (error) {
            console.error('Erro ao buscar transações:', error);
            transactionsTableBody.innerHTML = `<tr><td colspan="8" class="empty-transactions"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Erro ao carregar transações</h3><p>${error.message}</p></div></td></tr>`;
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

            // Optionally, add a delete button directly in the row if desired, or keep it in modal
            // const deleteBtnRow = document.createElement('button');
            // deleteBtnRow.innerHTML = '<i class="fas fa-trash"></i>';
            // deleteBtnRow.classList.add('btn-icon', 'btn-danger-icon');
            // deleteBtnRow.addEventListener('click', () => handleDeleteTransaction(t.id));
            // actionsCell.appendChild(deleteBtnRow);
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
        currentPage = 1; // Reset to first page after filtering/sorting
        renderTransactions();
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
            alert('Por favor, selecione uma casa de aposta.');
            return;
        }
         if (!valor_raw || isNaN(parseFloat(valor_raw))) {
            alert('Por favor, insira um valor numérico válido.');
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
                // IMPORTANT: The backend does not currently have a PUT /api/transacoes/:id endpoint.
                // This will fail until that endpoint is implemented.
                // For now, this is a placeholder.
                method = 'PUT';
                response = await fetch(`/api/transacoes/${id}`, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transactionData)
                });
                // alert('Funcionalidade de Edição (PUT /api/transacoes/:id) pendente de implementação no backend.');
                // return; 
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
            // Show success toast/message (assuming a global toast function)
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

    deleteTransactionBtn.addEventListener('click', async () => {
        const id = deleteTransactionBtn.dataset.id;
        if (!id) return;

        // Confirmation dialog (assuming a global confirm function or using window.confirm)
        const confirmed = window.confirm('Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita e o saldo da casa será ajustado.');
        
        if (confirmed) {
            try {
                const response = await fetch(`/api/transacoes/${id}`, { method: 'DELETE' });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                await fetchTransactions(); // Refresh list
                if (typeof closeModal === 'function') {
                    closeModal('transactionDetailModal');
                } else {
                    transactionDetailModal.style.display = 'none';
                }
                if (typeof showToast === 'function') {
                    showToast('Transação excluída com sucesso!', 'success');
                } else {
                    alert('Transação excluída com sucesso!');
                }
            } catch (error) {
                console.error('Erro ao excluir transação:', error);
                 if (typeof showToast === 'function') {
                    showToast(`Erro ao excluir: ${error.message}`, 'error');
                } else {
                    alert(`Erro ao excluir: ${error.message}`);
                }
            }
        }
    });


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