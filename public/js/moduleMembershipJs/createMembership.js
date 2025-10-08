/**
 * @file Manages the UI and logic for the membership creation page.
 * @description This object handles form validation, modal interactions, API calls,
 * and dynamic UI updates for creating a new client and their associated membership.
 */
const membershipFormManager = {
  // Caches DOM elements for performance and easier access.
  dom: {},
  // Holds the dynamic state of the form.
  state: {
    isClientRegistered: false,
    isProcessingClient: false,
    isProcessingMembership: false,
    maxMembers: 1,
  },
  // Holds validator instances
  validators: {},

  /**
   * Initializes the module by caching DOM elements and binding events.
   */
  init: function () {
    this.cacheDOM();
    this.initializeValidators();
    this.bindEvents();
    this.setMinimumDate();
    this.triggerInitialEvents();

    // Ensure calculated fields are not user-editable.
    if (this.dom.finalPriceInput) this.dom.finalPriceInput.readOnly = true;
    if (this.dom.endDateInput) this.dom.endDateInput.readOnly = true;
  },

  /**
   * Gathers and stores references to all necessary DOM elements.
   */
  cacheDOM: function () {
    this.dom.clientForm = document.getElementById("client-form");
    this.dom.membershipForm = document.getElementById("membership-form");
    this.dom.clientMessage = document.getElementById("client-message");
    this.dom.membershipMessage = document.getElementById("membership-message");
    this.dom.clientIdInput = document.getElementById("clientId");
    this.dom.submitMembershipButton = document.getElementById("submit-membership-button");
    this.dom.membershipTypeSelect = document.getElementById("membershipType");
    this.dom.membersSection = document.getElementById("members-section");
    this.dom.membersContainer = document.getElementById("members-container");
    this.dom.addMemberButton = document.getElementById("add-member-button");
    this.dom.finalPriceInput = document.getElementById("finalPrice");
    this.dom.finalPriceHiddenInput = document.getElementById("finalPriceHidden");
    this.dom.startDateInput = document.getElementById("startDate");
    this.dom.endDateInput = document.getElementById("endDate");
    this.dom.discountInput = document.getElementById("discount");
    this.dom.applyDiscountButton = document.getElementById("apply-discount-button");
    this.dom.clientModal = document.getElementById("client-modal");
    this.dom.clientModalContent = document.getElementById("client-modal-content");
    this.dom.cancelClientButton = document.getElementById("cancel-client-button");
    this.dom.confirmClientButton = document.getElementById("confirm-client-button");
    this.dom.membershipModal = document.getElementById("membership-modal");
    this.dom.membershipModalContent = document.getElementById("membership-modal-content");
    this.dom.cancelMembershipButton = document.getElementById("cancel-membership-button");
    this.dom.confirmMembershipButton = document.getElementById("confirm-membership-button");
  },

  /**
   * Creates instances of FormValidator for each form.
   */
  initializeValidators: function() {
    if (this.dom.clientForm) {
      this.validators.clientForm = new FormValidator(this.dom.clientForm);
    }
    if (this.dom.membershipForm) {
      this.validators.membershipForm = new FormValidator(this.dom.membershipForm);
    }
  },

  /**
   * Attaches event listeners to the cached DOM elements.
   */
  bindEvents: function () {
    if (this.dom.clientForm) {
      this.dom.clientForm.addEventListener("submit", this.handleClientFormSubmit.bind(this));
    }
    if (this.dom.confirmClientButton) {
      this.dom.confirmClientButton.addEventListener("click", this.handleConfirmClientClick.bind(this));
    }
    if (this.dom.cancelClientButton) {
      this.dom.cancelClientButton.addEventListener("click", () => this.dom.clientModal.classList.add("hidden"));
    }
    if (this.dom.membershipForm) {
      this.dom.membershipForm.addEventListener("submit", this.handleMembershipFormSubmit.bind(this));
    }
    if (this.dom.confirmMembershipButton) {
      this.dom.confirmMembershipButton.addEventListener("click", this.handleConfirmMembershipClick.bind(this));
    }
    if (this.dom.cancelMembershipButton) {
      this.dom.cancelMembershipButton.addEventListener("click", () => this.dom.membershipModal.classList.add("hidden"));
    }
    if (this.dom.membershipTypeSelect) {
      this.dom.membershipTypeSelect.addEventListener("change", this.handleMembershipTypeChange.bind(this));
    }
    if (this.dom.startDateInput) {
      this.dom.startDateInput.addEventListener("change", this.updateCalculatedDetails.bind(this));
    }
    if (this.dom.addMemberButton) {
      this.dom.addMemberButton.addEventListener("click", this.addMember.bind(this));
    }
    if (this.dom.applyDiscountButton) {
      this.dom.applyDiscountButton.addEventListener("click", this.handleApplyDiscount.bind(this));
    }
  },

  /**
   * Event handler for client form submission.
   * @param {Event} e - The submit event object.
   */
  handleClientFormSubmit: function (e) {
    e.preventDefault();
    if (this.state.isProcessingClient) return;
    if (this.validators.clientForm.validate()) {
      this.showClientModal();
    }
  },

  /**
   * Event handler for the confirm client button.
   */
  handleConfirmClientClick: function () {
    if (this.state.isProcessingClient) return;
    this.confirmClientCreation();
  },

  /**
   * Event handler for membership form submission.
   * @param {Event} e - The submit event object.
   */
  handleMembershipFormSubmit: function (e) {
    e.preventDefault();
    if (this.state.isProcessingMembership) return;
    if (this.validators.membershipForm.validate()) {
      if (!this.state.isClientRegistered) {
        this.showMessage(this.dom.membershipMessage, "You must register a client first.", "error");
        return;
      }
      this.showMembershipModal();
    }
  },

  /**
   * Event handler for the confirm membership button.
   */
  handleConfirmMembershipClick: function () {
    if (this.state.isProcessingMembership) return;
    this.confirmMembershipCreation();
  },

  /**
   * Event handler for applying a discount.
   */
  handleApplyDiscount: function () {
    const discount = parseInt(this.dom.discountInput.value, 10) || 0;
    if (discount < 0 || discount > 100) {
      this.showMessage(this.dom.membershipMessage, "Discount must be between 0 and 100%.", "error");
      return;
    }
    this.updateCalculatedDetails();
  },

  /**
   * Event handler for when the membership type is changed.
   * @param {Event} e - The change event object.
   */
  handleMembershipTypeChange: function (e) {
    const selectedOption = e.target.options[e.target.selectedIndex];
    this.state.maxMembers = parseInt(selectedOption.dataset.max, 10) || 1;
    this.updateCalculatedDetails();

    if (this.state.maxMembers > 1) {
      this.dom.membersSection.classList.remove("hidden");
      // Add the first member input if it's not there
      if (this.dom.membersContainer.children.length === 0) {
        this.addMember();
      }
    } else {
      this.dom.membersSection.classList.add("hidden");
      this.dom.membersContainer.innerHTML = ""; // Clear existing members
    }
  },

  /**
   * Sets the minimum selectable date for the start date input to today.
   */
  setMinimumDate: function () {
    if (!this.dom.startDateInput) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    this.dom.startDateInput.min = `${yyyy}-${mm}-${dd}`;
  },

  /**
   * Triggers initial events to set the form's default state.
   */
  triggerInitialEvents: function () {
    if (this.dom.membershipTypeSelect) {
      // Ensures the form is correctly configured on page load.
      this.dom.membershipTypeSelect.dispatchEvent(new Event("change"));
    }
  },

  /**
   * Displays a confirmation modal with the client's data.
   */
  showClientModal: function () {
    const formData = new FormData(this.dom.clientForm);
    const fullName = formData.get("nombre_completo");
    const phone = formData.get("telefono") || "Not provided";
    const email = formData.get("correo");
    this.dom.clientModalContent.innerHTML = `<p><strong>Name:</strong> ${fullName}</p><p><strong>Phone:</strong> ${phone}</p><p><strong>Email:</strong> ${email}</p>`;
    this.dom.clientModal.classList.remove("hidden");
  },

  /**
   * Submits client data to the server and handles the response.
   */
  confirmClientCreation: async function () {
    this.state.isProcessingClient = true;
    this.dom.clientModal.classList.add("hidden");
    if (this.dom.confirmClientButton) this.dom.confirmClientButton.disabled = true;
    const submitButton = this.dom.clientForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;

    try {
      submitButton.disabled = true;
      submitButton.innerHTML = "Processing...";
      const formData = new FormData(this.dom.clientForm);
      const response = await fetch(this.dom.clientForm.action, {
        method: "POST",
        body: new URLSearchParams(formData),
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      });

      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || responseData.message || "Unknown server error");

      if (responseData.id_cliente) {
        this.dom.clientIdInput.value = responseData.id_cliente;
        this.state.isClientRegistered = true;
        this.dom.submitMembershipButton.disabled = false;
        this.dom.submitMembershipButton.classList.replace("bg-gray-400", "bg-green-600");
        this.dom.submitMembershipButton.classList.replace("hover:bg-gray-400", "hover:bg-green-700");
        this.dom.submitMembershipButton.classList.replace("focus:ring-gray-400", "focus:ring-green-500");
        this.dom.submitMembershipButton.textContent = "Create Membership";
        this.showMessage(this.dom.clientMessage, "Client registered successfully. You can now create the membership.", "success");
        if (this.dom.membershipForm) this.dom.membershipForm.scrollIntoView({ behavior: "smooth" });
      } else {
        throw new Error("A valid client ID was not received.");
      }
    } catch (err) {
      this.showMessage(this.dom.clientMessage, `Error: ${err.message}`, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
      this.state.isProcessingClient = false;
      if (this.dom.confirmClientButton) this.dom.confirmClientButton.disabled = false;
    }
  },

  /**
   * Displays a confirmation modal with the membership's data.
   */
  showMembershipModal: function () {
    const formData = new FormData(this.dom.membershipForm);
    const membershipType = this.dom.membershipTypeSelect.options[this.dom.membershipTypeSelect.selectedIndex].text;
    const startDate = formData.get("fecha_inicio");
    const endDate = this.dom.endDateInput.value;
    const paymentMethodEl = document.getElementById("paymentMethod");
    const paymentMethod = paymentMethodEl.options[paymentMethodEl.selectedIndex].text;
    const finalPrice = this.dom.finalPriceInput.value;
    const discount = this.dom.discountInput ? parseInt(this.dom.discountInput.value, 10) || 0 : 0;

    let membersHTML = "";
    const members = document.querySelectorAll('input[name="members[]"]');
    if (members.length > 0) {
      membersHTML = '<p><strong>Members:</strong></p><ul class="list-disc pl-5 mt-1">';
      members.forEach((member) => { membersHTML += `<li>${member.value}</li>`; });
      membersHTML += "</ul>";
    }

    this.dom.membershipModalContent.innerHTML = `
      <p><strong>Membership Type:</strong> ${membershipType}</p>
      <p><strong>Start Date:</strong> ${startDate}</p>
      <p><strong>End Date:</strong> ${endDate}</p>
      <p><strong>Payment Method:</strong> ${paymentMethod}</p>
      <p><strong>Final Price:</strong> ${finalPrice}</p>
      ${membersHTML}
      ${discount > 0 ? `<p><strong>Discount Applied:</strong> ${discount}%</p>` : ""}`;

    this.dom.membershipModal.classList.remove("hidden");
  },

  /**
   * Submits membership data to the server and handles the response.
   */
  confirmMembershipCreation: async function () {
    this.state.isProcessingMembership = true;
    this.dom.membershipModal.classList.add("hidden");
    if (this.dom.confirmMembershipButton) this.dom.confirmMembershipButton.disabled = true;
    const submitButton = this.dom.membershipForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;

    try {
      submitButton.disabled = true;
      submitButton.innerHTML = "Processing...";
      const formData = new FormData(this.dom.membershipForm);
      const response = await fetch(this.dom.membershipForm.action, {
        method: "POST",
        body: new URLSearchParams(formData),
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || "HTTP Error " + response.status);

      if (responseData.success) {
        this.showSuccessModal(responseData.data);
        this.dom.membershipForm.classList.add("opacity-50");
        this.dom.membershipForm.querySelectorAll("input, select, button").forEach((el) => { el.disabled = true; });
      } else {
        throw new Error(responseData.message || "Unknown error occurred.");
      }
    } catch (err) {
      this.showMessage(this.dom.membershipMessage, "Error creating membership: " + err.message, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
      this.state.isProcessingMembership = false;
      if (this.dom.confirmMembershipButton) this.dom.confirmMembershipButton.disabled = false;
    }
  },

  /**
   * Displays a success modal with the created membership details and QR code.
   * @param {object} data - The membership data from the server.
   */
  showSuccessModal: function (data) {
    const template = document.getElementById('success-modal-template');
    if (!template) return;

    const modalClone = template.content.cloneNode(true);
    const infoContainer = modalClone.querySelector('[data-template-content="info"]');
    infoContainer.innerHTML = `
      <p><strong>Holder:</strong> ${data.titular}</p>
      <p><strong>Membership Type:</strong> ${data.tipo_membresia}</p>
      <p><strong>Start Date:</strong> ${data.fecha_inicio}</p>
      <p><strong>Expiration Date:</strong> ${data.fecha_fin}</p>
      <p><strong>Payment Method:</strong> ${data.metodo_pago}</p>
      <p><strong>Total Paid:</strong> $${data.precio_final.toFixed(2)}</p>
      <p><strong>Total in Words:</strong> ${data.precioEnLetras}</p>`;

    const membersContainer = modalClone.querySelector('[data-template-content="integrantes"]');
    if (data.integrantes && data.integrantes.length > 0) {
      membersContainer.innerHTML = `<h4 class="font-medium text-green-700 mb-2">Members:</h4><ul class="list-disc pl-5">${data.integrantes.map((i) => `<li>${i.nombre_completo}</li>`).join("")}</ul>`;
    }

    const qrImage = modalClone.getElementById('qrImage');
    qrImage.src = `${data.qr_path}?t=${new Date().getTime()}`; // bust cache
    qrImage.alt = `Membership QR for ${data.titular}`;

    const downloadContainer = modalClone.querySelector('[data-template-content="qr-download"]');
    const downloadButton = document.createElement('button');
    downloadButton.className = "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500";
    downloadButton.innerHTML = `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>Download QR`;
    downloadButton.onclick = () => this.downloadQRCode(data.id_activa);
    downloadContainer.appendChild(downloadButton);

    const modalElement = modalClone.firstElementChild;
    document.body.appendChild(modalElement);

    modalElement.querySelector('[data-action="close"]').addEventListener('click', () => {
      modalElement.remove();
      this.resetForms();
    });
    modalElement.querySelector('[data-action="view-list"]').addEventListener('click', () => {
      window.location.href = '/memberships/listMembership';
    });
  },

  /**
   * Triggers a download of the membership's QR code.
   * @param {number|string} membershipId - The ID of the active membership.
   */
  downloadQRCode: function (membershipId) {
    const link = document.createElement("a");
    link.href = `/memberships/download-qr/${membershipId}`;
    link.download = `membership_${membershipId}_qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Resets both client and membership forms to their initial state.
   */
  resetForms: function () {
    if (this.dom.clientForm) this.dom.clientForm.reset();
    if (this.dom.membershipForm) {
      this.dom.membershipForm.reset();
      this.dom.membersContainer.innerHTML = "";
      this.dom.membersSection.classList.add("hidden");
    }
    this.state.isClientRegistered = false;
    this.dom.submitMembershipButton.disabled = true;
    this.dom.submitMembershipButton.classList.replace("bg-green-600", "bg-gray-400");
    this.dom.submitMembershipButton.classList.replace("hover:bg-green-700", "hover:bg-gray-400");
    this.dom.submitMembershipButton.classList.replace("focus:ring-green-500", "focus:ring-gray-400");
    this.dom.submitMembershipButton.textContent = "Create Membership (complete client first)";
  },

  /**
   * Fetches calculated membership details (end date, price) from the server.
   */
  updateCalculatedDetails: async function () {
    const membershipTypeId = this.dom.membershipTypeSelect.value;
    const startDate = this.dom.startDateInput.value;
    const discount = this.dom.discountInput ? parseInt(this.dom.discountInput.value, 10) || 0 : 0;

    if (!membershipTypeId || !startDate) return;

    try {
      this.showMessage(this.dom.membershipMessage, "Calculating...", "info");
      const response = await fetch("/memberships/api/calculate-details", {
        method: "POST",
        body: JSON.stringify({ id_tipo_membresia: membershipTypeId, fecha_inicio: startDate, descuento }),
        headers: { "Content-Type": "application/json", Accept: "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Server error");

      this.dom.finalPriceInput.value = data.precio_final;
      this.dom.finalPriceHiddenInput.value = data.precio_final;
      this.dom.endDateInput.value = data.fecha_fin;
      this.dom.membershipMessage.classList.add("hidden");
    } catch (err) {
      this.showMessage(this.dom.membershipMessage, `Error: ${err.message}`, "error");
    }
  },

  /**
   * Dynamically adds a new input field for a family member.
   */
  addMember: function () {
    const currentMemberCount = this.dom.membersContainer.querySelectorAll(".member").length;
    if (currentMemberCount < this.state.maxMembers - 1) {
      const memberDiv = document.createElement("div");
      memberDiv.className = "member flex items-center space-x-2 mb-2";
      memberDiv.innerHTML = `
        <input type="text" name="members[]" placeholder="Full name of the member" required class="flex-1 px-3 py-2 border border-green-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500">
        <button type="button" class="remove-button px-3 py-2 border border-transparent rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">❌ Remove</button>
      `;
      this.dom.membersContainer.appendChild(memberDiv);

      memberDiv.querySelector(".remove-button").addEventListener("click", () => {
        memberDiv.remove();
        const remaining = this.state.maxMembers - 1 - this.dom.membersContainer.querySelectorAll(".member").length;
        if (remaining > 0) {
          this.showMessage(this.dom.membershipMessage, `You can add up to ${remaining} more members.`, "success");
        }
      });
    } else {
      this.showMessage(this.dom.membershipMessage, `Maximum of ${this.state.maxMembers - 1} additional members allowed.`, "error");
    }
  },

  /**
   * Displays a temporary message to the user.
   * @param {HTMLElement} element - The element where the message is shown.
   * @param {string} text - The message content.
   * @param {'success'|'error'|'info'} type - The type of message.
   */
  showMessage: function (element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.className = 'text-sm font-medium'; // Reset classes

    switch (type) {
        case "success":
            element.classList.add("text-green-600");
            break;
        case "error":
            element.classList.add("text-red-600");
            break;
        default: // info
            element.classList.add("text-blue-600");
            break;
    }
    element.classList.remove("hidden");

    setTimeout(() => {
      element.classList.add("hidden");
    }, 5000);
  },
};

document.addEventListener("DOMContentLoaded", function () {
  membershipFormManager.init();
});