class ApiHandler {
    static async post(url, data) {
        try {
            const response = await fetch(url, {
                method: "POST",
                body: new URLSearchParams(data),
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });
            const responseData = await response.json();
            if (!response.ok) {
                throw new Error(responseData.error || responseData.message || "Unknown server error");
            }
            return responseData;
        } catch (err) {
            console.error(`API Error on POST ${url}:`, err);
            throw err;
        }
    }
}

class SuccessModal {
    static show(data) {
        const modalHTML = this.createModalHTML(data);
        document.body.insertAdjacentHTML("beforeend", modalHTML);
        const modalElement = document.getElementById("successModal");
        modalElement.querySelector("#close-success-modal-btn").addEventListener("click", () => this.close());
    }

    static close() {
        const modal = document.getElementById("successModal");
        if (modal) modal.remove();
        window.location.reload();
    }

    static createModalHTML(data) {
        return `
            <div id="successModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 class="text-lg font-bold text-green-800 mb-4">Membership Created!</h3>
                    <p><strong>Holder:</strong> ${data.clientName}</p>
                    <p><strong>Type:</strong> ${data.membershipTypeName}</p>
                    <p><strong>Expires:</strong> ${data.endDate}</p>
                    <div class="mt-4 flex justify-end">
                        <button id="close-success-modal-btn" class="px-4 py-2 bg-green-600 text-white rounded-md">Close</button>
                    </div>
                </div>
            </div>`;
    }
}

class FormHandler {
    constructor(formId, messageId) {
        this.form = document.getElementById(formId);
        this.messageElement = document.getElementById(messageId);
        this.submitButton = this.form.querySelector('button[type="submit"]');
        this.isProcessing = false;
    }

    showMessage(text, type = 'error') {
        this.messageElement.textContent = text;
        this.messageElement.className = `text-sm font-medium ${type === 'success' ? 'text-green-600' : 'text-red-600'}`;
        setTimeout(() => { this.messageElement.className = 'hidden'; }, 5000);
    }

    toggleSubmit(enable, text = 'Processing...') {
        this.isProcessing = !enable;
        this.submitButton.disabled = !enable;
        if (!enable) {
            this.originalButtonText = this.submitButton.innerHTML;
            this.submitButton.innerHTML = text;
        } else {
            this.submitButton.innerHTML = this.originalButtonText;
        }
    }
}

class ClientFormHandler extends FormHandler {
    constructor(formId, messageId, onClientCreated) {
        super(formId, messageId);
        this.onClientCreated = onClientCreated;
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (this.isProcessing) return;
        this.toggleSubmit(false, 'Registering...');
        try {
            const formData = new FormData(this.form);
            const result = await ApiHandler.post(this.form.action, formData);
            if (result.clientId) {
                this.showMessage('Client registered successfully.', 'success');
                this.onClientCreated(result.clientId);
            } else {
                throw new Error('No valid client ID received.');
            }
        } catch (err) {
            this.showMessage(err.message);
        } finally {
            this.toggleSubmit(true);
        }
    }
}

class MembershipFormHandler extends FormHandler {
    constructor(formId, messageId) {
        super(formId, messageId);
        this.isClientRegistered = false;
        this.elements = {
            clientIdInput: document.getElementById('id_cliente'),
            membershipTypeSelect: document.getElementById('membershipType'),
            startDateInput: document.getElementById('fecha_inicio'),
            endDateInput: document.getElementById('fecha_fin'),
            finalPriceInput: document.getElementById('finalPrice'),
            finalPriceHidden: document.getElementById('precio_final'),
            familySection: document.getElementById('family-members-section'),
            familyContainer: document.getElementById('family-members-container'),
            addMemberBtn: document.getElementById('add-member-btn'),
            discountInput: document.getElementById('discount'),
            applyDiscountBtn: document.getElementById('apply-discount-btn'),
        };
        this.state = { maxMembers: 1, basePrice: 0, discountPercent: 0, membershipDurationDays: 30 };
        this.bindEvents();
        this.setMinDate();
        this.updateFormState();
    }

