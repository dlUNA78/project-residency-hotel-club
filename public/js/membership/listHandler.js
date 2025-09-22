class DeleteModal {
    constructor(modalId, confirmId, cancelId) {
        this.modal = document.getElementById(modalId);
        this.confirmBtn = document.getElementById(confirmId);
        this.cancelBtn = document.getElementById(cancelId);
        this.deleteId = null;

        if (!this.modal || !this.confirmBtn || !this.cancelBtn) {
            console.error("Delete modal elements not found");
            return;
        }
        this.bindEvents();
    }

    bindEvents() {
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteId = e.currentTarget.dataset.id;
                this.show();
            });
        });

        this.cancelBtn.addEventListener('click', () => this.hide());
        this.confirmBtn.addEventListener('click', () => this.confirm());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
    }

    show() {
        this.modal.classList.remove('hidden');
    }

    hide() {
        this.modal.classList.add('hidden');
    }

    async confirm() {
        if (!this.deleteId) return;

        try {
            const response = await fetch(`/memberships/${this.deleteId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete membership.');
            window.location.reload();
        } catch (error) {
            console.error('Deletion failed:', error);
            alert('Could not delete the membership.');
        }
    }
}

class FilterHandler {
    constructor(formId) {
        this.form = document.getElementById(formId);
        if (!this.form) {
            console.error("Filter form not found");
            return;
        }
        this.bindEvents();
    }

    bindEvents() {
        // The form submission reloads the page with query params, which is the desired behavior.
        // No custom JS needed for submission, but you could add it here for AJAX-based filtering.
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DeleteModal('delete-modal', 'confirm-delete-btn', 'cancel-delete-btn');
    new FilterHandler('filters-form');
});
