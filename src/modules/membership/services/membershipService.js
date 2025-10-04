// services/membershipService.js
import { MembershipModel } from "../models/modelMembership.js";
import { modelList } from "../models/modelList.js";
import { deleteMembershipById } from "../models/modelDelete.js";
import { updateMembershipById } from "../models/modelEdit.js";
import { generarQRArchivo } from "../utils/qrGenerator.js";
import { sendMembershipReceiptEmail as sendReceiptEmail } from "../../../services/emailService.js";
import QRCode from "qrcode";
import path from "path";
import { promises as fs } from "fs";
import puppeteer from "puppeteer";
import hbs from "handlebars";

const _validateReportParams = (period, date) => {
  if (!period || !date) {
    return "El período y la fecha son obligatorios.";
  }

  const validPeriods = ["monthly", "biweekly", "weekly"];
  if (!validPeriods.includes(period)) {
    return "El período especificado no es válido.";
  }

  let dateRegex;
  switch (period) {
    case "monthly":
      dateRegex = /^\d{4}-\d{2}$/; // YYYY-MM
      break;
    case "biweekly":
      dateRegex = /^\d{4}-\d{2}-(first|second)$/; // YYYY-MM-first/second
      break;
    case "weekly":
      dateRegex = /^\d{4}W\d{2}$/; // YYYYWww
      break;
  }

  if (!dateRegex.test(date)) {
    return `El formato de fecha para el período '${period}' no es válido.`;
  }

  return null; // No hay errores
};

const _getReportDateRange = (period, date) => {
  const year = parseInt(date.substring(0, 4));
  let startDate, endDate;

  switch (period) {
    case "monthly": {
      const month = parseInt(date.substring(5, 7)) - 1;
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0);
      break;
    }
    case "biweekly": {
      const month = parseInt(date.substring(5, 7)) - 1;
      const fortnight = date.endsWith("first") ? 1 : 16;
      if (fortnight === 1) {
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month, 15);
      } else {
        startDate = new Date(year, month, 16);
        endDate = new Date(year, month + 1, 0);
      }
      break;
    }
    case "weekly": {
      const week = parseInt(date.substring(5));
      const firstDay = new Date(year, 0, 1 + (week - 1) * 7);
      const dayOfWeek = firstDay.getDay();
      const adjustment = dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek; // Adjust to start of the week (Monday)
      startDate = new Date(year, 0, firstDay.getDate() + adjustment);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6);
      break;
    }
    default:
      throw new Error("Invalid period specified");
  }

  return { startDate, endDate };
};

