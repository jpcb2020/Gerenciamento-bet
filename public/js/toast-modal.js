// Toast Notifications System
class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.toast-container');
        }
    }

    show(message, type = 'info', options = {}) {
        const {
            title = this.getDefaultTitle(type),
            duration = 5000,
            closable = true,
            persistent = false
        } = options;

        const toastId = Date.now() + Math.random();
        const toast = this.createToast(toastId, title, message, type, closable);
        
        this.container.appendChild(toast);
        this.toasts.set(toastId, toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto remove if not persistent
        if (!persistent && duration > 0) {
            setTimeout(() => {
                this.hide(toastId);
            }, duration);
        }

        return toastId;
    }

    createToast(id, title, message, type, closable) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.dataset.toastId = id;

        const icon = this.getIcon(type);
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            ${closable ? '<button class="toast-close"><i class="fas fa-times"></i></button>' : ''}
        `;

        // Add close event listener
        if (closable) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => {
                this.hide(id);
            });
        }

        return toast;
    }

    hide(toastId) {
        const toast = this.toasts.get(toastId);
        if (!toast) return;

        toast.classList.remove('show');
        toast.classList.add('hide');

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts.delete(toastId);
        }, 400);
    }

    hideAll() {
        this.toasts.forEach((toast, id) => {
            this.hide(id);
        });
    }

    getIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    getDefaultTitle(type) {
        const titles = {
            success: 'Sucesso',
            error: 'Erro',
            warning: 'Atenção',
            info: 'Informação'
        };
        return titles[type] || titles.info;
    }

    // Convenience methods
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', options);
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }
}

// Confirm Modal System
class ConfirmModal {
    constructor() {
        this.overlay = null;
        this.modal = null;
        this.currentResolve = null;
        this.init();
    }

    init() {
        // Create modal structure if it doesn't exist
        if (!document.querySelector('.confirm-modal-overlay')) {
            this.createModal();
        } else {
            this.overlay = document.querySelector('.confirm-modal-overlay');
            this.modal = this.overlay.querySelector('.confirm-modal');
        }
    }

    createModal() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'confirm-modal-overlay';
        
        this.overlay.innerHTML = `
            <div class="confirm-modal">
                <div class="confirm-modal-header">
                    <div class="confirm-modal-icon">
                        <i class="fas fa-question-circle"></i>
                    </div>
                    <div class="confirm-modal-text">
                        <div class="confirm-modal-title">Confirmar Ação</div>
                        <div class="confirm-modal-subtitle">Esta ação requer confirmação</div>
                    </div>
                </div>
                <div class="confirm-modal-body">
                    <p class="confirm-modal-message">Tem certeza que deseja continuar?</p>
                </div>
                <div class="confirm-modal-actions">
                    <button class="confirm-btn confirm-btn-cancel">
                        <i class="fas fa-times"></i>
                        <span>Cancelar</span>
                    </button>
                    <button class="confirm-btn confirm-btn-confirm">
                        <i class="fas fa-check"></i>
                        <span>Confirmar</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        this.modal = this.overlay.querySelector('.confirm-modal');

        // Add event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide(false);
            }
        });

        // Cancel button
        const cancelBtn = this.overlay.querySelector('.confirm-btn-cancel');
        cancelBtn.addEventListener('click', () => {
            this.hide(false);
        });

        // Confirm button
        const confirmBtn = this.overlay.querySelector('.confirm-btn-confirm');
        confirmBtn.addEventListener('click', () => {
            this.hide(true);
        });

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
                this.hide(false);
            }
        });
    }

    show(options = {}) {
        const {
            title = 'Confirmar Ação',
            subtitle = 'Esta ação requer confirmação',
            message = 'Tem certeza que deseja continuar?',
            type = 'warning',
            confirmText = 'Confirmar',
            cancelText = 'Cancelar',
            confirmIcon = 'fa-check',
            cancelIcon = 'fa-times'
        } = options;

        // Update content
        const titleEl = this.overlay.querySelector('.confirm-modal-title');
        const subtitleEl = this.overlay.querySelector('.confirm-modal-subtitle');
        const messageEl = this.overlay.querySelector('.confirm-modal-message');
        const iconEl = this.overlay.querySelector('.confirm-modal-icon');
        const confirmBtn = this.overlay.querySelector('.confirm-btn-confirm');
        const cancelBtn = this.overlay.querySelector('.confirm-btn-cancel');

        titleEl.textContent = title;
        subtitleEl.textContent = subtitle;
        messageEl.textContent = message;
        
        // Update icon
        iconEl.className = `confirm-modal-icon ${type}`;
        const iconClass = this.getIcon(type);
        iconEl.querySelector('i').className = `fas ${iconClass}`;

        // Update buttons with new structure
        confirmBtn.innerHTML = `<i class="fas ${confirmIcon}"></i><span>${confirmText}</span>`;
        cancelBtn.innerHTML = `<i class="fas ${cancelIcon}"></i><span>${cancelText}</span>`;
        
        // Update confirm button style
        confirmBtn.className = `confirm-btn confirm-btn-confirm ${type}`;

        // Show modal
        this.overlay.classList.add('active');

        // Return promise
        return new Promise((resolve) => {
            this.currentResolve = resolve;
        });
    }



    hide(result) {
        this.overlay.classList.remove('active');
        document.body.style.overflow = '';
        
        if (this.currentResolve) {
            this.currentResolve(result);
            this.currentResolve = null;
        }
    }

    getIcon(type) {
        const icons = {
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle'
        };
        return icons[type] || icons.warning;
    }

    // Convenience methods
    confirm(message, options = {}) {
        return this.show({
            message,
            type: 'warning',
            ...options
        });
    }

    delete(message = 'Esta ação não pode ser desfeita.', options = {}) {
        return this.show({
            title: 'Confirmar Exclusão',
            subtitle: 'Atenção: Esta ação é irreversível',
            message,
            type: 'warning',
            confirmText: 'Excluir',
            confirmIcon: 'fa-trash',
            ...options
        });
    }

    info(message, options = {}) {
        return this.show({
            message,
            type: 'info',
            confirmText: 'OK',
            cancelText: 'Fechar',
            ...options
        });
    }
}

// Global instances - only create if not already exists
if (!window.toast) {
    window.toast = new ToastManager();
}
if (!window.confirmModal) {
    window.confirmModal = new ConfirmModal();
}

// Make accessible without window prefix
const toast = window.toast;
const confirmModal = window.confirmModal;

// Global functions for backward compatibility - only set if not already exists
if (!window.showToast) {
    window.showToast = (message, type = 'info', options = {}) => {
        return window.toast.show(message, type, options);
    };
}

if (!window.showConfirm) {
    window.showConfirm = (message, options = {}) => {
        return window.confirmModal.confirm(message, options);
    };
}

// Replace native alert and confirm - preserve originals
if (!window._originalAlert) {
    window._originalAlert = window.alert;
    window.alert = (message) => {
        return window.toast.info(message, { duration: 0, persistent: true });
    };
}

if (!window._originalConfirm) {
    window._originalConfirm = window.confirm;
    window.confirm = (message) => {
        return window.confirmModal.confirm(message);
    };
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ToastManager, ConfirmModal, toast, confirmModal };
}