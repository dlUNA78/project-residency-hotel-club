/**
 * @file membershipService.js
 * @description Servicio que encapsula toda la lógica de negocio para el módulo de membresías.
 * Orquesta las llamadas a los modelos, procesa datos y se integra con servicios externos (email, QR, PDF).
 * @module services/MembershipService
 */

import { MembershipModel } from "../models/modelMembership.js";
import { modelList } from "../models/modelList.js";
import { deleteMembershipById } from "../models/modelDelete.js";
import { updateMembershipById } from "../models/modelEdit.js";
import { generarQRArchivo } from "../utils/qrGenerator.js";
import emailService from "../../../services/emailService.js";
import whatsappService from "../../../services/whatsappService.js";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import hbs from "handlebars";

/**
 * Valida los parámetros para la generación de un reporte.
 * @private
 * @param {string} period - El período del reporte ('monthly', 'biweekly', 'weekly').
 * @param {string} date - La fecha específica para el período.
 * @returns {string|null} Un mensaje de error si la validación falla, o null si es exitosa.
 */
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

/**
 * Calcula el rango de fechas (inicio y fin) para un reporte basado en el período y la fecha.
 * @private
 * @param {string} period - El período del reporte.
 * @param {string} date - La fecha específica.
 * @returns {{startDate: Date, endDate: Date}} Un objeto con las fechas de inicio y fin.
 */
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
      // --- CORRECCIÓN ---
      // La lógica anterior era imprecisa. Esta nueva implementación calcula correctamente
      // el inicio (lunes) y fin (domingo) de la semana ISO 8601.
      const week = parseInt(date.substring(5), 10);
      
      // Calcula el primer día del año.
      const firstDayOfYear = new Date(year, 0, 1);
      // El día de la semana del 1 de enero (0=Domingo, 1=Lunes, ...).
      const firstDayOfWeek = firstDayOfYear.getDay();
      // Ajuste para encontrar el lunes de la primera semana del año.
      // Si el 1 de enero es martes (2), necesitamos retroceder 1 día. Si es domingo (0), retrocedemos 6.
      const dayOffset = (firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek);
      
      startDate = new Date(year, 0, 1 + dayOffset + (week - 1) * 7);
      endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
      break;
    }
    default:
      throw new Error("Invalid period specified");
  }

  return { startDate, endDate };
};

/**
 * Objeto de servicio que contiene todos los métodos de lógica de negocio para las membresías.
 * @type {object}
 */