export const MembershipService = {
  async createMembershipContract(membershipData) {
    const { id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin } =
      membershipData;
    return await MembershipModel.createMembershipContract({
      id_cliente,
      id_tipo_membresia,
      fecha_inicio,
      fecha_fin,
    });
  },

  async generateQRCode(qrData, membershipId, titularNombre) {
    try {
      // Validar que los datos no estén vacíos
      if (!qrData || qrData.trim() === '') {
        throw new Error('Datos QR vacíos o inválidos');
      }
  
      // Guardar en public/uploads/qrs/
      const qrDir = path.join(process.cwd(), 'public', 'uploads', 'qrs');
      if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true });
      }
  
      // Limpiar nombre para el archivo
      const cleanName = titularNombre.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      const qrFilename = `qr_${membershipId}_${cleanName}.png`;
      const qrFullPath = path.join(qrDir, qrFilename);
      
      // Ruta relativa para acceso web (desde public/)
      const qrWebPath = `/uploads/qrs/${qrFilename}`;
  
      console.log('📊 Generando QR con datos:', qrData.substring(0, 100) + '...');
  
      // Generar QR con configuración robusta
      await QRCode.toFile(qrFullPath, qrData, {
        errorCorrectionLevel: 'H', // Mayor corrección de errores
        type: 'png',
        margin: 2,
        width: 300,
        color: {
          dark: '#16a34a',
          light: '#FFFFFF'
        }
      });
  
      console.log(`✅ QR generado: ${qrFullPath}`);
      console.log(`✅ Ruta web: ${qrWebPath}`);
      
      return qrWebPath;
  
    } catch (error) {
      console.error('❌ Error generando QR:', error);
      
      // Intentar con datos mínimos como fallback
      try {
        console.log('🔄 Intentando con datos mínimos de respaldo...');
        
        const fallbackData = JSON.stringify({
          id: membershipId,
          t: 'Membresía',
          d: new Date().toISOString().split('T')[0]
        });
        
        const qrDir = path.join(process.cwd(), 'public', 'uploads', 'qrs');
        const cleanName = titularNombre.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        const qrFilename = `qr_${membershipId}_${cleanName}_fallback.png`;
        const qrFullPath = path.join(qrDir, qrFilename);
        const qrWebPath = `/uploads/qrs/${qrFilename}`;
        
        await QRCode.toFile(qrFullPath, fallbackData, {
          errorCorrectionLevel: 'H',
          type: 'png',
          margin: 2,
          width: 300,
          color: {
            dark: '#16a34a',
            light: '#FFFFFF'
          }
        });
        
        console.log(`✅ QR de respaldo generado: ${qrWebPath}`);
        return qrWebPath;
        
      } catch (fallbackError) {
        console.error('❌ Error incluso con datos de respaldo:', fallbackError);
        throw new Error(`Error al generar QR: ${error.message}`);
      }
    }
  },

  async activateMembership(activationData) {
    const { id_cliente, id_membresia, fecha_inicio, fecha_fin, precio_final } =
      activationData;
    return await MembershipModel.activateMembership({
      id_cliente,
      id_membresia,
      fecha_inicio,
      fecha_fin,
      precio_final,
    });
  },

  async addFamilyMembers(id_activa, integrantes) {
    if (integrantes && integrantes.length > 0) {
      const integrantesData = integrantes.map((item) =>
        typeof item === "string"
          ? { nombre_completo: item, id_relacion: null }
          : {
              nombre_completo: item.nombre_completo || item.nombre || "",
              id_relacion: item.id_relacion || null,
            }
      );
      await MembershipModel.addFamilyMembers(id_activa, integrantesData);
    }
  },

  async getMembershipDetails(id_cliente, id_tipo_membresia, id_activa) {
    const [cliente, tipo, integrantesDB] = await Promise.all([
      MembershipModel.getClienteById(id_cliente),
      MembershipModel.getTipoMembresiaById(id_tipo_membresia),
      MembershipModel.getIntegrantesByActiva(id_activa),
    ]);

    return { cliente, tipo, integrantesDB };
  },

  async generateQRPayload(id_activa) {
    // The most robust QR payload is a simple, unique identifier.
    // All other details can be fetched from the server upon scanning.
    // This prevents the QR code from growing too large and failing.
    const qrData = {
      id_activa: id_activa,
    };
    return JSON.stringify(qrData);
  },
  // Nuevo método para enviar comprobante por email (sin QR)
  async sendMembershipReceiptEmail(
    cliente,
    tipo,
    fecha_inicio,
    fecha_fin,
    integrantesDB,
    metodo_pago,
    precio_final
  ) {
    if (cliente?.correo) {
      // Llama al servicio global. El alias de importación es sendReceiptEmail.
      await sendReceiptEmail(cliente.correo, {
        titularNombre: cliente.nombre_completo,
        tipoMembresia: tipo?.nombre || "N/D",
        fechaInicio: fecha_inicio,
        fechaFin: fecha_fin,
        metodoPago: metodo_pago || "No especificado",
        precioFinal: precio_final,
        integrantes: integrantesDB,
      });
    }
  },

  async createCompleteMembership(membershipData) {
    const {
      id_cliente,
      id_tipo_membresia,
      fecha_inicio,
      integrantes,
      metodo_pago,
      descuento,
    } = membershipData;

    // --- REFUERZO DE SEGURIDAD ---
    // Se ignoran el precio y fecha_fin enviados por el cliente y se recalculan en el servidor.
    const {
      precio_final: authoritative_price,
      fecha_fin: authoritative_end_date,
    } = await this.calculateMembershipDetails(
      id_tipo_membresia,
      fecha_inicio,
      descuento
    );

    // 1️⃣ Crear contrato en membresias
    const id_membresia = await this.createMembershipContract({
      id_cliente,
      id_tipo_membresia,
      fecha_inicio,
      fecha_fin: authoritative_end_date, // Usar valor calculado
    });

    // 2️⃣ Activar membresía
    const id_activa = await this.activateMembership({
      id_cliente,
      id_membresia,
      fecha_inicio,
      fecha_fin: authoritative_end_date, // Usar valor calculado
      precio_final: authoritative_price, // Usar valor calculado
    });

    // 3️⃣ Registrar integrantes
    await this.addFamilyMembers(id_activa, integrantes);

    // 4️⃣ Obtener datos para el QR
    const { cliente, tipo, integrantesDB } = await this.getMembershipDetails(
      id_cliente,
      id_tipo_membresia,
      id_activa
    );

    // 5️⃣ Armar payload del QR
    const payloadQR = await this.generateQRPayload(id_activa);

    // 6️⃣ Generar archivo PNG del QR
    const qrPath = await this.generateQRCode(
      payloadQR,
      id_activa,
      cliente.nombre_completo
    );

    // 7️⃣ Actualizar la ruta del QR en la base de datos
    await MembershipModel.updateQRPath(id_activa, qrPath);

    // 8️⃣ Registrar el pago
    if (metodo_pago) {
      await MembershipModel.recordPayment({
        id_activa,
        id_metodo_pago: metodo_pago,
        monto: authoritative_price, // Usar valor calculado
      });
    }

    // 9️⃣ Obtener información completa para el modal
    const membresiaCompleta = await MembershipModel.getMembresiaConPago(
      id_activa
    );

    // 🔟 Enviar email de comprobante
    await this.sendMembershipReceiptEmail(
      cliente,
      tipo,
      fecha_inicio,
      authoritative_end_date, // Usar valor calculado
      integrantesDB,
      membresiaCompleta.metodo_pago,
      authoritative_price // Usar valor calculado
    );

    // Devolver la información completa para la respuesta
    return {
      id_activa: id_activa,
      id_membresia: id_membresia,
      titular: cliente.nombre_completo,
      tipo_membresia: tipo.nombre,
      fecha_inicio: fecha_inicio,
      fecha_fin: authoritative_end_date,
      precio_final: parseFloat(authoritative_price),
      precioEnLetras: this.convertirNumeroALetras(parseFloat(authoritative_price)),
      metodo_pago: membresiaCompleta.metodo_pago || "No especificado",
      integrantes: integrantesDB,
      qr_path: qrPath,
    };
  },

  async calculateMembershipDetails(id_tipo_membresia, fecha_inicio, descuento = 0) {
    if (!id_tipo_membresia || !fecha_inicio) {
      throw new Error("El tipo de membresía y la fecha de inicio son requeridos.");
    }

    const tipoMembresia = await MembershipModel.getTipoMembresiaById(id_tipo_membresia);
    if (!tipoMembresia) {
      throw new Error("El tipo de membresía no es válido.");
    }

    // Calcular fecha de fin
    const startDate = new Date(fecha_inicio);
    const endDate = new Date(startDate);
    // Asumimos que la duración viene en días desde la BD
    const duracionDias = tipoMembresia.duracion_dias || 30;
    endDate.setDate(startDate.getDate() + duracionDias);

    const yyyy = endDate.getFullYear();
    const mm = String(endDate.getMonth() + 1).padStart(2, '0');
    const dd = String(endDate.getDate()).padStart(2, '0');
    const fecha_fin_calculada = `${yyyy}-${mm}-${dd}`;

    // Calcular precio final
    const precioBase = parseFloat(tipoMembresia.precio);
    const descuentoAplicado = Math.max(0, Math.min(100, descuento)); // Clamp discount between 0-100
    const precio_final_calculado = precioBase - (precioBase * (descuentoAplicado / 100));

    return {
      precio_final: precio_final_calculado.toFixed(2),
      fecha_fin: fecha_fin_calculada,
    };
  },

  async renewMembership(oldMembershipId, renewalData) {
    const {
      id_cliente,
      nombre_completo,
      telefono,
      correo,
      id_tipo_membresia,
      fecha_inicio,
      fecha_fin,
      id_metodo_pago,
    } = renewalData;

    // 1. Actualizar datos del cliente
    await MembershipModel.updateClient({
      id_cliente,
      nombre_completo,
      telefono,
      correo,
    });

    // 2. Desactivar la membresía antigua
    await MembershipModel.updateEstadoMembresia(oldMembershipId, 'Vencida');

    // 3. Crear el nuevo contrato de membresía
    const id_membresia = await MembershipModel.createMembershipContract({
      id_cliente,
      id_tipo_membresia,
      fecha_inicio,
      fecha_fin,
    });

    // 4. Activar la nueva membresía
    const tipoMembresia = await MembershipModel.getTipoMembresiaById(id_tipo_membresia);
    const precio_final = tipoMembresia.precio;

    const id_activa_nueva = await MembershipModel.activateMembership({
      id_cliente,
      id_membresia,
      fecha_inicio,
      fecha_fin,
      precio_final,
    });

    // 5. Registrar el pago
    await MembershipModel.recordPayment({
      id_activa: id_activa_nueva,
      id_metodo_pago,
      monto: precio_final,
    });
  },

  // Función para convertir número a palabras (básica)
  convertirNumeroALetras(numero) {
    const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    if (numero === 0) return 'cero';
    if (numero === 100) return 'cien';
    
    let resultado = '';
    
    // Simplificación básica - puedes expandir esto según necesites
    if (numero < 10) {
      resultado = unidades[numero];
    } else if (numero < 100) {
      const dec = Math.floor(numero / 10);
      const uni = numero % 10;
      if (numero >= 10 && numero < 20) {
        const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
        resultado = especiales[numero - 10];
      } else {
        resultado = decenas[dec] + (uni > 0 ? ' y ' + unidades[uni] : '');
      }
    } else if (numero < 1000) {
      const cen = Math.floor(numero / 100);
      const resto = numero % 100;
      resultado = centenas[cen] + (resto > 0 ? ' ' + this.convertirNumeroALetras(resto) : '');
    }
    
    return resultado + ' pesos';
  },

  async getReportPreviewData(period, date) {
    const validationError = _validateReportParams(period, date);
    if (validationError) {
      const error = new Error(validationError);
      error.statusCode = 400;
      throw error;
    }

    const { startDate, endDate } = _getReportDateRange(period, date);
    const incomeData = await MembershipModel.getIncomeByPaymentMethod(
      startDate,
      endDate
    );

    if (incomeData.total === 0) {
      return {
        noData: true,
        message: "No se encontraron datos para el reporte en esta fecha, elija una fecha correcta.",
      };
    }

    return incomeData;
  },

  async generateReportPDF(period, date) {
    const validationError = _validateReportParams(period, date);
    if (validationError) {
      const error = new Error(validationError);
      error.isValidationError = true;
      throw error;
    }

    const { startDate, endDate } = _getReportDateRange(period, date);
    const incomeData = await MembershipModel.getIncomeByPaymentMethod(
      startDate,
      endDate
    );

    if (incomeData.total === 0) {
      const error = new Error("No se encontraron datos para el reporte en esta fecha, no se puede generar el PDF.");
      error.isNoDataError = true;
      throw error;
    }

    const templatePath = path.resolve("src", "views", "partials", "report-template.hbs");
    const templateFile = await fs.readFile(templatePath, "utf8");
    const template = hbs.compile(templateFile);
    const reportHtml = template(incomeData);

    const cssPath = path.resolve("public", "styles.css");
    const tailwindCss = await fs.readFile(cssPath, "utf8");

    const fontCss = `
      @font-face {
        font-family: 'Lato'; font-style: normal; font-weight: 400;
        src: url(file://${path.resolve("public", "fonts", "lato-v25-latin-regular.ttf")}) format('truetype');
      }
      @font-face {
        font-family: 'Lato'; font-style: italic; font-weight: 400;
        src: url(file://${path.resolve("public", "fonts", "lato-v25-latin-italic.ttf")}) format('truetype');
      }
      @font-face {
        font-family: 'Lato'; font-style: normal; font-weight: 700;
        src: url(file://${path.resolve("public", "fonts", "lato-v25-latin-700.ttf")}) format('truetype');
      }
      @font-face {
        font-family: 'Lato'; font-style: italic; font-weight: 700;
        src: url(file://${path.resolve("public", "fonts", "lato-v25-latin-700italic.ttf")}) format('truetype');
      }
      body { font-family: 'Lato', sans-serif; }
    `;

    const finalHtml = `
      <!DOCTYPE html><html><head><meta charset="UTF-8"><style>${tailwindCss}${fontCss}</style></head>
      <body>${reportHtml}</body></html>`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    const formatDate = (d) => d.toISOString().split("T")[0];
    const filename = `Reporte-${period}-${formatDate(startDate)}-a-${formatDate(endDate)}.pdf`;

    return { pdf, filename };
  },

  async getMembershipListData(queryParams, userRole = 'Recepcionista') {
    const { search, type, status } = queryParams;
    const isAdmin = userRole === 'Administrador';

    // 1. Obtener estadísticas
    const estadisticas = await modelList.getEstadisticasMembresias();

    // 2. Obtener la lista de membresías según los filtros
    let membresias;
    if (search) {
      membresias = await modelList.buscarMembresias(search);
    } else if (type) {
      membresias = await modelList.getMembresiasPorTipo(type);
    } else if (status) {
      membresias = await modelList.getMembresiasPorEstado(status);
    } else {
      membresias = await modelList.getMembresiasActivas();
    }

    // 3. Formatear los datos (lógica de negocio y presentación)
    const membresiasFormateadas = membresias.map((membresia) => {
      const diasRestantes = membresia.dias_restantes;
      const estadoDB = membresia.estado;

      let statusClass = '';
      let statusText = '';
      let statusIcon = '';

      if (estadoDB === 'Activa' && diasRestantes > 0) {
        if (diasRestantes <= 7) {
          statusClass = 'bg-amber-100 text-amber-800 border-amber-200';
          statusText = `Por vencer (${diasRestantes} días)`;
          statusIcon = 'fa-exclamation-triangle';
        } else if (diasRestantes <= 20) {
          statusClass = 'bg-green-100 text-green-800 border-green-200';
          statusText = `Activa (${diasRestantes} días)`;
          statusIcon = 'fa-check-circle';
        } else {
          statusClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
          statusText = `Activa (${diasRestantes} días)`;
          statusIcon = 'fa-check-circle';
        }
      } else if (estadoDB === 'Inactiva') {
        statusClass = 'bg-gray-100 text-gray-800 border-gray-200';
        statusText = 'Inactiva';
        statusIcon = 'fa-ban';
      } else { // Vencida
        statusClass = 'bg-red-100 text-red-800 border-red-200';
        statusText = 'Vencida';
        statusIcon = 'fa-times-circle';
      }

      return {
        id: membresia.id_activa,
        id_activa: membresia.id_activa,
        fullName: membresia.nombre_completo,
        phone: membresia.telefono,
        email: membresia.correo,
        type: membresia.tipo,
        startDate: membresia.fecha_inicio,
        endDate: membresia.fecha_fin,
        status: membresia.estado,
        daysUntilExpiry: diasRestantes,
        members: membresia.total_integrantes + 1,
        amount: membresia.precio_final,
        isFamily: membresia.tipo === "Familiar",
        integrantes: membresia.integrantes || [],
        // Nuevos campos para la vista
        statusClass: `status-badge ${statusClass} text-xs`,
        statusText: statusText,
        statusIcon: `fas ${statusIcon}`,
        canRenew: isAdmin || diasRestantes <= 0,
      };
    });

    return {
      memberships: membresiasFormateadas,
      estadisticas,
    };
  },

  async getFormattedMembresiasAPI(queryParams) {
    const { memberships } = await this.getMembershipListData(queryParams);

    // Formato adicional específico para la API (ej. fechas)
    return memberships.map(membresia => {
      const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("es-ES", {
          year: "numeric", month: "short", day: "numeric",
        });
      };
      return {
        ...membresia,
        startDate: formatDate(membresia.startDate),
        endDate: formatDate(membresia.endDate),
      };
    });
  },

  async getEstadisticas() {
    return await modelList.getEstadisticasMembresias();
  },

  async getIntegrantes(id_activa) {
    if (!id_activa) {
      const error = new Error("El parámetro id_activa es requerido");
      error.statusCode = 400;
      throw error;
    }
    return await modelList.getIntegrantesByMembresia(id_activa);
  },

  async getMembershipDetailsForAPI(id) {
    if (!id) {
      const error = new Error("El parámetro id es requerido");
      error.statusCode = 400;
      throw error;
    }
    const details = await modelList.getMembresiaDetalles(id);
    if (!details) {
      const error = new Error("Membresía no encontrada");
      error.statusCode = 404;
      throw error;
    }
    return details;
  },

  async deleteMembership(id) {
    if (!id) {
      const error = new Error("El ID de la membresía es requerido.");
      error.statusCode = 400;
      throw error;
    }
    const result = await deleteMembershipById(id);
    if (result.affectedRows === 0) {
      const error = new Error("Membresía no encontrada.");
      error.statusCode = 404;
      throw error;
    }
    return result;
  },

  async getMembershipForEdit(id) {
    if (!id) {
      const error = new Error("El ID de la membresía es requerido.");
      error.statusCode = 400;
      throw error;
    }
    const membresia = await MembershipModel.getMembresiaById(id);
    if (!membresia) {
      const error = new Error("Membresía no encontrada.");
      error.statusCode = 404;
      throw error;
    }
    return membresia;
  },

  async updateCompleteMembership(id, data) {
    const {
      nombre_completo,
      telefono,
      correo,
      estado,
      fecha_inicio,
      fecha_fin,
      precio_final,
      integrantes
    } = data;

    // Validar que la membresía a actualizar existe
    const membresia = await this.getMembershipForEdit(id);
    const tipo = membresia.tipo || 'Individual';

    const membershipData = {
      nombre_completo,
      telefono,
      correo,
      estado,
      fecha_inicio,
      fecha_fin,
      precio_final: parseFloat(precio_final)
    };

    const updateData = {
      membershipData,
      tipo: tipo,
      integrantes: integrantes || []
    };

    return await updateMembershipById(id, updateData);
  },

  async getQRPath(id_activa) {
    if (!id_activa) {
      const error = new Error("El ID de la membresía es requerido.");
      error.statusCode = 400;
      throw error;
    }
    const membresia = await MembershipModel.getMembresiaById(id_activa);
    if (!membresia || !membresia.qr_path) {
      const error = new Error("QR no encontrado para esta membresía.");
      error.statusCode = 404;
      throw error;
    }
    return membresia.qr_path;
  },

  async getMembershipTypeById(id) {
    if (!id) {
      const error = new Error("El ID del tipo de membresía es requerido.");
      error.statusCode = 400;
      throw error;
    }
    const tipo = await MembershipModel.getTipoMembresiaById(id);
    if (!tipo) {
      const error = new Error("Tipo de membresía no encontrado.");
      error.statusCode = 404;
      throw error;
    }
    return tipo;
  },

  async getDataForCreatePage() {
    const [tiposMembresia, tiposPago, precioFamiliar] = await Promise.all([
      MembershipModel.getTiposMembresia(),
      MembershipModel.getMetodosPago(),
      MembershipModel.getPrecioFamiliar ? MembershipModel.getPrecioFamiliar() : Promise.resolve(null),
    ]);
    return { tiposMembresia, tiposPago, precioFamiliar };
  },

  async getDataForRenewPage(id) {
    const [membresia, tiposMembresia, tiposPago] = await Promise.all([
      this.getMembershipForEdit(id), // Reutiliza el método existente que ya tiene validación
      MembershipModel.getTiposMembresia(),
      MembershipModel.getMetodosPago(),
    ]);
    return { membresia, tiposMembresia, tiposPago };
  },

  async getDataForEditPage(id) {
    const [membresia, tiposMembresia] = await Promise.all([
      this.getMembershipForEdit(id), // Reutiliza el método existente
      MembershipModel.getTiposMembresia(),
    ]);
    return { membresia, tiposMembresia };
  }
};