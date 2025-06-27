document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const notasGrid = document.getElementById('notasGrid');
    const notasEmptyState = document.getElementById('notasEmptyState');
    const addNotaBtn = document.getElementById('addNotaBtn');
    const notaModal = document.getElementById('notaModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const notaForm = document.getElementById('notaForm');
    const closeNotaModal = document.getElementById('closeNotaModal');
    const cancelNotaBtn = document.getElementById('cancelNotaBtn');
    const modalTitle = document.getElementById('modalTitle');
    const searchInput = document.getElementById('searchNotas');
    const toastContainer = document.getElementById('toast-container');

    // Elementos do formulário
    const notaId = document.getElementById('notaId');
    const notaTitulo = document.getElementById('notaTitulo');
    const notaTipo = document.getElementById('notaTipo');
    const notaPrioridade = document.getElementById('notaPrioridade');
    const notaCor = document.getElementById('notaCor');
    const dataLembrete = document.getElementById('dataLembrete');
    const dataLembreteGroup = document.getElementById('dataLembreteGroup');
    const notaConteudo = document.getElementById('notaConteudo');

    // Filtros
    const filterTipo = document.getElementById('filterTipo');
    const filterPrioridade = document.getElementById('filterPrioridade');
    const filterStatus = document.getElementById('filterStatus');

    let allNotas = [];
    let editingNotaId = null;

    // URLs da API
    const API_BASE_URL = '/api/notas';

    // Toast notifications
    function showToast(message, type = 'info', duration = 5000) {
        if (!toastContainer) return;

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

        if (type !== 'error') {
            const timerBar = document.createElement('div');
            timerBar.className = 'toast-timer-bar';
            timerBar.style.animationDuration = `${duration / 1000}s`;
            toast.appendChild(timerBar);
        }

        toastContainer.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.add('toast--visible');
        });

        if (type !== 'error') {
            setTimeout(() => {
                closeButton.onclick();
            }, duration);
        }
    }

    // Formatação de data
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatDateShort(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit'
        });
    }

    // Verificar se lembrete está próximo ou vencido
    function getStatusLembrete(dataLembrete) {
        if (!dataLembrete) return null;
        
        const now = new Date();
        const lembrete = new Date(dataLembrete);
        const diffHours = (lembrete - now) / (1000 * 60 * 60);
        
        if (diffHours < 0) return 'vencido';
        if (diffHours < 24) return 'urgente';
        return 'normal';
    }

    // Renderizar notas
    function renderNotas(notas) {
        notasGrid.innerHTML = '';
        
        if (notas.length === 0) {
            notasEmptyState.style.display = 'block';
            notasGrid.style.display = 'none';
            return;
        }

        notasEmptyState.style.display = 'none';
        notasGrid.style.display = 'grid';

        notas.forEach(nota => {
            const notaCard = createNotaCard(nota);
            notasGrid.appendChild(notaCard);
        });
    }

    // Criar card da nota
    function createNotaCard(nota) {
        const card = document.createElement('div');
        card.className = `nota-card ${nota.concluido ? 'concluida' : ''}`;
        card.dataset.prioridade = nota.prioridade;
        card.style.borderLeftColor = nota.cor;

        const statusLembrete = nota.tipo === 'lembrete' ? getStatusLembrete(nota.data_lembrete) : null;
        const isUrgente = statusLembrete === 'urgente' || statusLembrete === 'vencido';

        card.innerHTML = `
            <div class="nota-header">
                <div class="nota-info">
                    <h3 class="nota-titulo">${nota.titulo}</h3>
                    <div class="nota-meta">
                        <span class="nota-tipo ${nota.tipo}">${nota.tipo}</span>
                        <span class="nota-prioridade prioridade-${nota.prioridade}">${nota.prioridade}</span>
                    </div>
                </div>
                <div class="nota-actions">
                    <button class="nota-action-btn view" onclick="viewNotaDetails(${nota.id})" title="Ver detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="nota-action-btn complete" onclick="toggleConcluido(${nota.id}, ${!nota.concluido})" title="${nota.concluido ? 'Marcar como pendente' : 'Marcar como concluído'}">
                        <i class="fas ${nota.concluido ? 'fa-undo' : 'fa-check'}"></i>
                    </button>
                    <button class="nota-action-btn edit" onclick="editNota(${nota.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="nota-action-btn delete" onclick="deleteNota(${nota.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="nota-conteudo">
                ${nota.conteudo.replace(/\n/g, '<br>')}
            </div>
            <div class="nota-footer">
                <div class="nota-data">
                    <span>Criado: ${formatDateShort(nota.data_criacao)}</span>
                    ${nota.data_lembrete ? `<span class="data-lembrete ${isUrgente ? 'urgente' : ''}">
                        ${statusLembrete === 'vencido' ? '⚠️' : '⏰'} ${formatDate(nota.data_lembrete)}
                    </span>` : ''}
                </div>
                <div class="status-indicator ${nota.concluido ? 'concluido' : (isUrgente ? 'vencido' : 'pendente')}"></div>
            </div>
        `;

        return card;
    }

    // Buscar notas da API
    async function fetchNotas() {
        try {
            const queryParams = new URLSearchParams();
            
            if (filterTipo.value) queryParams.append('tipo', filterTipo.value);
            if (filterPrioridade.value) queryParams.append('prioridade', filterPrioridade.value);
            if (filterStatus.value) queryParams.append('concluido', filterStatus.value);

            const response = await fetch(`${API_BASE_URL}?${queryParams}`);
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            
            allNotas = await response.json();
            applyFilters();
        } catch (error) {
            console.error('Erro ao buscar notas:', error);
            showToast('Erro ao carregar notas. Tente novamente.', 'error');
        }
    }

    // Aplicar filtros
    function applyFilters() {
        let filteredNotas = [...allNotas];

        // Filtro de busca
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            filteredNotas = filteredNotas.filter(nota => 
                nota.titulo.toLowerCase().includes(searchTerm) ||
                nota.conteudo.toLowerCase().includes(searchTerm)
            );
        }

        renderNotas(filteredNotas);
    }

    // Abrir modal
    function openModal(title = 'Nova Nota/Lembrete') {
        modalTitle.textContent = title;
        notaModal.classList.add('active');
        modalOverlay.classList.add('active');
        notaTitulo.focus();
    }

    // Fechar modal
    function closeModal() {
        notaModal.classList.remove('active');
        modalOverlay.classList.remove('active');
        notaForm.reset();
        editingNotaId = null;
        notaId.value = '';
        dataLembreteGroup.style.display = 'none';
    }

    // Salvar nota
    async function saveNota(formData) {
        try {
            const url = editingNotaId ? `${API_BASE_URL}/${editingNotaId}` : API_BASE_URL;
            const method = editingNotaId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao salvar nota');
            }

            const savedNota = await response.json();
            showToast(`Nota ${editingNotaId ? 'atualizada' : 'criada'} com sucesso!`, 'success');
            closeModal();
            fetchNotas();
        } catch (error) {
            console.error('Erro ao salvar nota:', error);
            showToast(error.message, 'error');
        }
    }

    // Excluir nota
    window.deleteNota = async function(id) {
        if (!confirm('Tem certeza que deseja excluir esta nota?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao excluir nota');
            }

            showToast('Nota excluída com sucesso!', 'success');
            fetchNotas();
        } catch (error) {
            console.error('Erro ao excluir nota:', error);
            showToast(error.message, 'error');
        }
    };

    // Editar nota
    window.editNota = async function(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`);
            if (!response.ok) throw new Error('Erro ao carregar nota');

            const nota = await response.json();
            
            editingNotaId = id;
            notaId.value = id;
            notaTitulo.value = nota.titulo;
            notaTipo.value = nota.tipo;
            notaPrioridade.value = nota.prioridade;
            notaCor.value = nota.cor;
            notaConteudo.value = nota.conteudo;

            if (nota.data_lembrete) {
                const date = new Date(nota.data_lembrete);
                dataLembrete.value = date.toISOString().slice(0, 16);
            }

            // Mostrar/ocultar campo de data baseado no tipo
            if (nota.tipo === 'lembrete') {
                dataLembreteGroup.style.display = 'block';
            }

            openModal('Editar Nota/Lembrete');
        } catch (error) {
            console.error('Erro ao carregar nota:', error);
            showToast('Erro ao carregar dados da nota', 'error');
        }
    };

    // Toggle concluído
    window.toggleConcluido = async function(id, concluido) {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}/concluir`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ concluido })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao atualizar status');
            }

            fetchNotas();
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            showToast(error.message, 'error');
        }
    };

    // Ver detalhes da nota
    window.viewNotaDetails = async function(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`);
            if (!response.ok) throw new Error('Erro ao carregar nota');

            const nota = await response.json();
            showNotaDetailsModal(nota);
        } catch (error) {
            console.error('Erro ao carregar detalhes da nota:', error);
            showToast('Erro ao carregar detalhes da nota', 'error');
        }
    };

    // Mostrar modal de detalhes
    function showNotaDetailsModal(nota) {
        // Verificar se o modal já existe, senão criar
        let detailsModal = document.getElementById('notaDetailsModal');
        if (!detailsModal) {
            createDetailsModal();
            detailsModal = document.getElementById('notaDetailsModal');
        }

        // Preencher os dados
        const statusLembrete = nota.tipo === 'lembrete' ? getStatusLembrete(nota.data_lembrete) : null;
        const isUrgente = statusLembrete === 'urgente' || statusLembrete === 'vencido';

        document.getElementById('detailsTitulo').textContent = nota.titulo;
        document.getElementById('detailsTipo').innerHTML = `
            <span class="nota-tipo ${nota.tipo}">${nota.tipo}</span>
        `;
        document.getElementById('detailsPrioridade').innerHTML = `
            <span class="nota-prioridade prioridade-${nota.prioridade}">${nota.prioridade}</span>
        `;
        document.getElementById('detailsCor').style.backgroundColor = nota.cor;
        document.getElementById('detailsConteudo').innerHTML = nota.conteudo.replace(/\n/g, '<br>');
        document.getElementById('detailsDataCriacao').textContent = formatDate(nota.data_criacao);
        
        const statusElement = document.getElementById('detailsStatus');
        statusElement.innerHTML = `
            <span class="status-badge ${nota.concluido ? 'concluido' : 'pendente'}">
                ${nota.concluido ? '✅ Concluído' : '⏳ Pendente'}
            </span>
        `;

        // Campo de lembrete
        const lembreteSection = document.getElementById('detailsLembreteSection');
        if (nota.tipo === 'lembrete' && nota.data_lembrete) {
            lembreteSection.style.display = 'block';
            lembreteSection.innerHTML = `
                <div class="detail-field">
                    <strong>Data/Hora do Lembrete:</strong>
                    <div class="data-lembrete ${isUrgente ? 'urgente' : ''}">
                        ${statusLembrete === 'vencido' ? '⚠️' : '⏰'} ${formatDate(nota.data_lembrete)}
                        ${isUrgente ? `<span class="status-alert">(${statusLembrete === 'vencido' ? 'Vencido' : 'Urgente'})</span>` : ''}
                    </div>
                </div>
            `;
        } else {
            lembreteSection.style.display = 'none';
        }

        // Botões de ação
        const actionsContainer = document.getElementById('detailsActions');
        actionsContainer.innerHTML = `
            <button class="btn-outline" onclick="closeDetailsModal()">Fechar</button>
            <button class="btn-secondary" onclick="closeDetailsModal(); editNota(${nota.id})">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn-primary" onclick="toggleConcluido(${nota.id}, ${!nota.concluido}); closeDetailsModal(); setTimeout(fetchNotas, 100)">
                <i class="fas ${nota.concluido ? 'fa-undo' : 'fa-check'}"></i> 
                ${nota.concluido ? 'Marcar como Pendente' : 'Marcar como Concluído'}
            </button>
        `;

        // Mostrar o modal
        detailsModal.classList.add('active');
        modalOverlay.classList.add('active');
    }

    // Criar modal de detalhes
    function createDetailsModal() {
        const modal = document.createElement('div');
        modal.id = 'notaDetailsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content details-modal">
                <div class="modal-header">
                    <h2 id="detailsTitulo"></h2>
                    <span class="close-modal" onclick="closeDetailsModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="details-content">
                        <div class="details-meta">
                            <div class="detail-field">
                                <strong>Tipo:</strong>
                                <div id="detailsTipo"></div>
                            </div>
                            <div class="detail-field">
                                <strong>Prioridade:</strong>
                                <div id="detailsPrioridade"></div>
                            </div>
                            <div class="detail-field">
                                <strong>Cor:</strong>
                                <div class="color-preview" id="detailsCor"></div>
                            </div>
                            <div class="detail-field">
                                <strong>Status:</strong>
                                <div id="detailsStatus"></div>
                            </div>
                            <div class="detail-field">
                                <strong>Data de Criação:</strong>
                                <div id="detailsDataCriacao"></div>
                            </div>
                        </div>
                        
                        <div id="detailsLembreteSection" style="display: none;"></div>
                        
                        <div class="detail-field">
                            <strong>Conteúdo:</strong>
                            <div class="details-conteudo" id="detailsConteudo"></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <div id="detailsActions"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Fechar modal de detalhes
    window.closeDetailsModal = function() {
        const detailsModal = document.getElementById('notaDetailsModal');
        if (detailsModal) {
            detailsModal.classList.remove('active');
        }
        modalOverlay.classList.remove('active');
    };

    // Event Listeners
    addNotaBtn.addEventListener('click', () => openModal());
    closeNotaModal.addEventListener('click', closeModal);
    cancelNotaBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // Mostrar/ocultar campo de data baseado no tipo
    notaTipo.addEventListener('change', function() {
        if (this.value === 'lembrete') {
            dataLembreteGroup.style.display = 'block';
            dataLembrete.required = true;
        } else {
            dataLembreteGroup.style.display = 'none';
            dataLembrete.required = false;
            dataLembrete.value = '';
        }
    });

    // Submit do formulário
    notaForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvando...';

        const formData = {
            titulo: notaTitulo.value.trim(),
            conteudo: notaConteudo.value.trim(),
            tipo: notaTipo.value,
            prioridade: notaPrioridade.value,
            cor: notaCor.value,
            data_lembrete: dataLembrete.value || null
        };

        await saveNota(formData);

        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    });

    // Filtros
    [filterTipo, filterPrioridade, filterStatus].forEach(filter => {
        filter.addEventListener('change', fetchNotas);
    });

    // Busca
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 300);
    });

    // Tecla ESC para fechar modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (notaModal.classList.contains('active')) {
                closeModal();
            }
            const detailsModal = document.getElementById('notaDetailsModal');
            if (detailsModal && detailsModal.classList.contains('active')) {
                closeDetailsModal();
            }
        }
    });

    // Inicializar
    fetchNotas();
}); 