export const MembershipService = {
  /**
   * Crea un registro de contrato de membresía.
   * @param {object} membershipData - Datos del contrato.
   * @returns {Promise<number>} El ID del contrato creado.
   */
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

  /**
   * Genera un archivo de imagen QR, lo guarda en el servidor y devuelve la ruta web.
   * Incluye un mecanismo de fallback para generar un QR con datos mínimos si falla el principal.
   * @param {string} qrData - Los datos a codificar en el QR (generalmente un JSON).
   * @param {number} membershipId - El ID de la membresía, usado para nombrar el archivo.
   * @param {string} titularNombre - El nombre del titular, usado para nombrar el archivo.
   * @returns {Promise<string>} La ruta web relativa al archivo QR (ej. /uploads/qrs/qr_123.png).
   */
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

  /**
   * Crea un registro de membresía activa.
   * @param {object} activationData - Datos para la activación.
   * @returns {Promise<number>} El ID de la membresía activa creada.
   */
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

  /**
   * Agrega los integrantes a una membresía familiar.
   * @param {number} id_activa - El ID de la membresía activa.
   * @param {Array<string|object>} integrantes - Array de nombres de integrantes o de objetos.
   */
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

  /**
   * Obtiene los detalles relacionados a una membresía recién creada (cliente, tipo, integrantes).
   * @param {number} id_cliente - ID del cliente.
   * @param {number} id_tipo_membresia - ID del tipo de membresía.
   * @param {number} id_activa - ID de la membresía activa.
   * @returns {Promise<{cliente: object, tipo: object, integrantesDB: Array<object>}>}
   */
  async getMembershipDetails(id_cliente, id_tipo_membresia, id_activa) {
    const [cliente, tipo, integrantesDB] = await Promise.all([
      MembershipModel.getClienteById(id_cliente),
      MembershipModel.getTipoMembresiaById(id_tipo_membresia),
      MembershipModel.getIntegrantesByActiva(id_activa),
    ]);

    return { cliente, tipo, integrantesDB };
  },

  /**
   * Genera el payload (contenido) para el código QR.
   * Se mantiene simple (solo el ID) para que el QR sea pequeño y fácil de escanear.
   * @param {number} id_activa - El ID de la membresía activa.
   * @returns {Promise<string>} Un string JSON con el ID de la membresía.
   */
  async generateQRPayload(id_activa) {
    // The most robust QR payload is a simple, unique identifier.
    // All other details can be fetched from the server upon scanning.
    // This prevents the QR code from growing too large and failing.
    const qrData = {
      id_activa: id_activa,
    };
    return JSON.stringify(qrData);
  },

  /**
   * Genera un buffer de PDF para un comprobante de membresía usando Puppeteer y una plantilla Handlebars.
   * @private
   * @param {object} data - Datos para rellenar la plantilla del comprobante.
   * @returns {Promise<Buffer>} El buffer del archivo PDF generado.
   */
  async _generateReceiptPDF(data) {
    try {
      const templatePath = path.resolve("src", "views", "partials", "membership-receipt-template.hbs");
      const templateFile = await fs.promises.readFile(templatePath, "utf8");
      const template = hbs.compile(templateFile);
      const receiptHtml = template(data);

      const cssPath = path.resolve("public", "styles.css");
      const tailwindCss = await fs.promises.readFile(cssPath, "utf8");

      const finalHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>${tailwindCss}</style>
          </head>
          <body>
            ${receiptHtml}
          </body>
        </html>`;

      const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(finalHtml, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
      await browser.close();

      return pdfBuffer;
    } catch (error) {
      console.error("❌ Error generando el PDF del comprobante:", error);
      throw new Error("No se pudo generar el comprobante en PDF.");
    }
  },

  /**
   * Orquesta la generación y envío de comprobantes de membresía por correo electrónico y WhatsApp.
   * @param {object} cliente - Objeto con los datos del cliente.
   * @param {object} tipo - Objeto con los datos del tipo de membresía.
   * @param {number} id_activa - ID de la membresía activa.
   * @param {string} fecha_inicio - Fecha de inicio.
   * @param {string} fecha_fin - Fecha de fin.
   * @param {Array<object>} integrantesDB - Array de integrantes.
   * @param {string} metodo_pago - Nombre del método de pago.
   * @param {number} precio_final - Precio final pagado.
   * @param {string} precioEnLetras - El precio final en texto.
   * @returns {Promise<void>}
   */
  async sendMembershipReceipts(
    cliente,
    tipo,
    id_activa,
    fecha_inicio,
    fecha_fin,
    integrantesDB,
    metodo_pago,
    precio_final,
    precioEnLetras
  ) {
    // 1. Preparar datos para el PDF
    const pdfData = {
      titularNombre: cliente.nombre_completo,
      tipoMembresia: tipo?.nombre || "N/D",
      fechaInicio: fecha_inicio,
      fechaFin: fecha_fin,
      metodoPago: metodo_pago || "No especificado",
      precioFinal: parseFloat(precio_final).toFixed(2),
      precioEnLetras: precioEnLetras,
      integrantes: integrantesDB,
    };

    // 2. Generar el PDF en memoria
    const pdfBuffer = await this._generateReceiptPDF(pdfData);

    // 3. Enviar por correo electrónico (funciona con buffer)
    if (cliente?.correo) {
      try {
        const subject = `Comprobante de Membresía - Hotel Club`;
        const body = `Hola ${cliente.nombre_completo},\n\n¡Gracias por unirte a Hotel Club! Adjunto a este correo encontrarás el comprobante de tu membresía en formato PDF.\nTu Código Qr para entrar al club puedes pedirlo en recepción.\n\nSaludos.\n\nEste mensaje se genera automaticamente por el sistema, cualquier duda o aclaración comunicarse con nosotros.`;
        const attachment = {
          filename: `Comprobante-Membresia-${cliente.nombre_completo.replace(/\s/g, '_')}.pdf`,
          content: pdfBuffer,
        };
        await emailService.sendEmailWithAttachment(cliente.correo, subject, body, attachment); 
      } catch (error) {
        console.error("❌ Error enviando comprobante por correo:", error.message);
      }
    }

    // 4. Enviar por WhatsApp (requiere guardado temporal)
    if (cliente?.telefono) {
      const tempDir = path.join(process.cwd(), 'public', 'temp');
      const tempFilePath = path.join(tempDir, `comprobante_${id_activa}_${Date.now()}.pdf`);

      try {
        // Asegurarse de que el directorio temporal exista
        await fs.promises.mkdir(tempDir, { recursive: true });
        // Escribir el PDF temporalmente
        await fs.promises.writeFile(tempFilePath, pdfBuffer);

        const whatsappData = {
          clienteNombre: cliente.nombre_completo,
          numeroMembresia: id_activa,
          tipoMembresia: tipo?.nombre || "N/D",
          fechaVencimiento: fecha_fin,
          total: parseFloat(precio_final).toFixed(2),
        };
        // Enviar usando la ruta del archivo
        await whatsappService.enviarComprobanteMembresía(cliente.telefono, whatsappData, tempFilePath);
      } catch (error) {
        console.error("❌ Error enviando comprobante por WhatsApp:", error.message);
      } finally {
        // Limpiar el archivo temporal después del envío
        try {
          await fs.promises.unlink(tempFilePath);
        } catch (cleanupError) {
          console.error("❌ Error limpiando archivo PDF temporal:", cleanupError.message);
        }
      }
    }
  },

  /**
   * Orquesta el proceso completo de creación de una nueva membresía.
   * Este es un método central que llama a múltiples otros servicios y modelos en secuencia.
   * @param {object} membershipData - Datos del formulario de creación de membresía.
   * @returns {Promise<object>} Un objeto con todos los detalles de la membresía recién creada.
   */
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

    // 1️ Crear contrato en membresias
    const id_membresia = await this.createMembershipContract({
      id_cliente,
      id_tipo_membresia,
      fecha_inicio,
      fecha_fin: authoritative_end_date, // Usar valor calculado
    });

    // 2️ Activar membresía
    const id_activa = await this.activateMembership({
      id_cliente,
      id_membresia,
      fecha_inicio,
      fecha_fin: authoritative_end_date, // Usar valor calculado
      precio_final: authoritative_price, // Usar valor calculado
    });

    // 3️ Registrar integrantes
    await this.addFamilyMembers(id_activa, integrantes);

    // 4️ Obtener datos para el QR
    const { cliente, tipo, integrantesDB } = await this.getMembershipDetails(
      id_cliente,
      id_tipo_membresia,
      id_activa
    );

    // 5️ Armar payload del QR
    const payloadQR = await this.generateQRPayload(id_activa);

    // 6️ Generar archivo PNG del QR
    const qrPath = await this.generateQRCode(
      payloadQR,
      id_activa,
      cliente.nombre_completo
    );

    // 7️ Actualizar la ruta del QR en la base de datos
    await MembershipModel.updateQRPath(id_activa, qrPath);

    // 8️  Registrar el pago
    if (metodo_pago) {
      await MembershipModel.recordPayment({
        id_activa,
        id_metodo_pago: metodo_pago,
        monto: authoritative_price, // Usar valor calculado
      });
    }

    // 9️ Obtener información completa para el modal
    const membresiaCompleta = await MembershipModel.getMembresiaConPago(
      id_activa
    );

    // 10️ Enviar comprobantes
    const precioEnLetras = this.convertirNumeroALetras(parseFloat(authoritative_price));
    await this.sendMembershipReceipts(
      cliente,
      tipo,
      id_activa,
      fecha_inicio,
      authoritative_end_date,
      integrantesDB,
      membresiaCompleta.metodo_pago,
      authoritative_price,
      precioEnLetras
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
      precioEnLetras: precioEnLetras,
      metodo_pago: membresiaCompleta.metodo_pago || "No especificado",
      integrantes: integrantesDB,
      qr_path: qrPath,
    };
  },

  /**
   * Calcula los detalles de una membresía (fecha de fin y precio final) basándose en el tipo y un descuento.
   * Se usa para previsualizaciones y como fuente autoritativa de precios para evitar manipulación del cliente.
   * @param {number} id_tipo_membresia - ID del tipo de membresía.
   * @param {string} fecha_inicio - Fecha de inicio.
   * @param {number} [descuento=0] - Porcentaje de descuento a aplicar.
   * @returns {Promise<{precio_final: string, fecha_fin: string}>}
   */
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

  /**
   * Orquesta el proceso de renovación de una membresía.
   * @param {number} oldMembershipId - El ID de la membresía que se está renovando.
   * @param {object} renewalData - Los datos del formulario de renovación.
   * @returns {Promise<void>}
   */
  async renewMembership(id_activa, renewalData) {
    const {
      id_cliente,
      nombre_completo,
      telefono,
      correo,
      id_tipo_membresia,
      id_metodo_pago,
      integrantes,
    } = renewalData;

    // 1. Obtener la membresía existente para obtener el id_membresia (contrato)
    const oldMembership = await MembershipModel.getMembresiaById(id_activa);
    if (!oldMembership) {
      throw new Error("La membresía que intenta renovar no existe.");
    }

    // 2. Recalcular precio y fecha de fin en el servidor para seguridad.
    const { precio_final, fecha_fin } = await this.calculateMembershipDetails(
      id_tipo_membresia,
      renewalData.fecha_inicio,
      0 // Descuento no aplica en renovación por ahora
    );

    // 3. Actualizar datos del cliente
    await MembershipModel.updateClient({
      id_cliente,
      nombre_completo,
      telefono,
      correo,
    });
    
    // 4. Actualizar la membresía activa existente con los nuevos datos de renovación
    await updateMembershipById(id_activa, {
      membershipData: {
        nombre_completo,
        telefono,
        correo,
        estado: 'Activa', // Se reactiva la membresía
        fecha_inicio: renewalData.fecha_inicio,
        fecha_fin: fecha_fin, // Fecha calculada
        id_tipo_membresia: id_tipo_membresia, // Pasar el nuevo tipo para actualizar el contrato
        precio_final: precio_final, // Precio calculado
      },
      tipo: (await MembershipModel.getTipoMembresiaById(id_tipo_membresia)).nombre.includes('Familiar') ? 'Familiar' : 'Individual',
      integrantes: integrantes || []
    });

    // 5. Registrar el nuevo pago de la renovación
    await MembershipModel.recordPayment({
      id_activa: id_activa,
      id_metodo_pago,
      monto: precio_final,
    });

    // 6. Regenerar el archivo QR (buena práctica, aunque el payload no cambie)
    const payloadQR = await this.generateQRPayload(id_activa);
    const qrPath = await this.generateQRCode(
      payloadQR,
      id_activa,
      nombre_completo
    );
    await MembershipModel.updateQRPath(id_activa, qrPath);

    // 7. Enviar el nuevo comprobante de renovación
    const [tipoMembresia, integrantesDB, metodoPagoInfo] = await Promise.all([
        MembershipModel.getTipoMembresiaById(id_tipo_membresia),
        MembershipModel.getIntegrantesByActiva(id_activa),
        MembershipModel.getMetodoPagoById(id_metodo_pago)
    ]);

    const precioEnLetras = this.convertirNumeroALetras(parseFloat(precio_final));
    
    await this.sendMembershipReceipts(
      { nombre_completo, correo, telefono }, // Datos del cliente
      tipoMembresia,                         // Datos del tipo de membresía
      id_activa,
      renewalData.fecha_inicio,
      fecha_fin,                             // Fecha de fin calculada
      integrantesDB,                         // Integrantes actualizados desde la BD
      metodoPagoInfo.nombre,                 // Nombre del método de pago
      precio_final,
      precioEnLetras
    );

    // Devolver datos para una posible respuesta de la API
    return { id_activa, qr_path: qrPath };
  },

  /**
   * Convierte un número a su representación en palabras en español (versión básica).
   * @param {number} numero - El número a convertir.
   * @returns {string} El número en palabras.
   * @example convertirNumeroALetras(125) // "ciento veinticinco pesos"
   */
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

  /**
   * Obtiene los datos para la vista previa de un reporte de ingresos.
   * @param {string} period - El período del reporte.
   * @param {string} date - La fecha del reporte.
   * @returns {Promise<object>} Los datos de ingresos o un mensaje de que no hay datos.
   */
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

  /**
   * Genera un reporte de ingresos en formato PDF.
   * @param {string} period - El período del reporte.
   * @param {string} date - La fecha del reporte.
   * @returns {Promise<{pdf: Buffer, filename: string}>} El buffer del PDF y el nombre de archivo sugerido.
   */
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
    const templateFile = await fs.promises.readFile(templatePath, "utf8");
    const template = hbs.compile(templateFile);
    const reportHtml = template(incomeData);

    const cssPath = path.resolve("public", "styles.css");
    const tailwindCss = await fs.promises.readFile(cssPath, "utf8");

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

  /**
   * Obtiene y formatea los datos para la página de listado de membresías.
   * Aplica filtros, búsqueda y añade lógica de presentación (clases CSS, textos de estado).
   * @param {object} queryParams - Parámetros de la URL para filtrar y buscar.
   * @param {string} [userRole='Recepcionista'] - El rol del usuario actual para determinar permisos.
   * @returns {Promise<{memberships: Array<object>, estadisticas: object}>}
   */
  async getMembershipListData(queryParams, userRole = 'Recepcionista') {
    const isAdmin = userRole === 'Administrador';

    // 1. Obtener estadísticas (puede que necesitemos ajustar esto más adelante si el rendimiento es un problema)
    const estadisticas = await modelList.getEstadisticasMembresias();

    // 2. Obtener la lista de membresías usando la nueva función centralizada
    const membresias = await modelList.getAllMembresias(queryParams);

    // 3. Formatear los datos con la nueva lógica de estado
    const membresiasFormateadas = membresias.map((membresia) => {
      let statusClass = '';
      let statusText = '';

      // Prioridad 1: El estado de la base de datos.
      if (membresia.estado !== 'Activa') {
        statusText = membresia.estado; // Ej. "Inactiva", "Suspendida"
        statusClass = 'bg-gray-200 text-gray-800';
      } else {
        // Solo si el estado es 'Activa', calculamos por fecha.
        const diasRestantes = membresia.dias_restantes;
        const diasParaIniciar = membresia.dias_para_iniciar;

        if (diasParaIniciar > 0) {
          statusClass = 'bg-blue-100 text-blue-800';
          statusText = 'Programada';
        } else if (diasRestantes <= 0) {
          statusClass = 'bg-red-100 text-red-800';
          statusText = 'Vencida';
        } else if (diasRestantes <= 8) {
          statusClass = 'bg-yellow-100 text-yellow-800';
          statusText = 'Por Vencer';
        } else {
          statusClass = 'bg-green-100 text-green-800';
          statusText = 'Activa';
        }
      }

      return {
        ...membresia, // Incluir todos los campos originales
        statusClass: statusClass,
        statusText: statusText,
        isFamily: membresia.tipo_membresia === "Familiar", // <-- AÑADIR ESTA LÍNEA
        canRenew: isAdmin || diasRestantes <= 0,
      };
    });

    return {
      memberships: membresiasFormateadas,
      estadisticas,
    };
  },

  /**
   * Obtiene la lista de membresías formateada específicamente para una respuesta de API.
   * @param {object} queryParams - Parámetros de la URL para filtrar y buscar.
   * @returns {Promise<Array<object>>} La lista de membresías formateada.
   */
  async getFormattedMembresiasAPI(queryParams, userRole = 'Recepcionista') {
    const { memberships } = await this.getMembershipListData(queryParams, userRole);    
    const isAdmin = userRole === 'Administrador';

    return memberships.map(membresia => {
        return {
            ...membresia,
            isFamily: membresia.tipo_membresia === "Familiar",
            canRenew: isAdmin || membresia.dias_restantes <= 0,
            isAdmin: isAdmin
        };
    });
  },

  /**
   * Obtiene las estadísticas de las membresías.
   * @returns {Promise<object>} Un objeto con las estadísticas.
   */
  async getEstadisticas() {
    return await modelList.getEstadisticasMembresias();
  },

  /**
   * Obtiene los integrantes de una membresía específica.
   * @param {number} id_activa - El ID de la membresía activa.
   * @returns {Promise<Array<object>>} Un array con los integrantes.
   * @throws {Error} Si `id_activa` no se proporciona.
   */
  async getIntegrantes(id_activa) {
    if (!id_activa) {
      const error = new Error("El parámetro id_activa es requerido");
      error.statusCode = 400;
      throw error;
    }
    return await modelList.getIntegrantesByMembresia(id_activa);
  },

  /**
   * Obtiene el historial de pagos de una membresía.
   * @param {number} id_activa - El ID de la membresía activa.
   * @returns {Promise<Array<object>>} Un array con los pagos.
   * @throws {Error} Si `id_activa` no se proporciona.
   */
  async getPaymentsHistory(id_activa) {
    if (!id_activa) {
      const error = new Error("El parámetro id_activa es requerido");
      error.statusCode = 400;
      throw error;
    }
    // Reutilizamos el método del modelo que ya existe.
    return await modelList.getPagosMembresia(id_activa);
  },


  /**
   * Obtiene los detalles completos de una membresía para una respuesta de API.
   * @param {number} id - El ID de la membresía activa.
   * @returns {Promise<object>} El objeto con los detalles de la membresía.
   * @throws {Error} Si el ID no se proporciona o la membresía no se encuentra.
   */
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

  /**
   * Orquesta la eliminación de una membresía llamando al modelo transaccional.
   * @param {number} id - El ID de la membresía a eliminar.
   * @returns {Promise<object>} El resultado de la operación de la base de datos.
   * @throws {Error} Si el ID no se proporciona o la membresía no se encuentra.
   */
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

  /**
   * Obtiene los datos de una membresía necesarios para poblar un formulario de edición.
   * @param {number} id - El ID de la membresía.
   * @returns {Promise<object>} El objeto de la membresía.
   * @throws {Error} Si el ID no se proporciona o la membresía no se encuentra.
   */
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

  /**
   * Orquesta la actualización de una membresía llamando al modelo transaccional.
   * @param {number} id - El ID de la membresía a actualizar.
   * @param {object} data - Los nuevos datos de la membresía desde el formulario.
   * @returns {Promise<object>} El resultado de la operación de la base de datos.
   */
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

  /**
   * Obtiene la ruta del archivo QR para una membresía específica.
   * @param {number} id_activa - El ID de la membresía activa.
   * @returns {Promise<string>} La ruta del archivo QR.
   * @throws {Error} Si el ID no se proporciona o el QR no se encuentra.
   */
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

  /**
   * Obtiene los detalles de un tipo de membresía por su ID.
   * @param {number} id - El ID del tipo de membresía.
   * @returns {Promise<object>} El objeto del tipo de membresía.
   * @throws {Error} Si el ID no se proporciona o el tipo no se encuentra.
   */
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

  /**
   * Obtiene todos los datos de catálogos necesarios para renderizar la página de creación.
   * @returns {Promise<{tiposMembresia: Array, tiposPago: Array, precioFamiliar: number}>}
   */
  async getDataForCreatePage() {
    const [tiposMembresia, tiposPago, precioFamiliar] = await Promise.all([
      MembershipModel.getTiposMembresia(),
      MembershipModel.getMetodosPago(),
      MembershipModel.getPrecioFamiliar ? MembershipModel.getPrecioFamiliar() : Promise.resolve(null),
    ]);
    return { tiposMembresia, tiposPago, precioFamiliar };
  },

  /**
   * Obtiene los datos necesarios para renderizar la página de renovación.
   * @param {number} id - El ID de la membresía a renovar.
   * @returns {Promise<{membresia: object, tiposMembresia: Array, tiposPago: Array}>}
   */
  async getDataForRenewPage(id) {
    const [membresia, tiposMembresia, tiposPago] = await Promise.all([
      this.getMembershipForEdit(id), // Reutiliza el método existente que ya tiene validación
      MembershipModel.getTiposMembresia(),
      MembershipModel.getMetodosPago(),
    ]);
    return { membresia, tiposMembresia, tiposPago };
  },

  /**
   * Obtiene los datos necesarios para renderizar la página de edición.
   * @param {number} id - El ID de la membresía a editar.
   * @returns {Promise<{membresia: object, tiposMembresia: Array}>}
   */
  async getDataForEditPage(id) {
    const [membresia, tiposMembresia] = await Promise.all([
      this.getMembershipForEdit(id), // Reutiliza el método existente
      MembershipModel.getTiposMembresia(),
    ]);
    return { membresia, tiposMembresia };
  },

  /**
   * Procesa el escaneo de un QR, valida la membresía y registra el acceso.
   * @param {number} id_activa - El ID de la membresía activa escaneada.
   * @returns {Promise<object>} Un objeto con el estado y los datos de la membresía.
   */
  async processQRScan(id_activa) {
    if (!id_activa) {
      const error = new Error("El ID de la membresía es requerido.");
      error.statusCode = 400;
      throw error;
    }

    // Obtener todos los detalles, incluyendo el campo 'estado'
    const membershipDetails = await modelList.getMembresiaDetalles(id_activa);

    if (!membershipDetails) {
      return {
        status: 'not_found',
        message: 'Datos no encontrados'
      };
    }

    // Crear un objeto base para la respuesta de detalles.
    const detailsResponse = {
      titular: membershipDetails.nombre_completo, // CORRECCIÓN: Usar nombre_completo
      tipo_membresia: membershipDetails.tipo_membresia,
      fecha_inicio: membershipDetails.fecha_inicio,
      fecha_fin: membershipDetails.fecha_fin,
    };

    // 1. PRIMERA VALIDACIÓN: El estado en la base de datos debe ser 'Activa'.
    if (membershipDetails.estado !== 'Activa') {
      return {
        status: 'inactive',
        message: `La membresía se encuentra inactiva (${membershipDetails.estado}).`,
        details: detailsResponse
      };
    }

    // 2. SEGUNDA VALIDACIÓN: La fecha de vencimiento debe ser vigente.
    if (membershipDetails.dias_restantes <= 0) {
      return {
        status: 'expired',
        message: 'Esta membresía ha expirado.',
        details: detailsResponse
      };
    }

    // Si ambas validaciones pasan, la membresía es válida.
    // Registrar la entrada en la tabla 'registro_entradas'.
    await MembershipModel.recordAccess(id_activa, membershipDetails.tipo_membresia);

    return {
      status: 'active',
      message: 'Acceso autorizado.',
      details: {
        ...detailsResponse,
        integrantes: membershipDetails.integrantes,
      }
    };
  },

  /**
   * Obtiene el historial de acceso para una fecha específica, con paginación.
   * @param {string} date - La fecha en formato YYYY-MM-DD.
   * @param {number} page - El número de página.
   * @returns {Promise<object>} Un objeto con los registros de acceso y la información de paginación.
   */
  async getAccessHistory(date, page = 1) {
    if (!date) {
        const error = new Error("La fecha es requerida.");
        error.statusCode = 400;
        throw error;
    }
    const limit = 10; // Definir el número de registros por página
    const { logs, total } = await MembershipModel.getAccessLogByDate(date, page, limit);

    // Convertir fechas a formato ISO 8601 (UTC)
    const formattedLogs = logs.map(log => ({
      ...log,
      fecha_hora_entrada: new Date(log.fecha_hora_entrada).toISOString()
    }));

    return {
      logs: formattedLogs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total
      }
    };
  }
};