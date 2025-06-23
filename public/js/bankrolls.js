/**
 * Gerenciamento de Bankrolls - JavaScript
 * Funcionalidades: CRUD de bankrolls, modal, formatação, navegação
 */

document.addEventListener('DOMContentLoaded', function () {
    // Elementos do DOM
    const bankrollModal = document.getElementById('bankrollModal');
    const addBankrollBtn = document.getElementById('addBankrollBtn');
    const closeButton = document.querySelector('.modal .close-modal');
    const cancelBtn = document.getElementById('cancelBtn');
    const bankrollForm = document.getElementById('bankrollForm');
    const bankrollCardsContainer = document.getElementById('bankrollCardsContainer');
    const modalTitle = document.getElementById('modalTitle');

    // Verificação de elementos críticos
    if (!addBankrollBtn) {
        console.error("ERRO CRÍTICO: Botão 'Adicionar Novo Bankroll' (id: addBankrollBtn) não encontrado no DOM!");
        return;
    }
    if (!bankrollModal) {
        console.error("ERRO CRÍTICO: Elemento Modal (id: bankrollModal) não encontrado no DOM!");
        return;
    }

    // Variável de controle para edição
    let editingBankrollId = null;

    /**
     * Formata valor para moeda brasileira
     * @param {number} value - Valor a ser formatado
     * @returns {string} Valor formatado em R$
     */
    const formatCurrency = (value) => {
        return parseFloat(value).toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
        });
    };

    /**
     * Abre modal para adicionar novo bankroll
     */
    function openAddModal() {
        if (bankrollForm) {
            bankrollForm.reset();
        } else {
            console.error("bankrollForm não encontrado ao tentar resetar no clique.");
        }
        if (modalTitle) {
            modalTitle.textContent = 'Adicionar Bankroll';
        } else {
            console.error("modalTitle não encontrado ao tentar definir texto no clique.");
        }
        editingBankrollId = null;
        bankrollModal.classList.add('active');
    }

    /**
     * Fecha o modal
     */
    function closeModal() {
        bankrollModal.classList.remove('active');
    }

    /**
     * Busca todos os bankrolls da API
     */
    async function fetchBankrolls() {
        try {
            const response = await fetch('/api/bankrolls');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const bankrolls = await response.json();
            renderBankrolls(bankrolls);
        } catch (error) {
            console.error('Erro ao buscar bankrolls:', error);
            if (bankrollCardsContainer) {
                bankrollCardsContainer.innerHTML = `
                    <div class="empty-state full-width-empty-state">
                        <div class="empty-state-content">
                            <i class="fas fa-exclamation-triangle fa-3x"></i>
                            <h3>Erro ao carregar bankrolls</h3>
                            <p>${error.message}</p>
                        </div>
                    </div>`;
            } else {
                console.error("bankrollCardsContainer não encontrado para mostrar mensagem de erro.");
            }
        }
    }

    /**
     * Renderiza os cards de bankrolls
     * @param {Array} bankrolls - Lista de bankrolls
     */
    function renderBankrolls(bankrolls) {
        if (!bankrollCardsContainer) {
            console.error("Elemento bankrollCardsContainer não encontrado para renderizar cards.");
            return;
        }
        
        bankrollCardsContainer.innerHTML = '';
        
        if (bankrolls.length === 0) {
            bankrollCardsContainer.innerHTML = `
                <div class="empty-state full-width-empty-state">
                    <div class="empty-state-content">
                        <i class="fas fa-wallet fa-3x"></i>
                        <h3>Nenhum bankroll encontrado</h3>
                        <p>Crie um novo bankroll utilizando o botão "Adicionar Novo Bankroll".</p>
                    </div>
                </div>`;
            return;
        }

        bankrolls.forEach(bankroll => {
            const card = createBankrollCard(bankroll);
            bankrollCardsContainer.appendChild(card);
        });
    }

    /**
     * Cria um card de bankroll
     * @param {Object} bankroll - Dados do bankroll
     * @returns {HTMLElement} Elemento do card
     */
    function createBankrollCard(bankroll) {
        // Seleção de ícone baseado na categoria
        let categoryIcon = 'fa-wallet';
        if (bankroll.categoria === 'Surebet') {
            categoryIcon = 'fa-chart-line';
        } else if (bankroll.categoria === 'Apostas Arriscadas') {
            categoryIcon = 'fa-dice';
        } else if (bankroll.categoria === 'Longo Prazo') {
            categoryIcon = 'fa-calendar-alt';
        }

        const card = document.createElement('div');
        card.className = 'bankroll-card';
        
        // Adicionar classe específica para cards de surebet
        if (bankroll.categoria === 'Surebet') {
            card.classList.add('bankroll-card-surebet');
            card.style.cursor = 'pointer';
            
            // Adicionar classe especial se o saldo for negativo
            if (bankroll.saldo_atual < 0) {
                card.classList.add('negative-balance');
            }
        }
        
        card.innerHTML = `
            <div class="card-header">
                <h3 class="bankroll-name">${bankroll.nome}</h3>
                <span class="bankroll-category tag tag-${bankroll.categoria ? bankroll.categoria.toLowerCase().replace(/\s+/g, '-') : 'outro'}">${bankroll.categoria}</span>
            </div>
            <div class="bankroll-icon">
                <i class="fas ${categoryIcon}"></i>
                <span>Bankroll</span>
            </div>
            <div class="card-body">
                <p class="balance-label">Saldo Atual:</p>
                <p class="bankroll-balance ${bankroll.saldo_atual > 0 ? 'positive' : bankroll.saldo_atual < 0 ? 'negative' : 'neutral'}">${formatCurrency(bankroll.saldo_atual)}</p>
            </div>
            <div class="card-footer actions">
                <div class="bankroll-info">
                    <!-- Removido o ID conforme solicitado -->
                </div>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit" title="Editar Bankroll" data-id="${bankroll.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" title="Excluir Bankroll" data-id="${bankroll.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Adicionar evento de clique para Surebets
        if (bankroll.categoria === 'Surebet') {
            card.addEventListener('click', function(e) {
                // Não navegar se clicar nos botões de ação
                if (e.target.closest('.btn-icon')) {
                    return;
                }
                window.location.href = `/surebet-detail?id=${bankroll.id}`;
            });
        }
        
        // Adicionar eventos aos botões
        const editBtn = card.querySelector('.btn-edit');
        if (editBtn) {
            editBtn.addEventListener('click', () => loadBankrollForEdit(bankroll));
        }
        
        const deleteBtn = card.querySelector('.btn-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteBankroll(bankroll.id));
        }
        
        return card;
    }

    /**
     * Carrega bankroll para edição
     * @param {Object} bankroll - Dados do bankroll
     */
    function loadBankrollForEdit(bankroll) {
        if (!bankrollModal || !modalTitle || !bankrollForm) {
            console.error("Não é possível carregar bankroll para edição: elementos do modal ausentes.");
            return;
        }
        
        modalTitle.textContent = 'Editar Bankroll';
        editingBankrollId = bankroll.id;
        document.getElementById('bankrollId').value = bankroll.id;
        document.getElementById('nome').value = bankroll.nome;
        document.getElementById('saldo_inicial').value = bankroll.saldo_inicial;
        document.getElementById('categoria').value = bankroll.categoria;
        bankrollModal.classList.add('active');
    }

    /**
     * Salva bankroll (criar ou editar)
     * @param {Event} event - Evento do formulário
     */
    async function saveBankroll(event) {
        event.preventDefault();
        
        const nome = document.getElementById('nome').value;
        const saldo_inicial = document.getElementById('saldo_inicial').value;
        const categoria = document.getElementById('categoria').value;
        
        const bankrollData = { 
            nome, 
            saldo_inicial: parseFloat(saldo_inicial), 
            categoria 
        };

        let url = '/api/bankrolls';
        let method = 'POST';

        if (editingBankrollId) {
            url = `/api/bankrolls/${editingBankrollId}`;
            method = 'PUT';
        }
        
        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bankrollData),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
            }
            
            closeModal();
            fetchBankrolls();
        } catch (error) {
            console.error('Erro ao salvar bankroll:', error);
            alert(`Erro ao salvar bankroll: ${error.message}`);
        }
    }

    /**
     * Deleta um bankroll
     * @param {number} id - ID do bankroll
     */
    async function deleteBankroll(id) {
        if (!confirm('Tem certeza que deseja excluir este bankroll?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/bankrolls/${id}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
            }
            
            fetchBankrolls();
        } catch (error) {
            console.error('Erro ao deletar bankroll:', error);
            alert(`Erro ao deletar bankroll: ${error.message}`);
        }
    }

    // Event Listeners
    addBankrollBtn.addEventListener('click', openAddModal);

    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    // Fechar modal clicando fora
    window.addEventListener('click', (event) => {
        if (event.target == bankrollModal) {
            closeModal();
        }
    });

    // Submissão do formulário
    if (bankrollForm) {
        bankrollForm.addEventListener('submit', saveBankroll);
    }

    // Inicialização
    fetchBankrolls();
});

// Exportar funções para uso global se necessário
window.BankrollManager = {
    formatCurrency: (value) => {
        return parseFloat(value).toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
        });
    }
};