    bindEvents() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        this.elements.membershipTypeSelect.addEventListener('change', this.updateFormState.bind(this));
        this.elements.startDateInput.addEventListener('change', this.calculateEndDate.bind(this));
        this.elements.addMemberBtn.addEventListener('click', this.addFamilyMember.bind(this));
        if (this.elements.applyDiscountBtn) {
            this.elements.applyDiscountBtn.addEventListener('click', this.applyDiscount.bind(this));
        }
    }

    setClientRegistered(clientId) {
        this.isClientRegistered = true;
        this.elements.clientIdInput.value = clientId;
        this.submitButton.disabled = false;
        this.submitButton.textContent = 'Create Membership';
        this.submitButton.classList.replace('bg-gray-400', 'bg-green-600');
    }

    setMinDate() {
        this.elements.startDateInput.min = new Date().toISOString().split('T')[0];
    }

    updateFormState() {
        const selectedOption = this.elements.membershipTypeSelect.options[this.elements.membershipTypeSelect.selectedIndex];
        this.state.maxMembers = parseInt(selectedOption.dataset.max, 10);
        this.state.basePrice = parseFloat(selectedOption.dataset.price);
        this.updatePrice();
        this.toggleFamilySection();
    }

    calculateEndDate() {
        if (!this.elements.startDateInput.value) return;
        const startDate = new Date(this.elements.startDateInput.value);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + this.state.membershipDurationDays);
        this.elements.endDateInput.value = endDate.toISOString().split('T')[0];
    }

    toggleFamilySection() {
        if (this.state.maxMembers > 1) {
            this.elements.familySection.classList.remove('hidden');
            if (this.elements.familyContainer.children.length === 0) this.addFamilyMember();
        } else {
            this.elements.familySection.classList.add('hidden');
            this.elements.familyContainer.innerHTML = '';
        }
    }

    addFamilyMember() {
        const currentCount = this.elements.familyContainer.children.length;
        if (currentCount < this.state.maxMembers - 1) {
            const memberDiv = document.createElement('div');
            memberDiv.className = 'flex items-center space-x-2 mb-2';
            memberDiv.innerHTML = `<input type="text" name="integrantes" placeholder="Family member's full name" required class="flex-1 px-3 py-2 border rounded"><button type="button" class="removeBtn text-red-500">❌</button>`;
            memberDiv.querySelector('.removeBtn').addEventListener('click', () => memberDiv.remove());
            this.elements.familyContainer.appendChild(memberDiv);
        } else {
            this.showMessage(`Maximum of ${this.state.maxMembers - 1} additional members allowed.`);
        }
    }

    applyDiscount() {
        const discount = parseInt(this.elements.discountInput.value, 10) || 0;
        if (discount < 0 || discount > 100) {
            this.showMessage('Discount must be between 0 and 100.');
            return;
        }
        this.state.discountPercent = discount;
        this.updatePrice();
        this.showMessage(`Discount of ${discount}% applied.`, 'success');
    }

    updatePrice() {
        const finalPrice = this.state.basePrice * (1 - this.state.discountPercent / 100);
        this.elements.finalPriceInput.value = `$${finalPrice.toFixed(2)}`;
        this.elements.finalPriceHidden.value = finalPrice.toFixed(2);
    }

    validate() {
        if (!this.isClientRegistered) {
            this.showMessage('Please register a client first.');
            return false;
        }
        return true;
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (this.isProcessing || !this.validate()) return;
        this.toggleSubmit(false, 'Creating...');
        try {
            const formData = new FormData(this.form);
            const result = await ApiHandler.post(this.form.action, formData);
            if (result.success) SuccessModal.show(result.data);
            else throw new Error(result.message || 'Failed to create membership.');
        } catch (err) {
            this.showMessage(err.message);
        } finally {
            this.toggleSubmit(true);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const membershipForm = new MembershipFormHandler('membership-form', 'membership-message');
    new ClientFormHandler('client-form', 'client-message', (clientId) => {
        membershipForm.setClientRegistered(clientId);
    });
});
