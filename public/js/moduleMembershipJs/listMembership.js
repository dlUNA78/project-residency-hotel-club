// Funciones de utilidad
const MembershipUI = {
  init: function () {
    this.bindEvents();
    this.fetchAndRenderMemberships(); // Carga inicial de datos
  },

  bindEvents: function () {
    // Referencias a elementos del DOM
    this.reportButton = document.getElementById("reportButton");
    this.reportModal = document.getElementById("reportModal");
    this.closeReportModal = document.getElementById("closeReportModal");
    this.searchInput = document.getElementById("searchInput");
    this.statusFilter = document.getElementById("statusFilter");
    this.sortBy = document.getElementById("sortBy");
    this.membershipRows = document.querySelectorAll(".membership-row");

    // Modal de reportes para administradores
    if (this.reportButton && this.reportModal && this.closeReportModal) {
      this.reportButton.addEventListener("click", () => {
        this.reportModal.classList.remove("hidden");
      });

      this.closeReportModal.addEventListener("click", () => {
        this.reportModal.classList.add("hidden");
      });

      // Cerrar modal al hacer clic fuera del contenido
      this.reportModal.addEventListener("click", (e) => {
        if (e.target === this.reportModal) {
          this.reportModal.classList.add("hidden");
        }
      });
    }

    // Búsqueda y filtros
    if (this.searchInput) {
      this.searchInput.addEventListener("input", () => {
        this.fetchAndRenderMemberships();
      });
    }

    if (this.statusFilter) {
      this.statusFilter.addEventListener("change", () => {
        this.fetchAndRenderMemberships();
      });
    }

    if (this.sortBy) {
      this.sortBy.addEventListener("change", () => {
        this.fetchAndRenderMemberships();
      });
    }

    // Delegación de eventos para el botón de ver integrantes
    document.addEventListener('click', (e) => {
      const viewMembersBtn = e.target.closest('.view-members-btn');
      if (viewMembersBtn) {
        e.preventDefault();
        e.stopPropagation();
        // Pasar el botón como contexto
        this.handleViewMembersClick({ 
          currentTarget: viewMembersBtn,
          preventDefault: () => e.preventDefault(),
          stopPropagation: () => e.stopPropagation()
        });
      }

      const viewDetailsBtn = e.target.closest('.view-details-btn');
      if (viewDetailsBtn) {
        e.preventDefault();
        e.stopPropagation();
        this.handleViewDetailsClick({
          currentTarget: viewDetailsBtn,
          preventDefault: () => e.preventDefault(),
          stopPropagation: () => e.stopPropagation()
        });
      }
    });
  },

  applyInitialFormatting: function () {
    // Iniciales de los nombres con avatar de gradiente
    const initialElements = document.querySelectorAll("[data-initial]");
    initialElements.forEach((element) => {
      const name = element.getAttribute("data-initial");
      element.textContent = this.getFirstLetter(name);
    });

    // Formatear todas las fechas en la tabla
    const dateFields = document.querySelectorAll(".date-field");
    dateFields.forEach((field) => {
      const dateText = field.textContent.trim();
      if (dateText && !isNaN(new Date(dateText).getTime())) {
        field.textContent = this.formatDate(dateText);
        field.setAttribute("data-original", dateText);
      }
    });
  },

  getFirstLetter: function (name) {
    return name ? name.charAt(0).toUpperCase() : "";
  },

  formatDate: function (dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  },

  
  showIntegrantesModal: function (integrantes) {
    // Verificar si hay integrantes
    if (!integrantes || integrantes.length === 0) {
      this.showMessage(
        "Esta membresía no tiene integrantes registrados",
        "info"
      );
      return;
    }

    const modalHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 integrantes-modal">
            <div class="bg-white rounded-2xl p-6 w-11/12 md:w-96 max-w-90vw">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">
                    <i class="fas fa-users mr-2 text-purple-500"></i>Integrantes de la Membresía
                </h3>
                <div class="max-h-60 overflow-y-auto">
                    <table class="min-w-full">
                        <thead>
                            <tr>
                                <th class="text-left text-sm font-medium text-purple-700 py-2">Nombre</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${integrantes
                              .map(
                                (int) => `
                                <tr>
                                    <td class="py-2">
                                        <div class="flex items-center">
                                            <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                                <span class="text-purple-600 font-bold">${this.getFirstLetter(
                                                  int.nombre_completo
                                                )}</span>
                                            </div>
                                            <span class="text-sm text-gray-700">${
                                              int.nombre_completo ||
                                              "Sin nombre"
                                            }</span>
                                        </div>
                                    </td>
                                </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>
                <div class="mt-4 flex justify-end">
                    <button class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors close-integrantes-modal">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;

    // Remover modal existente si hay uno
    const existingModal = document.querySelector(".integrantes-modal");
    if (existingModal) {
      existingModal.remove();
    }

    // Insertar el modal en el documento
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Cerrar modal al hacer clic en el botón de cerrar
    document
      .querySelector(".close-integrantes-modal")
      .addEventListener("click", function () {
        document.querySelector(".integrantes-modal").remove();
      });

    // Cerrar modal al hacer clic fuera del contenido
    document
      .querySelector(".integrantes-modal")
      .addEventListener("click", function (e) {
        if (e.target === this) {
          this.remove();
        }
      });

    // Cerrar modal con la tecla ESC
    document.addEventListener("keydown", function handleEsc(e) {
      if (e.key === "Escape") {
        const modal = document.querySelector(".integrantes-modal");
        if (modal) {
          modal.remove();
          document.removeEventListener("keydown", handleEsc);
        }
      }
    });
  },

  showDetailsModal: function (details) {
    const modalHtml = `
      <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 details-modal">
        <div class="bg-white rounded-2xl p-8 w-11/12 md:w-1/2 max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-id-card-alt mr-3 text-green-500"></i>Detalles de la Membresía
            </h3>
            <button class="text-gray-500 hover:text-gray-800 transition-colors close-details-modal">
              <i class="fas fa-times text-2xl"></i>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Columna de Información -->
            <div class="space-y-4">
              <div>
                <p class="text-sm font-semibold text-gray-500">Titular</p>
                <p class="text-lg font-medium text-gray-900">${details.nombre_completo}</p>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-500">Tipo de Membresía</p>
                <p class="text-lg font-medium text-gray-900">${details.tipo_membresia}</p>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-500">Periodo</p>
                <p class="text-lg font-medium text-gray-900">
                  ${this.formatDate(details.fecha_inicio)} - ${this.formatDate(details.fecha_fin)}
                </p>
              </div>
              ${details.integrantes && details.integrantes.length > 0 ? `
                <div>
                  <p class="text-sm font-semibold text-gray-500">Integrantes</p>
                  <ul class="list-disc list-inside mt-1 space-y-1">
                    ${details.integrantes.map(int => `<li class="text-gray-700">${int.nombre_completo}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              ${details.pagos && details.pagos.length > 0 ? `
                <div>
                  <p class="text-sm font-semibold text-gray-500">Último Pago</p>
                  <p class="text-lg font-medium text-gray-900">$${details.pagos[0].monto} (${details.pagos[0].metodo_pago})</p>
                </div>
              ` : ''}
            </div>

            <!-- Columna de QR -->
            <div class="flex flex-col items-center justify-center bg-gray-50 p-6 rounded-xl">
              <img src="${details.qr_path}?t=${new Date().getTime()}" alt="Código QR" class="w-48 h-48">
              ${details.isAdmin ? `
                <a href="${details.qr_path}" download="qr-membresia-${details.id_activa}.png" class="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <i class="fas fa-download mr-2"></i>Descargar QR
                </a>
              ` : ''}
            </div>
          </div>

          <div class="mt-8 flex justify-end">
            <button class="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors close-details-modal">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    `;

    const existingModal = document.querySelector(".details-modal");
    if (existingModal) {
      existingModal.remove();
    }

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    document.querySelectorAll(".close-details-modal").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelector(".details-modal").remove();
      });
    });

    document.querySelector(".details-modal").addEventListener("click", function (e) {
      if (e.target === this) {
        this.remove();
      }
    });
  },

  handleViewDetailsClick: function (e) {
    const button = e.currentTarget;
    const id = button.getAttribute("data-id");

    if (!id) {
      console.error("No se encontró el ID de la membresía");
      return;
    }

    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    fetch(`/api/memberships/details/${id}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Error al cargar los detalles');
        }
        return response.json();
      })
      .then(details => {
        this.showDetailsModal(details);
      })
      .catch(error => {
        console.error("Error al obtener detalles de la membresía:", error);
      })
      .finally(() => {
        button.innerHTML = originalHtml;
        button.disabled = false;
      });
  },

  handleViewMembersClick: function (e) {
    const button = e.currentTarget;
    const idActiva = button.getAttribute("data-id-activa");
    console.log("BOTON PRESIONADO")
    console.log("ID ACTIVA ->", idActiva);

    if (!idActiva) {
      console.error("No se encontró el ID de la membresía activa");
      this.showMessage("No se pudo obtener la información de la membresía", "error");
      return;
    }

    // Mostrar indicador de carga
    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    // Hacemos la llamada a la API
    fetch(`/api/memberships/${idActiva}/integrantes`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin' // Asegura que las cookies se envíen con la solicitud
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((integrantes) => {
        console.log("Integrantes recibidos:", integrantes);
        this.showIntegrantesModal(integrantes);
      })
      .catch((error) => {
        console.error("Error al obtener integrantes:", error);
        this.showMessage(`Error al cargar los integrantes: ${error.message}`, "error");
      })
      .finally(() => {
        // Restaurar el botón a su estado original
        button.innerHTML = originalHtml;
        button.disabled = false;
      });
  },

  fetchAndRenderMemberships: async function () {
    const searchTerm = this.searchInput ? this.searchInput.value : "";
    const statusValue = this.statusFilter ? this.statusFilter.value : "all";
    const sortValue = this.sortBy ? this.sortBy.value : "expiry";

    const tableBody = document.getElementById("membershipsTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="8" class="text-center p-8"><i class="fas fa-spinner fa-spin text-2xl text-purple-500"></i></td></tr>';

    const params = new URLSearchParams({
      search: searchTerm,
      status: statusValue,
      sortBy: sortValue.split('_')[0],
      order: sortValue.split('_')[1] || 'asc'
    });

    try {
      const response = await fetch(`/api/memberships?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Error al cargar los datos");
      }

      this.renderTable(result.data);
    } catch (error) {
      console.error("Error fetching memberships:", error);
      tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-8 text-red-500">Error al cargar membresías: ${error.message}</td></tr>`;
    }
  },

  renderTable: function (memberships) {
    const tableBody = document.getElementById("membershipsTableBody");
    tableBody.innerHTML = ""; // Limpiar tabla

    if (memberships.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8" class="text-center p-8">No se encontraron membresías.</td></tr>';
      return;
    }

    memberships.forEach(m => {
        let statusClass = "bg-green-100 text-green-800";
        let statusText = `Activa (${m.daysUntilExpiry} días)`;
        if (m.statusType === "Por_Vencer") {
            statusClass = "bg-yellow-100 text-yellow-800";
            statusText = `Por Vencer (${m.daysUntilExpiry} días)`;
        } else if (m.statusType === "Vencida") {
            statusClass = "bg-red-100 text-red-800";
            statusText = "Vencida";
        }

        const row = `
            <tr class="membership-row hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${m.fullName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${m.type}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 date-field">${this.formatDate(m.startDate)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 date-field">${this.formatDate(m.endDate)}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="status-badge px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$${m.amount}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="view-details-btn text-indigo-600 hover:text-indigo-900" data-id="${m.id}">Ver</button>
                    <a href="/memberships/editMembership/${m.id}" class="text-indigo-600 hover:text-indigo-900 ml-4">Editar</a>
                    <button class="delete-btn text-red-600 hover:text-red-900 ml-4" data-id="${m.id}" data-name="${m.fullName}" data-type="${m.type}">Eliminar</button>
                    ${m.isFamily ? `<button class="view-members-btn text-purple-600 hover:text-purple-900 ml-4" data-id-activa="${m.id_activa}">Integrantes</button>` : ''}
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
  },
};

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function () {
  MembershipUI.init();
});
