/**
 * @file Manages the dynamic calculation of the end date on the membership renewal page.
 * @description This class listens for changes on the membership type and start date fields,
 * fetches the calculated end date from the server, and updates the UI accordingly.
 */
class RenewalFormManager {
  /**
   * Initializes the manager by caching DOM elements and binding events.
   */
  constructor() {
    this.dom = {
      membershipTypeSelect: document.getElementById('membershipType'),
      startDateInput: document.getElementById('startDate'),
      endDateInput: document.getElementById('endDate'),
    };

    // Proceed only if all required elements are found.
    if (!this.dom.membershipTypeSelect || !this.dom.startDateInput || !this.dom.endDateInput) {
      console.error("One or more required form elements for renewal calculation were not found.");
      return;
    }

    this.bindEvents();
    this.updateCalculatedEndDate(); // Initial calculation on page load.
  }

  /**
   * Attaches event listeners to the relevant form fields.
   */
  bindEvents() {
    this.dom.membershipTypeSelect.addEventListener('change', this.updateCalculatedEndDate.bind(this));
    this.dom.startDateInput.addEventListener('change', this.updateCalculatedEndDate.bind(this));
  }

  /**
   * Fetches the calculated end date from the server and updates the end date input field.
   */
  async updateCalculatedEndDate() {
    const membershipTypeId = this.dom.membershipTypeSelect.value;
    const startDate = this.dom.startDateInput.value;

    if (!membershipTypeId || !startDate) {
      return; // Exit if essential data is missing.
    }

    try {
      const response = await fetch('/memberships/api/calculate-details', {
        method: 'POST',
        body: JSON.stringify({
          id_tipo_membresia: membershipTypeId,
          fecha_inicio: startDate,
          descuento: 0 // Discount is not relevant for end date calculation here.
        }),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error occurred while calculating the end date.');
      }

      // Update the end date input field with the value from the server.
      this.dom.endDateInput.value = data.fecha_fin;

    } catch (error) {
      console.error('Error calculating membership details:', error);
      // Optional: Display an error message to the user in a dedicated element.
    }
  }
}

// Initialize the manager once the DOM is fully loaded.
document.addEventListener("DOMContentLoaded", () => {
  new RenewalFormManager();
});