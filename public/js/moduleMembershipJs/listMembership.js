/**
 * @file Manages the UI and logic for the membership list page.
 * @description This class handles filtering, sorting, searching, and displaying modals for member details and family members.
 */
class MembershipListManager {
  /**
   * Initializes the manager by caching DOM elements and binding events.
   */
  constructor() {
    this.dom = {};
    this.cacheDOM();
    this.bindEvents();
    this.applyInitialFormatting();
  }

  /**
   * Gathers and stores references to all necessary DOM elements.
   */
  cacheDOM() {
    this.dom.reportButton = document.getElementById("reportButton");
    this.dom.reportModal = document.getElementById("reportModal");
    this.dom.closeReportModal = document.getElementById("closeReportModal");
    this.dom.searchInput = document.getElementById("searchInput");
    this.dom.statusFilter = document.getElementById("statusFilter");
    this.dom.sortBy = document.getElementById("sortBy");
    this.dom.membershipsTableBody = document.getElementById("membershipsTableBody");
    this.dom.memberModalTemplate = document.getElementById('integrantes-modal-template');
    this.dom.detailsModalTemplate = document.getElementById('details-modal-template');
  }

  /**
   * Attaches event listeners to the DOM elements.
   */
  bindEvents() {
    // Report Modal Listeners
    if (this.dom.reportButton && this.dom.reportModal && this.dom.closeReportModal) {
      this.dom.reportButton.addEventListener("click", () => this.toggleReportModal(true));
      this.dom.closeReportModal.addEventListener("click", () => this.toggleReportModal(false));
      this.dom.reportModal.addEventListener("click", (e) => {
        if (e.target === this.dom.reportModal) {
          this.toggleReportModal(false);
        }
      });
    }

    // Filter and Sort Listeners
    const filterSortHandler = () => this.filterAndSortMemberships();
    if (this.dom.searchInput) {
      this.dom.searchInput.addEventListener("input", filterSortHandler);
    }
    if (this.dom.statusFilter) {
      this.dom.statusFilter.addEventListener("change", filterSortHandler);
    }
    if (this.dom.sortBy) {
      this.dom.sortBy.addEventListener("change", filterSortHandler);
    }

    // Event delegation for action buttons
    document.addEventListener('click', (e) => {
      const viewMembersBtn = e.target.closest('.view-members-btn');
      if (viewMembersBtn) {
        this.handleViewMembersClick(viewMembersBtn);
        return;
      }

      const viewDetailsBtn = e.target.closest('.view-details-btn');
      if (viewDetailsBtn) {
        this.handleViewDetailsClick(viewDetailsBtn);
      }
    });
  }

  /**
   * Toggles the visibility of the report modal.
   * @param {boolean} show - True to show the modal, false to hide it.
   */
  toggleReportModal(show) {
      if (show) {
          this.dom.reportModal.classList.remove("hidden");
      } else {
          this.dom.reportModal.classList.add("hidden");
      }
  }

  /**
   * Applies initial UI formatting, like generating avatars and formatting dates.
   */
  applyInitialFormatting() {
    document.querySelectorAll("[data-initial]").forEach((element) => {
      const name = element.getAttribute("data-initial");
      element.textContent = this.getInitials(name);
    });

    document.querySelectorAll(".date-field").forEach((field) => {
      const dateText = field.textContent.trim();
      if (dateText && !isNaN(new Date(dateText).getTime())) {
        field.textContent = this.formatDate(dateText);
        field.setAttribute("data-original", dateText);
      }
    });
  }

  /**
   * Gets the first letter of a name for an avatar.
   * @param {string} name - The full name.
   * @returns {string} The capitalized first letter.
   */
  getInitials(name) {
    return name ? name.charAt(0).toUpperCase() : "";
  }

