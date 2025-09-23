/**
 * UI and logic handler for the membership creation form.
 */
const MembershipForm = {
  init() {
    this.cacheDom();
    this.bindEvents();
    this.setInitialState();
  },

  cacheDom() {
    this.clientForm = document.getElementById('client-form');
    this.membershipForm = document.getElementById('membership-form');
    this.clientMessage = document.getElementById('client-message');
    this.membershipMessage = document.getElementById('membership-message');
    this.clientIdInput = document.getElementById('clientId');
    this.submitMembershipBtn = document.getElementById('submit-membership-btn');
    this.membershipTypeSelect = document.getElementById('membershipType');
    this.membersSection = document.getElementById('members-section');
    this.membersContainer = document.getElementById('members-container');
    this.addMemberBtn = document.getElementById('add-member-btn');
    this.finalPriceDisplay = document.getElementById('final-price-display');
    this.finalPriceInput = document.getElementById('finalPrice');
    this.startDateInput = document.getElementById('startDate');
    this.endDateInput = document.getElementById('endDate');
    this.discountInput = document.getElementById('discount');
    this.applyDiscountBtn = document.getElementById('apply-discount-btn');
    this.clientModal = document.getElementById('client-modal');
    this.clientModalContent = document.getElementById('client-modal-content');
    this.cancelClientBtn = document.getElementById('cancel-client-btn');
    this.confirmClientBtn = document.getElementById('confirm-client-btn');
    this.membershipModal = document.getElementById('membership-modal');
    this.membershipModalContent = document.getElementById('membership-modal-content');
    this.cancelMembershipBtn = document.getElementById('cancel-membership-btn');
    this.confirmMembershipBtn = document.getElementById('confirm-membership-btn');
  },

  setInitialState() {
    this.maxMembers = 1;
    this.isClientRegistered = false;
    this.membershipDurationDays = 30; // Assuming 30 days for now
    this.basePrice = 0;
    this.appliedDiscount = 0;
    this.isProcessingClient = false;
    this.isProcessingMembership = false;

    const today = new Date().toISOString().split('T')[0];
    this.startDateInput.min = today;

    this.membershipTypeSelect.dispatchEvent(new Event('change'));
  },

  bindEvents() {
    this.clientForm.addEventListener('submit', e => {
      e.preventDefault();
      if (this.isProcessingClient) return;
      this.showClientModal();
    });

    this.confirmClientBtn.addEventListener('click', () => {
      if (this.isProcessingClient) return;
      this.handleClientFormSubmit();
    });

    this.cancelClientBtn.addEventListener('click', () => this.clientModal.classList.add('hidden'));

    this.membershipForm.addEventListener('submit', e => {
      e.preventDefault();
      if (this.isProcessingMembership) return;
      if (!this.isClientRegistered) {
        this.showMessage(this.membershipMessage, "You must register a client first.", "error");
        return;
      }
      this.showMembershipModal();
    });

    this.confirmMembershipBtn.addEventListener('click', () => {
        if (this.isProcessingMembership) return;
        this.handleMembershipFormSubmit();
    });

    this.cancelMembershipBtn.addEventListener('click', () => this.membershipModal.classList.add('hidden'));

    this.membershipTypeSelect.addEventListener('change', e => this.handleMembershipTypeChange(e));
    this.startDateInput.addEventListener('change', () => this.calculateEndDate());
    this.addMemberBtn.addEventListener('click', () => this.addMemberInput());
    if (this.applyDiscountBtn) {
        this.applyDiscountBtn.addEventListener('click', () => this.applyDiscount());
    }
  },

  // Client form logic
  showClientModal() {
    const formData = new FormData(this.clientForm);
    const fullName = formData.get('fullName');
    const phone = formData.get('phone') || 'Not provided';
    const email = formData.get('email');
    this.clientModalContent.innerHTML = `<p><strong>Name:</strong> ${fullName}</p><p><strong>Phone:</strong> ${phone}</p><p><strong>Email:</strong> ${email}</p>`;
    this.clientModal.classList.remove('hidden');
  },

  async handleClientFormSubmit() {
    this.isProcessingClient = true;
    this.clientModal.classList.add('hidden');
    this.confirmClientBtn.disabled = true;
    const submitBtn = this.clientForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Processing...';

    try {
      const formData = Object.fromEntries(new FormData(this.clientForm));
      const response = await fetch(this.clientForm.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create client.');

      this.clientIdInput.value = data.clientId;
      this.isClientRegistered = true;
      this.submitMembershipBtn.disabled = false;
      this.submitMembershipBtn.classList.replace('bg-gray-400', 'bg-green-600');
      this.submitMembershipBtn.textContent = 'Create Membership';
      this.showMessage(this.clientMessage, 'Client registered successfully. You can now create the membership.', 'success');
      this.membershipForm.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      this.showMessage(this.clientMessage, `Error: ${err.message}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Register Client';
      this.confirmClientBtn.disabled = false;
      this.isProcessingClient = false;
    }
  },

  // Membership form logic
  showMembershipModal() {
    const formData = new FormData(this.membershipForm);
    const typeText = this.membershipTypeSelect.options[this.membershipTypeSelect.selectedIndex].text;
    let membersHTML = '';
    const members = Array.from(document.querySelectorAll('input[name="members[]"]')).map(input => input.value);
    if (members.length > 0) {
        membersHTML = `<p><strong>Members:</strong></p><ul class="list-disc pl-5 mt-1">${members.map(m => `<li>${m}</li>`).join('')}</ul>`;
    }
    this.membershipModalContent.innerHTML = `
        <p><strong>Type:</strong> ${typeText}</p>
        <p><strong>Start Date:</strong> ${formData.get('startDate')}</p>
        <p><strong>End Date:</strong> ${this.endDateInput.value}</p>
        <p><strong>Final Price:</strong> ${this.finalPriceDisplay.value}</p>
        ${membersHTML}
    `;
    this.membershipModal.classList.remove('hidden');
  },

  async handleMembershipFormSubmit() {
    this.isProcessingMembership = true;
    this.membershipModal.classList.add('hidden');
    this.confirmMembershipBtn.disabled = true;
    const submitBtn = this.membershipForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Processing...';

    try {
        const formData = Object.fromEntries(new FormData(this.membershipForm));
        formData.members = Array.from(document.querySelectorAll('input[name="members[]"]')).map(input => ({ fullName: input.value }));

        const response = await fetch(this.membershipForm.action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'An unknown error occurred.');

        if (data.success) {
            this.showSuccessModal(data.data);
            this.membershipForm.classList.add('opacity-50');
            this.membershipForm.querySelectorAll('input, select, button').forEach(el => el.disabled = true);
        } else {
            throw new Error(data.message);
        }
    } catch (err) {
        this.showMessage(this.membershipMessage, `Error: ${err.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Membership';
        this.confirmMembershipBtn.disabled = false;
        this.isProcessingMembership = false;
    }
  },

  showSuccessModal(data) {
    let membersHTML = '';
    if (data.members && data.members.length > 0) {
        membersHTML = `<div class="mt-4"><h4 class="font-medium text-green-700 mb-2">Members:</h4><ul class="list-disc pl-5">${data.members.map(m => `<li>${m.fullName}</li>`).join('')}</ul></div>`;
    }
    const modalHTML = `
      <div id="successModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="text-center mb-6">
            <h3 class="text-lg font-bold text-green-800">Membership Created Successfully!</h3>
          </div>
          <div class="border border-green-200 rounded-lg p-4 mb-4">
            <p><strong>Holder:</strong> ${data.holder}</p>
            <p><strong>Type:</strong> ${data.membershipType}</p>
            <p><strong>Dates:</strong> ${data.startDate} to ${data.endDate}</p>
            <p><strong>Total Paid:</strong> $${data.finalPrice.toFixed(2)}</p>
            ${membersHTML}
          </div>
          <div class="border border-green-200 rounded-lg p-4 mb-4 text-center">
            <h4 class="font-medium text-green-700 mb-3">Access QR Code:</h4>
            <img src="${data.qrPath}" alt="Membership QR" class="w-48 h-48 mx-auto border">
            <button onclick="MembershipForm.downloadQr(${data.activeMembershipId})" class="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">Download QR</button>
          </div>
          <div class="flex justify-center space-x-3">
            <button onclick="window.location.reload()" class="px-6 py-2 border rounded-md">Create Another</button>
            <button onclick="window.location.href='/memberships/list'" class="px-6 py-2 bg-green-600 text-white rounded-md">View All Memberships</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  },

  downloadQr(activeMembershipId) {
    window.location.href = `/api/memberships/download-qr/${activeMembershipId}`;
  },

  // Helper functions
  handleMembershipTypeChange(e) {
    const selectedOption = e.target.options[e.target.selectedIndex];
    this.maxMembers = parseInt(selectedOption.dataset.maxMembers, 10);
    this.basePrice = parseFloat(selectedOption.dataset.price);
    this.updateFinalPrice();
    if (this.startDateInput.value) this.calculateEndDate();

    if (this.maxMembers > 1) {
      this.membersSection.classList.remove('hidden');
      if (this.membersContainer.children.length === 0) this.addMemberInput();
    } else {
      this.membersSection.classList.add('hidden');
      this.membersContainer.innerHTML = '';
    }
  },

  calculateEndDate() {
    if (!this.startDateInput.value) return;
    const startDate = new Date(this.startDateInput.value);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + this.membershipDurationDays);
    this.endDateInput.value = endDate.toISOString().split('T')[0];
  },

  addMemberInput() {
    const currentMemberCount = this.membersContainer.children.length;
    if (currentMemberCount < this.maxMembers - 1) {
      const memberDiv = document.createElement('div');
      memberDiv.className = 'flex items-center space-x-2 mb-2';
      memberDiv.innerHTML = `
        <input type="text" name="members[]" placeholder="Full name of member" required class="flex-1 px-3 py-2 border border-green-300 rounded-md">
        <button type="button" class="remove-btn px-3 py-2 border rounded-md text-red-700 bg-red-100 hover:bg-red-200">Remove</button>
      `;
      this.membersContainer.appendChild(memberDiv);
      memberDiv.querySelector('.remove-btn').addEventListener('click', () => memberDiv.remove());
    } else {
      this.showMessage(this.membershipMessage, `Maximum of ${this.maxMembers - 1} additional members allowed.`, 'error');
    }
  },

  applyDiscount() {
    const discount = parseInt(this.discountInput.value, 10) || 0;
    if (discount < 0 || discount > 100) {
      this.showMessage(this.membershipMessage, 'Discount must be between 0 and 100.', 'error');
      return;
    }
    this.appliedDiscount = discount;
    this.updateFinalPrice();
    this.showMessage(this.membershipMessage, `Discount of ${discount}% applied.`, 'success');
  },

  updateFinalPrice() {
    if (this.basePrice) {
      const discountedPrice = this.basePrice - this.basePrice * (this.appliedDiscount / 100);
      this.finalPriceDisplay.value = `$${discountedPrice.toFixed(2)}`;
      this.finalPriceInput.value = discountedPrice.toFixed(2);
    }
  },

  showMessage(element, text, type = 'success') {
    element.textContent = text;
    element.className = `text-sm font-medium ${type === 'success' ? 'text-green-600' : 'text-red-600'}`;
    setTimeout(() => { element.textContent = ''; element.className = 'hidden'; }, 5000);
  },
};

document.addEventListener('DOMContentLoaded', () => MembershipForm.init());
