document.addEventListener('DOMContentLoaded', () => {
    const casasGrid = document.getElementById('detailedCasasGrid');
    const casasEmptyState = document.getElementById('detailedCasasEmptyState');
    const addHouseModal = document.getElementById('addHouseModal'); // Re-using existing modal ID
    const editHouseModal = document.getElementById('editHouseModal');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const toastContainer = document.getElementById('toast-container'); // Get toast container
    
    const addHouseBtn = document.getElementById('addHouseBtnDetailed');
    const addHouseForm = document.getElementById('addHouseForm'); // MODIFIED ID
    const cancelAddHouseBtn = document.getElementById('cancelAddHouse'); // MODIFIED ID

    const editHouseForm = document.getElementById('editHouseFormDetailed');
    const cancelEditHouseBtn = document.getElementById('cancelEditHouseDetailed');

    const confirmDeleteHouseBtn = document.getElementById('confirmDeleteHouseBtn');
    const cancelDeleteHouseBtn = document.getElementById('cancelDeleteHouse');
    const deleteCasaNameSpan = document.getElementById('deleteCasaName');

    const searchInput = document.querySelector('.main-header .header-search input');

    let allCasas = []; // To store all fetched casas for filtering
    let casaToEditId = null;
    let casaToDeleteId = null;

    const API_BASE_URL = '/api/casas';
    const DEFAULT_LOGO = '/images/bet-default-icon.png'; // MODIFIED to correct filename

    // --- Toast Notification Function ---
    function showToast(message, type = 'info', duration = 5000) {
        if (!toastContainer) return; // Safety check

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        toast.appendChild(messageSpan);

        const closeButton = document.createElement('button');
        closeButton.className = 'toast-close-btn';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = () => {
            toast.classList.remove('toast--visible');
            toast.classList.add('toast--hiding');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        };
        toast.appendChild(closeButton);
        
        // Timer bar (optional, based on your CSS)
        if (type !== 'error') { // Persistent errors or add option
            const timerBar = document.createElement('div');
            timerBar.className = 'toast-timer-bar';
            timerBar.style.animationDuration = `${duration / 1000}s`;
            toast.appendChild(timerBar);
        }

        toastContainer.appendChild(toast);
        
        // Make it visible
        requestAnimationFrame(() => {
            toast.classList.add('toast--visible');
        });

        if (type !== 'error') { // Don't auto-close errors, or make it configurable
            setTimeout(() => {
                closeButton.onclick(); // Trigger close logic
            }, duration);
        }
    }

    // Utility to format currency (adapt as needed)
    const formatCurrency = (value) => {
        return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Render Casas
    const renderCasas = (casasToRender) => {
        casasGrid.innerHTML = ''; // Clear existing content
        if (casasToRender.length === 0) {
            casasEmptyState.style.display = 'block';
            casasGrid.style.display = 'none';
            return;
        }
        casasEmptyState.style.display = 'none';
        casasGrid.style.display = 'grid'; // Assuming grid display

        casasToRender.forEach(casa => {
            const casaCard = document.createElement('div');
            casaCard.className = 'casa-card-detailed'; // Add a specific class for styling
            casaCard.dataset.id = casa.id;

            const logoUrl = casa.logo || DEFAULT_LOGO;

            casaCard.innerHTML = `
                <img src="${logoUrl}" alt="Logo ${casa.nome}" class="casa-logo-detailed" onerror="this.onerror=null;this.src='${DEFAULT_LOGO}';">
                <div class="casa-info-detailed">
                    <h3 class="casa-name-detailed">${casa.nome}</h3>
                    <p class="casa-balance-detailed">Saldo: <strong>${formatCurrency(casa.saldo)}</strong></p>
                </div>
                <div class="casa-actions-detailed">
                    <div class="action-row">
                        <button class="btn-icon btn-edit-casa" data-id="${casa.id}" title="Editar Casa"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn-icon btn-delete-casa danger" data-id="${casa.id}" title="Excluir Casa"><i class="fas fa-trash"></i> Excluir</button>
                    </div>
                    <div class="action-row">
                        <button class="btn-icon btn-deposit" data-id="${casa.id}" data-nome="${casa.nome}" data-logo="${logoUrl}" title="Realizar Depósito"><i class="fas fa-plus"></i> Depósito</button>
                        <button class="btn-icon btn-withdraw" data-id="${casa.id}" data-nome="${casa.nome}" data-logo="${logoUrl}" title="Realizar Saque"><i class="fas fa-minus"></i> Saque</button>
                    </div>
                </div>
            `;
            casasGrid.appendChild(casaCard);
        });

        // Add event listeners for new buttons
        addCasaActionListeners();
    };

    // Fetch Casas from API
    const fetchCasas = async () => {
        try {
            const response = await fetch(API_BASE_URL);
            if (!response.ok) {
                throw new Error(`Erro HTTP! status: ${response.status}`);
            }
            allCasas = await response.json();
            renderCasas(allCasas);
        } catch (error) {
            console.error('Erro ao buscar casas de apostas:', error);
            showToast('Erro ao carregar as casas de apostas. Tente novamente mais tarde.', 'error');
            casasGrid.innerHTML = ''; // Clear grid on error too
            casasEmptyState.style.display = 'block';
            casasEmptyState.innerHTML = '<i class="fas fa-exclamation-circle"></i><h3>Erro ao carregar</h3><p>Não foi possível buscar os dados.</p>';
            casasGrid.style.display = 'none';
        }
    };

    // Modal Handling (Simplified - assumes modalHandler.js or similar CSS handles display)
    const openModal = (modal) => {
        if(modal) modal.classList.add('active');
        document.getElementById('modalOverlay').classList.add('active');
    };

    const closeModal = (modal) => {
        if(modal) modal.classList.remove('active');
        document.getElementById('modalOverlay').classList.remove('active');
    };

    // Event Listeners for Modals
    if (addHouseBtn) {
        addHouseBtn.addEventListener('click', () => {
            if (addHouseForm) addHouseForm.reset();
            const houseLogoInput = document.getElementById('houseLogo');
            if (houseLogoInput) houseLogoInput.placeholder = `URL da imagem ou ${DEFAULT_LOGO}`;
            openModal(addHouseModal);
        });
    }
    if(cancelAddHouseBtn) cancelAddHouseBtn.addEventListener('click', () => closeModal(addHouseModal));
    if(cancelEditHouseBtn) cancelEditHouseBtn.addEventListener('click', () => closeModal(editHouseModal));
    if(cancelDeleteHouseBtn) cancelDeleteHouseBtn.addEventListener('click', () => closeModal(deleteConfirmModal));
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modalId;
            if (modalId) closeModal(document.getElementById(modalId));
        });
    });
    document.getElementById('modalOverlay').addEventListener('click', () => {
        closeModal(addHouseModal);
        closeModal(editHouseModal);
        closeModal(deleteConfirmModal);
    });

    // Add Casa Form Submission
    if (addHouseForm) {
        addHouseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = addHouseForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Salvando...';

            const nome = document.getElementById('houseName').value;
            let logo = document.getElementById('houseLogo').value;
            const saldo = document.getElementById('initialBalance').value || 0;

            if (!logo.trim()) {
                logo = DEFAULT_LOGO; 
            }

            try {
                const response = await fetch(API_BASE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, logo, saldo: parseFloat(saldo) })
                });
                const responseData = await response.json();
                if (!response.ok) {
                    throw new Error(responseData.error || `Erro HTTP! status: ${response.status}`);
                }
                showToast('Casa de apostas adicionada com sucesso!', 'success');
                fetchCasas(); // Re-fetch and render
                closeModal(addHouseModal);
            } catch (error) {
                console.error('Erro ao adicionar casa:', error);
                showToast(`Erro ao adicionar casa: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }

    // Edit Casa Form Submission
    if (editHouseForm) {
        editHouseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = editHouseForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Salvando...';

            if (!casaToEditId) {
                showToast('ID da casa para edição não encontrado.', 'error');
                submitButton.disabled = false; // Re-enable if no ID
                submitButton.textContent = originalButtonText;
                return;
            }

            const nome = document.getElementById('editHouseNameDetailed').value;
            let logo = document.getElementById('editHouseLogoDetailed').value;
            const saldo = document.getElementById('editHouseBalanceDetailed').value;
            
            const casaData = { nome, saldo: parseFloat(saldo) };
            // Only include logo if a new one is provided or if it's being cleared to default
            const originalCasa = allCasas.find(c => c.id == casaToEditId);
            if (logo.trim() === '' && originalCasa && originalCasa.logo !== DEFAULT_LOGO) {
                 // If field is cleared and original wasn't default, set to default.
                 // Or, if you want to allow removing a logo entirely, send empty string
                 // and let backend handle it (e.g. set to NULL or default).
                 // For now, if cleared, assume user wants the default logo if a custom one was there.
                 // This logic might need refinement based on desired behavior for empty logo field.
                if (document.getElementById('editHouseLogoDetailed').placeholder.includes(DEFAULT_LOGO)){
                    casaData.logo = DEFAULT_LOGO; // Set to default if placeholder indicates it or field is empty
                } else if (logo.trim() === '') {
                    // If user explicitly clears a custom logo, consider setting to default or handling as no-change/deletion.
                    // Let's assume for now if it's cleared, we send the default logo.
                    casaData.logo = DEFAULT_LOGO;
                } else {
                    casaData.logo = logo; // New logo URL provided
                }
            } else if (logo.trim() !== '' && logo !== (originalCasa ? originalCasa.logo : '')){
                casaData.logo = logo; // New logo provided
            }
            // If logo field is not touched or same as original, it won't be in casaData, so PUT won't update it unnecessarily.

            try {
                const response = await fetch(`${API_BASE_URL}/${casaToEditId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(casaData)
                });
                const responseData = await response.json();
                if (!response.ok) {
                    throw new Error(responseData.error || `Erro HTTP! status: ${response.status}`);
                }
                showToast('Casa de apostas atualizada com sucesso!', 'success');
                fetchCasas(); // Re-fetch and render
                closeModal(editHouseModal);
                casaToEditId = null;
            } catch (error) {
                console.error('Erro ao editar casa:', error);
                showToast(`Erro ao editar casa: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }

    // Delete Casa Confirmation
    if (confirmDeleteHouseBtn) {
        confirmDeleteHouseBtn.addEventListener('click', async () => {
            if (!casaToDeleteId) return;
            try {
                const response = await fetch(`${API_BASE_URL}/${casaToDeleteId}`, {
                    method: 'DELETE'
                });
                // No need to parse JSON for a successful DELETE if backend sends 204 or simple success message
                if (!response.ok) {
                    let errorData = {error: `Erro HTTP! status: ${response.status}`};
                    try {
                        errorData = await response.json();
                    } catch(e){ /* ignore if parsing fails */}
                    throw new Error(errorData.error || `Erro HTTP! status: ${response.status}`);
                }
                showToast('Casa de apostas excluída com sucesso!', 'success');
                fetchCasas(); // Re-fetch and render
                closeModal(deleteConfirmModal);
                casaToDeleteId = null;
            } catch (error) {
                console.error('Erro ao excluir casa:', error);
                showToast(`Erro ao excluir casa: ${error.message}`, 'error');
            }
        });
    }

    // Add event listeners to edit, delete, and view transactions buttons (delegated)
    function addCasaActionListeners() {
        document.querySelectorAll('.btn-edit-casa').forEach(button => {
            button.addEventListener('click', (e) => {
                casaToEditId = e.currentTarget.dataset.id;
                const casa = allCasas.find(c => c.id == casaToEditId);
                if (casa) {
                    document.getElementById('editHouseIdDetailed').value = casa.id;
                    document.getElementById('editHouseNameDetailed').value = casa.nome;
                    document.getElementById('editHouseLogoDetailed').value = casa.logo === DEFAULT_LOGO ? '' : casa.logo || ''; 
                    document.getElementById('editHouseLogoDetailed').placeholder = casa.logo && casa.logo !== DEFAULT_LOGO ? `Atual: ${casa.logo.substring(0,30)}... ou ${DEFAULT_LOGO}` : DEFAULT_LOGO;
                    document.getElementById('editHouseBalanceDetailed').value = casa.saldo;
                    openModal(editHouseModal);
                }
            });
        });

        document.querySelectorAll('.btn-delete-casa').forEach(button => {
            button.addEventListener('click', (e) => {
                casaToDeleteId = e.currentTarget.dataset.id;
                const casa = allCasas.find(c => c.id == casaToDeleteId);
                if (casa) {
                    deleteCasaNameSpan.textContent = casa.nome;
                    openModal(deleteConfirmModal);
                }
            });
        });
    }

    // Search/Filter Casas
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredCasas = allCasas.filter(casa => 
                casa.nome.toLowerCase().includes(searchTerm)
            );
            renderCasas(filteredCasas);
        });
    }

    // Initial fetch
    fetchCasas();

    // Listen for successful transactions to refresh the casas grid
    document.addEventListener('transactionComplete', function(event) {
        console.log('Evento transactionComplete recebido em casas-de-apostas.js:', event.detail);
        // Check if the current page is indeed /casas-de-apostas before fetching
        // This check might be redundant if this script only runs on this page, but good for safety
        if (document.getElementById('detailedCasasGrid')) { 
            fetchCasas(); // Re-fetch and render the houses on this page
        }
    });
}); 