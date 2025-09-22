class DeleteModal {
    constructor(modalId, confirmId, cancelId) {
        this.modal = document.getElementById(modalId);
        this.confirmBtn = document.getElementById(confirmId);
        this.cancelBtn = document.getElementById(cancelId);
        this.deleteId = null;
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
        this.modal.classList.add('flex');
    }

    hide() {
        this.modal.classList.add('hidden');
        this.modal.classList.remove('flex');
    }

    async confirm() {
        if (!this.deleteId) return;

        try {
            const response = await fetch(`/memberships/${this.deleteId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete membership.');
            }

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
        this.bindEvents();
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => {
            // The form submission will reload the page with query params, which is what we want.
            // No need for preventDefault() or custom fetch logic here.
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DeleteModal('delete-modal', 'confirm-delete-btn', 'cancel-delete-btn');
    new FilterHandler('filters-form');
});
