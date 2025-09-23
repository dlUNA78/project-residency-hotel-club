/**
 * UI and logic handler for the membership edit form.
 */
const MembershipEditForm = {
  init() {
    this.cacheDom();
    this.bindEvents();
  },

  cacheDom() {
    this.form = document.getElementById('edit-membership-form');
    this.membersContainer = document.getElementById('members-container');
    this.addMemberBtn = document.getElementById('add-member-btn');
  },

  bindEvents() {
    if (this.addMemberBtn) {
      this.addMemberBtn.addEventListener('click', () => this.addMember());
    }

    // Use event delegation for remove buttons since they can be added dynamically
    if (this.membersContainer) {
        this.membersContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-member-btn')) {
                e.target.closest('.member-item').remove();
            }
        });
    }

    this.form.addEventListener('submit', e => {
        e.preventDefault();
        this.handleSubmit();
    });
  },

  addMember() {
    const memberDiv = document.createElement('div');
    memberDiv.className = 'member-item flex items-center space-x-2';
    memberDiv.innerHTML = `
        <input type="text" name="members" placeholder="Full name of member" required class="flex-1 w-full px-3 py-2 border border-gray-300 rounded-md">
        <button type="button" class="remove-member-btn bg-red-500 text-white px-3 py-2 rounded-md">Remove</button>
    `;
    this.membersContainer.appendChild(memberDiv);
  },

  async handleSubmit() {
    const formData = new FormData(this.form);
    const data = {
        fullName: formData.get('fullName'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        status: formData.get('status'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        finalPrice: formData.get('finalPrice'),
        members: Array.from(formData.getAll('members')).map(name => ({ fullName: name })),
        type: this.membersContainer ? 'Familiar' : 'Individual' // Pass the type for the model
    };

    try {
      const response = await fetch(this.form.action, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update membership.');
      }

      // On success, redirect to the list page
      window.location.href = '/memberships/list';

    } catch (error) {
      // Simple alert for now, can be improved with a proper message element
      alert(`Error: ${error.message}`);
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  MembershipEditForm.init();
});
