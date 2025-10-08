/**
 * @file Manages the membership deletion process via a confirmation modal.
 * @description This class handles listening for delete button clicks, showing a dynamic
 * confirmation modal, and processing the deletion via an API call.
 */
class DeleteModalManager {
  /**
   * Initializes the modal manager by finding the required DOM elements.
   */
  constructor() {
    this.modal = document.getElementById("deleteModal");
    if (!this.modal) {
      console.error("Modal element #deleteModal not found.");
      return;
    }

    // Cache all modal components
    this.iconContainer = document.getElementById("deleteModalIconContainer");
    this.icon = document.getElementById("deleteModalIcon");
    this.title = document.getElementById("deleteModalTitle");
    this.message = document.getElementById("deleteModalMessage");
    this.buttons = document.getElementById("deleteModalButtons");

    this.membershipId = null;
    this.initialize();
  }

  /**
   * Attaches event listeners to all delete buttons on the page.
   */
  initialize() {
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.membershipId = btn.getAttribute("data-id");
        const membershipName = btn.getAttribute("data-name");
        const membershipType = btn.getAttribute("data-type");
        this.showConfirmation(membershipName, membershipType);
      });
    });
  }

  /**
   * A private utility to configure and display the modal.
   * @param {object} config - The configuration for the modal display.
   * @param {string} config.title - The title of the modal.
   * @param {string} config.message - The message content (can be HTML).
   * @param {string} config.iconClass - FontAwesome icon classes.
   * @param {string} config.iconBgClass - Tailwind CSS class for the icon background.
   * @param {Array<object>} [config.buttons] - An array of button configurations.
   */
  _showModal(config) {
    this.title.textContent = config.title;
    this.message.innerHTML = config.message;

    this.icon.className = `text-xl ${config.iconClass}`;
    this.iconContainer.className = `p-3 rounded-full mr-4 ${config.iconBgClass}`;

    // Clear previous buttons and create new ones
    this.buttons.innerHTML = '';
    if (config.buttons) {
      config.buttons.forEach(btnConfig => {
        const button = document.createElement('button');
        button.innerHTML = btnConfig.html;
        button.className = btnConfig.class;
        button.addEventListener('click', btnConfig.onClick);
        this.buttons.appendChild(button);
      });
    }

    this.modal.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Prevent background scrolling
  }

  /**
   * Hides the modal and restores background scrolling.
   */
  hideModal() {
    this.modal.classList.add("hidden");
    document.body.style.overflow = "auto";
  }

  /**
   * Shows the initial deletion confirmation dialog.
   * @param {string} name - The name of the membership holder.
   * @param {string} type - The type of membership (e.g., "Familiar").
   */
  showConfirmation(name, type) {
    const warningText = type === "Familiar" ? " This action will also delete all associated members." : "";

    this._showModal({
      title: "Confirm Deletion",
      message: `Are you sure you want to delete the membership for <strong>"${name}"</strong>?${warningText}<br><br><span class="text-red-600 font-semibold">This action cannot be undone.</span>`,
      iconClass: "fas fa-exclamation-triangle text-red-600",
      iconBgClass: "bg-red-100",
      buttons: [
        {
          html: 'Cancel',
          class: 'px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors',
          onClick: () => this.hideModal()
        },
        {
          html: '<i class="fas fa-trash-alt mr-2"></i> Delete',
          class: 'px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors',
          onClick: () => this.confirmDelete()
        }
      ]
    });
  }

  /**
   * Handles the actual deletion process by sending a request to the server.
   */
  async confirmDelete() {
    if (!this.membershipId) return;

    // Show a processing state
    this._showModal({
        title: "Processing",
        message: "Deleting the membership, please wait...",
        iconClass: "fas fa-spinner fa-spin text-blue-600",
        iconBgClass: "bg-blue-100",
        buttons: []
    });

    try {
      const response = await fetch(`/memberships/delete/${this.membershipId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      this.showSuccessMessage();
      // Reload the page to reflect the changes after a short delay
      setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
      this.showErrorMessage(error.message);
    }
  }

  /**
   * Displays a success message after a successful deletion.
   */
  showSuccessMessage() {
    this._showModal({
      title: "Deleted Successfully!",
      message: "The membership has been deleted. The page will reload shortly.",
      iconClass: "fas fa-check-circle text-green-600",
      iconBgClass: "bg-green-100",
      buttons: []
    });
  }

  /**
   * Displays an error message if the deletion fails.
   * @param {string} errorMessage - The error message to display.
   */
  showErrorMessage(errorMessage) {
    this._showModal({
      title: "Error",
      message: `An error occurred: ${errorMessage}`,
      iconClass: "fas fa-exclamation-triangle text-red-600",
      iconBgClass: "bg-red-100",
      buttons: [
        {
          html: 'Close',
          class: 'px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50',
          onClick: () => this.hideModal()
        }
      ]
    });
  }
}

// Initialize the modal manager once the DOM is fully loaded.
document.addEventListener("DOMContentLoaded", () => {
  new DeleteModalManager();
});