  /**
   * Formats a date string into DD/MM/YY format.
   * @param {string} dateString - The ISO date string.
   * @returns {string} The formatted date.
   */
  formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  }

  /**
   * Displays a modal with the list of family members.
   * @param {Array<object>} members - An array of member objects.
   */
  showMembersModal(members) {
    if (!members || members.length === 0) {
      alert("This membership has no registered members.");
      return;
    }

    if (!this.dom.memberModalTemplate) {
      console.error('Template "#integrantes-modal-template" not found.');
      return;
    }

    const modalClone = this.dom.memberModalTemplate.content.cloneNode(true);
    const listContainer = modalClone.querySelector('[data-template-content="integrantes-list"]');

    members.forEach(member => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="py-2">
            <div class="flex items-center">
                <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span class="text-purple-600 font-bold">${this.getInitials(member.nombre_completo)}</span>
                </div>
                <span class="text-sm text-gray-700">${member.nombre_completo || "No name"}</span>
            </div>
        </td>
      `;
      listContainer.appendChild(row);
    });

    const modalElement = modalClone.firstElementChild;
    document.body.appendChild(modalElement);

    const closeModal = () => modalElement.remove();
    modalElement.querySelector('.close-integrantes-modal').addEventListener('click', closeModal);
    modalElement.addEventListener('click', (e) => {
      if (e.target === modalElement) closeModal();
    });
  }

  /**
   * Displays a modal with detailed information about a membership.
   * @param {object} details - The membership details object from the API.
   */
  showDetailsModal(details) {
    if (!this.dom.detailsModalTemplate) {
      console.error('Template "#details-modal-template" not found.');
      return;
    }
    const modalClone = this.dom.detailsModalTemplate.content.cloneNode(true);

    const infoContainer = modalClone.querySelector('[data-template-content="details-info"]');
    const qrContainer = modalClone.querySelector('[data-template-content="details-qr"]');

    infoContainer.innerHTML = `
      <div><p class="text-sm font-semibold text-gray-500">Holder</p><p class="text-lg font-medium text-gray-900">${details.nombre_completo}</p></div>
      <div><p class="text-sm font-semibold text-gray-500">Membership Type</p><p class="text-lg font-medium text-gray-900">${details.tipo_membresia}</p></div>
      <div><p class="text-sm font-semibold text-gray-500">Period</p><p class="text-lg font-medium text-gray-900">${this.formatDate(details.fecha_inicio)} - ${this.formatDate(details.fecha_fin)}</p></div>
      ${(details.integrantes && details.integrantes.length > 0) ? `<div><p class="text-sm font-semibold text-gray-500">Members</p><ul class="list-disc list-inside mt-1 space-y-1">${details.integrantes.map(int => `<li class="text-gray-700">${int.nombre_completo}</li>`).join('')}</ul></div>` : ''}
      ${(details.pagos && details.pagos.length > 0) ? `<div><p class="text-sm font-semibold text-gray-500">Last Payment</p><p class="text-lg font-medium text-gray-900">$${details.pagos[0].monto} (${details.pagos[0].metodo_pago})</p></div>` : ''}
    `;

    let qrHtml = `<img src="${details.qr_path}?t=${new Date().getTime()}" alt="QR Code" class="w-48 h-48">`;
    if (details.isAdmin) {
      qrHtml += `<a href="${details.qr_path}" download="qr-membership-${details.id_activa}.png" class="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"><i class="fas fa-download mr-2"></i>Download QR</a>`;
    }
    qrContainer.innerHTML = qrHtml;

    const modalElement = modalClone.firstElementChild;
    document.body.appendChild(modalElement);

    const closeModal = () => modalElement.remove();
    modalElement.querySelectorAll('.close-details-modal').forEach(btn => btn.addEventListener('click', closeModal));
    modalElement.addEventListener('click', (e) => {
      if (e.target === modalElement) closeModal();
    });
  }

  /**
   * Fetches and displays membership details when a 'View Details' button is clicked.
   * @param {HTMLElement} button - The button element that was clicked.
   */
  async handleViewDetailsClick(button) {
    const id = button.getAttribute("data-id");
    if (!id) return console.error("Membership ID not found on button.");

    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
      const response = await fetch(`/api/memberships/details/${id}`);
      if (!response.ok) throw new Error('Failed to load details.');
      const details = await response.json();
      this.showDetailsModal(details);
    } catch (error) {
      console.error("Error fetching membership details:", error);
      alert("Error: Could not retrieve membership details.");
    } finally {
      button.innerHTML = originalHtml;
      button.disabled = false;
    }
  }

  /**
   * Fetches and displays family members when a 'View Members' button is clicked.
   * @param {HTMLElement} button - The button element that was clicked.
   */
  async handleViewMembersClick(button) {
    const activeId = button.getAttribute("data-id-activa");
    if (!activeId) return alert("Could not get membership information.");

    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
      const response = await fetch(`/api/memberships/${activeId}/integrantes`);
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      const members = await response.json();
      this.showMembersModal(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      alert(`Error loading members: ${error.message}`);
    } finally {
      button.innerHTML = originalHtml;
      button.disabled = false;
    }
  }

  /**
   * Filters and sorts the memberships table based on current UI controls.
   */
  filterAndSortMemberships() {
    const searchTerm = this.dom.searchInput ? this.dom.searchInput.value.toLowerCase() : "";
    const statusValue = this.dom.statusFilter ? this.dom.statusFilter.value : "all";
    const sortValue = this.dom.sortBy ? this.dom.sortBy.value : "expiry";

    const rows = this.dom.membershipsTableBody.querySelectorAll(".membership-row");

    rows.forEach((row) => {
      const textContent = row.textContent.toLowerCase();
      const statusBadge = row.querySelector(".status-badge");

      let statusMatch = true;
      if (statusValue !== "all") {
        const statusText = statusBadge ? statusBadge.textContent.toLowerCase() : "";
        if (statusValue === "active") {
          statusMatch = statusText.includes("activa");
        } else if (statusValue === "expiring") {
          statusMatch = statusText.includes("vencer");
        } else if (statusValue === "expired") {
          statusMatch = statusText.includes("vencida");
        }
      }

      const searchMatch = searchTerm === "" || textContent.includes(searchTerm);
      row.style.display = (searchMatch && statusMatch) ? "" : "none";
    });

    this.sortTable(sortValue);
  }

  /**
   * Sorts the table rows in the DOM based on the selected criteria.
   * @param {'expiry'|'recent'|'name'} criteria - The sorting criteria.
   */
  sortTable(criteria) {
    if (!this.dom.membershipsTableBody) return;

    const rows = Array.from(this.dom.membershipsTableBody.querySelectorAll(".membership-row"));

    rows.sort((a, b) => {
      switch (criteria) {
        case "name":
          const nameA = a.querySelector(".text-sm.font-semibold")?.textContent.toLowerCase() || "";
          const nameB = b.querySelector(".text-sm.font-semibold")?.textContent.toLowerCase() || "";
          return nameA.localeCompare(nameB);
        case "recent":
          const dateA = new Date(a.querySelector(".date-field[data-original]")?.getAttribute("data-original") || 0);
          const dateB = new Date(b.querySelector(".date-field[data-original]")?.getAttribute("data-original") || 0);
          return dateB - dateA;
        case "expiry":
        default:
          const daysA = parseInt(a.getAttribute('data-days-until-expiry'), 10);
          const daysB = parseInt(b.getAttribute('data-days-until-expiry'), 10);
          return daysA - daysB;
      }
    });

    rows.forEach(row => this.dom.membershipsTableBody.appendChild(row));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new MembershipListManager();
});