const CreateMembershipUI = {
  init: function () {
    this.cacheDOM();
    this.bindEvents();
    this.setMinDate();
    this.triggerInitialEvents();
  },

  cacheDOM: function () {
    this.clientForm = document.getElementById("client-form");
    this.membershipForm = document.getElementById("membership-form");
    this.clientMessage = document.getElementById("client-message");
    this.membershipMessage = document.getElementById("membership-message");
    this.clientIdInput = document.getElementById("clientId");
    this.submitMembershipBtn = document.getElementById("submit-membership-btn");
    this.membershipTypeSelect = document.getElementById("membershipType");
    this.familyMembersSection = document.getElementById("family-members-section");
    this.familyMembersContainer = document.getElementById("family-members-container");
    this.addFamilyMemberBtn = document.getElementById("add-family-member-btn");
    this.finalPriceDisplay = document.getElementById("final-price-display");
    this.finalPriceInput = document.getElementById("finalPrice");
    this.startDateInput = document.getElementById("startDate");
    this.endDateInput = document.getElementById("endDate");
    this.discountInput = document.getElementById("discount");
    this.applyDiscountBtn = document.getElementById("apply-discount-btn");
    this.clientModal = document.getElementById("client-modal");
    this.clientModalContent = document.getElementById("client-modal-content");
    this.cancelClientBtn = document.getElementById("cancel-client-btn");
    this.confirmClientBtn = document.getElementById("confirm-client-btn");
    this.membershipModal = document.getElementById("membership-modal");
    this.membershipModalContent = document.getElementById("membership-modal-content");
    this.cancelMembershipBtn = document.getElementById("cancel-membership-btn");
    this.confirmMembershipBtn = document.getElementById("confirm-membership-btn");
  },

  bindEvents: function () {
    this.maxMembers = 1;
    this.isClientRegistered = false;
    this.membershipDurationDays = 30;
    this.basePrice = 0;
    this.appliedDiscount = 0;
    this.isClientProcessing = false;
    this.isMembershipProcessing = false;

    this.clientForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (this.isClientProcessing) return;
      this.showClientModal();
    });

    this.confirmClientBtn?.addEventListener("click", () => {
      if (this.isClientProcessing) return;
      this.confirmClientCreation();
    });

    this.cancelClientBtn?.addEventListener("click", () => {
      this.clientModal.classList.add("hidden");
    });

    this.membershipForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (this.isMembershipProcessing || !this.isClientRegistered) return;
      this.showMembershipModal();
    });

    this.confirmMembershipBtn?.addEventListener("click", () => {
      if (this.isMembershipProcessing) return;
      this.confirmMembershipCreation();
    });

    this.cancelMembershipBtn?.addEventListener("click", () => {
      this.membershipModal.classList.add("hidden");
    });

    this.membershipTypeSelect?.addEventListener("change", this.handleMembershipTypeChange.bind(this));
    this.startDateInput?.addEventListener("change", this.calculateEndDate.bind(this));
    this.addFamilyMemberBtn?.addEventListener("click", this.addFamilyMember.bind(this));
    this.applyDiscountBtn?.addEventListener("click", this.applyDiscount.bind(this));
  },

  setMinDate: function () {
    if (!this.startDateInput) return;
    this.startDateInput.min = new Date().toISOString().split("T")[0];
  },

  triggerInitialEvents: function () {
    this.membershipTypeSelect?.dispatchEvent(new Event("change"));
  },

  showClientModal: function () {
    const formData = new FormData(this.clientForm);
    this.clientModalContent.innerHTML = `
      <p><strong>Nombre:</strong> ${formData.get("fullName")}</p>
      <p><strong>Teléfono:</strong> ${formData.get("phone") || "N/A"}</p>
      <p><strong>Correo:</strong> ${formData.get("email")}</p>`;
    this.clientModal.classList.remove("hidden");
  },

  confirmClientCreation: async function () {
    this.isClientProcessing = true;
    this.clientModal.classList.add("hidden");
    const submitBtn = this.clientForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = "Procesando...";

    try {
      const formData = new FormData(this.clientForm);
      const response = await fetch("/memberships/createClient", { // Using original route for now
        method: "POST",
        body: new URLSearchParams(formData),
        headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || "Unknown error");

      this.clientIdInput.value = responseData.clientId;
      this.isClientRegistered = true;
      this.submitMembershipBtn.disabled = false;
      this.submitMembershipBtn.classList.replace("bg-gray-400", "bg-green-600");
      this.submitMembershipBtn.textContent = "Crear Membresía";
      this.showMessage(this.clientMessage, "Cliente registrado con éxito.", "success");
      this.membershipForm.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      this.showMessage(this.clientMessage, `Error: ${err.message}`, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      this.isClientProcessing = false;
    }
  },

  showMembershipModal: function () {
    const formData = new FormData(this.membershipForm);
    const typeSelect = this.membershipTypeSelect;
    const paymentSelect = document.getElementById("paymentMethodId");

    let membersHtml = "";
    const members = document.querySelectorAll('input[name="familyMembers[]"]');
    if (members.length > 0) {
      membersHtml = '<p><strong>Integrantes:</strong></p><ul class="list-disc pl-5 mt-1">';
      members.forEach(member => { membersHtml += `<li>${member.value}</li>`; });
      membersHtml += "</ul>";
    }

    this.membershipModalContent.innerHTML = `
      <p><strong>Tipo:</strong> ${typeSelect.options[typeSelect.selectedIndex].text}</p>
      <p><strong>Inicio:</strong> ${formData.get("startDate")}</p>
      <p><strong>Fin:</strong> ${this.endDateInput.value}</p>
      <p><strong>Pago:</strong> ${paymentSelect.options[paymentSelect.selectedIndex].text}</p>
      <p><strong>Precio Final:</strong> ${this.finalPriceDisplay.value}</p>
      ${membersHtml}`;
    this.membershipModal.classList.remove("hidden");
  },

  confirmMembershipCreation: async function () {
    this.isMembershipProcessing = true;
    this.membershipModal.classList.add("hidden");
    const submitBtn = this.submitMembershipBtn;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = "Procesando...";

    try {
      const formData = new FormData(this.membershipForm);
      const response = await fetch("/memberships/createMembership", { // Using original route for now
        method: "POST",
        body: new URLSearchParams(formData),
        headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || "Unknown error");

      if (responseData.success) {
        this.showSuccessModal(responseData.data);
        this.membershipForm.classList.add("opacity-50");
        this.membershipForm.querySelectorAll("input, select, button").forEach(el => el.disabled = true);
      } else {
        throw new Error(responseData.message || "Unknown error");
      }
    } catch (err) {
      this.showMessage(this.membershipMessage, `Error: ${err.message}`, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      this.isMembershipProcessing = false;
    }
  },

  showSuccessModal: function (data) {
    let membersHtml = "";
    if (data.familyMembers && data.familyMembers.length > 0) {
      membersHtml = `<div class="mt-4"><h4 class="font-medium text-green-700 mb-2">Integrantes:</h4>
          <ul class="list-disc pl-5">${data.familyMembers.map(i => `<li>${i.fullName}</li>`).join("")}</ul></div>`;
    }
    const modalHTML = `<div id="successModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-bold text-green-800 mb-4 text-center">¡Membresía Creada Exitosamente!</h3>
          <p><strong>Titular:</strong> ${data.holder}</p>
          <p><strong>Tipo:</strong> ${data.membershipType}</p>
          <p><strong>Total:</strong> $${data.finalPrice.toFixed(2)}</p>
          ${membersHtml}
          <div class="text-center p-4"><img src="${data.qrPath}?t=${Date.now()}" alt="QR" class="w-48 h-48 mx-auto border rounded">
            <a href="/memberships/download-qr/${data.activeMembershipId}" class="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded">Descargar QR</a>
          </div>
          <div class="flex justify-center"><button onclick="window.location.reload()" class="px-6 py-2 border rounded">Cerrar</button></div>
        </div></div>`;
    document.body.insertAdjacentHTML("beforeend", modalHTML);
  },

  handleMembershipTypeChange: function (e) {
    const option = e.target.options[e.target.selectedIndex];
    this.maxMembers = parseInt(option.dataset.max, 10);
    this.basePrice = parseFloat(option.dataset.precio);
    this.updateFinalPrice();
    this.calculateEndDate();
    this.familyMembersSection.classList.toggle("hidden", this.maxMembers <= 1);
    if (this.maxMembers > 1 && this.familyMembersContainer.children.length === 0) {
      this.addFamilyMember();
    } else if (this.maxMembers <= 1) {
      this.familyMembersContainer.innerHTML = "";
    }
  },

  calculateEndDate: function () {
    if (!this.startDateInput.value) return;
    const startDate = new Date(this.startDateInput.value);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + this.membershipDurationDays);
    this.endDateInput.value = endDate.toISOString().split("T")[0];
  },

  addFamilyMember: function () {
    if (this.familyMembersContainer.querySelectorAll(".integrante").length >= this.maxMembers - 1) return;
    const memberDiv = document.createElement("div");
    memberDiv.className = "integrante flex items-center space-x-2 mb-2";
    memberDiv.innerHTML = `<input type="text" name="familyMembers[]" placeholder="Nombre completo" required class="flex-1 px-3 py-2 border rounded">
      <button type="button" class="removeBtn px-3 py-2 border rounded text-red-700 bg-red-100 hover:bg-red-200">Eliminar</button>`;
    this.familyMembersContainer.appendChild(memberDiv);
    memberDiv.querySelector(".removeBtn").addEventListener("click", () => memberDiv.remove());
  },

  applyDiscount: function () {
    this.updateFinalPrice();
  },

  updateFinalPrice: function () {
    const discount = parseInt(this.discountInput?.value || 0, 10);
    if (this.basePrice) {
      const finalPrice = this.basePrice - this.basePrice * (discount / 100);
      this.finalPriceDisplay.value = `$${finalPrice.toFixed(2)}`;
      this.finalPriceInput.value = finalPrice.toFixed(2);
    }
  },

  showMessage: function (element, text, type) {
    element.textContent = text;
    element.className = `text-sm font-medium ${type === 'success' ? 'text-green-600' : 'text-red-600'}`;
    setTimeout(() => { element.className += ' hidden'; }, 5000);
  },
};

document.addEventListener("DOMContentLoaded", () => CreateMembershipUI.init());
