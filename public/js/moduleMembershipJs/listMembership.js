/**
 * UI and logic handler for the dynamic membership list page.
 */
const MembershipList = {
  init() {
    this.cacheDom();
    this.bindEvents();
    this.fetchAndRender();
  },

  cacheDom() {
    this.tableBody = document.getElementById('memberships-table-body');
    this.searchInput = document.getElementById('search-input');
    this.statusFilter = document.getElementById('status-filter');
    this.sortBy = document.getElementById('sort-by');
    this.deleteModal = document.getElementById('delete-modal');
    this.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    this.cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  },

  bindEvents() {
    // Use debounce to avoid excessive API calls on input
    this.searchInput.addEventListener('input', this.debounce(() => this.fetchAndRender(), 300));
    this.statusFilter.addEventListener('change', () => this.fetchAndRender());
    this.sortBy.addEventListener('change', () => this.fetchAndRender());

    // Event delegation for delete buttons
    this.tableBody.addEventListener('click', e => {
      if (e.target.closest('.delete-btn')) {
        const button = e.target.closest('.delete-btn');
        const id = button.dataset.id;
        const name = button.dataset.name;
        this.showDeleteModal(id, name);
      }
    });

    this.cancelDeleteBtn.addEventListener('click', () => this.hideDeleteModal());
    this.confirmDeleteBtn.addEventListener('click', () => this.handleDelete());
  },

  async fetchAndRender() {
    const searchTerm = this.searchInput.value;
    const status = this.statusFilter.value;
    const sort = this.sortBy.value;

    const query = new URLSearchParams({ searchTerm, status, sort });
    this.tableBody.innerHTML = '<tr><td colspan="5" class="text-center p-8">Loading...</td></tr>';

    try {
      const response = await fetch(`/api/memberships?${query}`);
      if (!response.ok) throw new Error('Failed to fetch memberships.');

      const memberships = await response.json();
      this.renderTable(memberships);
    } catch (error) {
      this.tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-red-500">Error: ${error.message}</td></tr>`;
    }
  },

  renderTable(memberships) {
    this.tableBody.innerHTML = ''; // Clear existing rows
    if (memberships.length === 0) {
        this.tableBody.innerHTML = '<tr><td colspan="5" class="text-center p-8">No memberships found.</td></tr>';
        return;
    }
    memberships.forEach(m => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-gray-50';
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">${m.holderName}</td>
        <td class="px-4 py-4 whitespace-nowrap">${m.membershipType}</td>
        <td class="px-4 py-4 whitespace-nowrap">${new Date(m.startDate).toLocaleDateString()} - ${new Date(m.endDate).toLocaleDateString()}</td>
        <td class="px-4 py-4 whitespace-nowrap">${m.status} (${m.daysRemaining} days)</td>
        <td class="px-4 py-4 whitespace-nowrap text-sm font-medium">
          <a href="/memberships/edit/${m.activeMembershipId}" class="text-indigo-600 hover:text-indigo-900">Edit</a>
          <button data-id="${m.activeMembershipId}" data-name="${m.holderName}" class="delete-btn text-red-600 hover:text-red-900 ml-4">Delete</button>
        </td>
      `;
      this.tableBody.appendChild(row);
    });
  },

  showDeleteModal(id, name) {
    this.membershipIdToDelete = id;
    this.deleteModal.querySelector('p').innerHTML = `Are you sure you want to delete the membership for <strong>${name}</strong>? This action cannot be undone.`;
    this.deleteModal.classList.remove('hidden');
  },

  hideDeleteModal() {
    this.membershipIdToDelete = null;
    this.deleteModal.classList.add('hidden');
  },

  async handleDelete() {
    if (!this.membershipIdToDelete) return;

    this.confirmDeleteBtn.disabled = true;
    this.confirmDeleteBtn.textContent = 'Deleting...';

    try {
        const response = await fetch(`/api/memberships/${this.membershipIdToDelete}`, { method: 'DELETE' });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete.');
        }
        this.hideDeleteModal();
        this.fetchAndRender(); // Re-fetch the list
    } catch (error) {
        alert(`Error: ${error.message}`); // Simple error display
    } finally {
        this.confirmDeleteBtn.disabled = false;
        this.confirmDeleteBtn.textContent = 'Delete';
    }
  },

  debounce(func, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }
};

document.addEventListener('DOMContentLoaded', () => MembershipList.init());
