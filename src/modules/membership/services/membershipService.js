// services/membershipService.js
import { MembershipModel } from "../models/modelMembership.js";
import { generarQRArchivo } from "../utils/qrGenerator.js";
import { sendReceiptEmail } from "../utils/nodeMailer.js";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";

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
        },
        // Forzar versión específica si es necesario
        version: 10 // Versión 10 soporta ~500 caracteres
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

  async generateQRPayload(cliente, tipo, fechaInicio, fechaFin, integrantes = []) {
    try {
      // Crear un objeto simple con la información esencial
      const qrData = {
        id: cliente.id_cliente,
        nombre: cliente.nombre_completo,
        membresia: tipo.nombre,
        inicio: fechaInicio,
        fin: fechaFin,
        // Solo incluir información crítica para evitar datos excesivos
        integrantes: integrantes.length > 0 ? integrantes.map(i => i.nombre_completo) : []
      };

      // Convertir a JSON string y limitar el tamaño
      const jsonString = JSON.stringify(qrData);

      // Verificar que no exceda el límite recomendado para QR (∼4KB)
      if (jsonString.length > 4000) {
        console.warn('⚠️ Los datos del QR son muy grandes, simplificando...');

        // Versión simplificada si los datos son demasiado grandes
        const simplifiedData = {
          id: cliente.id_cliente,
          n: cliente.nombre_completo.substring(0, 30), // Limitar nombre
          m: tipo.nombre.substring(0, 20),
          i: fechaInicio,
          f: fechaFin
        };

        return JSON.stringify(simplifiedData);
      }

      return jsonString;

    } catch (error) {
      console.error('❌ Error generando payload QR:', error);
      // Fallback: datos mínimos esenciales
      return JSON.stringify({
        id: cliente.id_cliente,
        nombre: cliente.nombre_completo,
        membresia: tipo.nombre,
        inicio: fechaInicio,
        fin: fechaFin
      });
    }
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
      await sendReceiptEmail({
        to: cliente.correo,
        subject: "Comprobante de Membresía - Hotel Club",
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
  }
};