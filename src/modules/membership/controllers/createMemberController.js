/**
 * @file createMemberController.js
 * @description Controlador para la creación y gestión de nuevas membresías, clientes y recursos asociados como códigos QR.
 * @module controllers/createMemberController
 */

import { ClientService } from "../services/clientService.js";
import { MembershipService } from "../services/membershipService.js";
import path from "path";
import fs from "fs";

/**
 * Objeto controlador para las operaciones de creación de membresías.
 * @type {object}
 */
const MembershipController = {
  /**
   * Maneja la solicitud para crear un nuevo cliente.
   * @async
   * @param {import('express').Request} req - El objeto de solicitud de Express. Se esperan `nombre_completo`, `correo` y `telefono` en `req.body`.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   * @returns {Promise<void>}
   */
  async createClient(req, res) {
    try {
      const { nombre_completo, correo, telefono } = req.body;
      const result = await ClientService.createClient({
        nombre_completo,
        correo,
        telefono,
      });
      res.json(result);
    } catch (error) {
      console.error("Error en createClient:", error);
      res.status(500).json({ error: "Error al crear el cliente", details: error.message });
    }
  },

  /**
   * Maneja la solicitud para crear una membresía completa.
   * Delega toda la lógica de creación (contrato, activación, QR, pagos, notificaciones) al servicio de membresías.
   * @async
   * @param {import('express').Request} req - El objeto de solicitud de Express. `req.body` contiene todos los datos necesarios para la membresía.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   * @returns {Promise<void>}
   */
  async createMembership(req, res) {
    try {
      const newMembershipData = await MembershipService.createCompleteMembership(req.body);
      res.json({
        success: true,
        message: "Membresía creada exitosamente",
        data: newMembershipData,
      });
    } catch (error) {
      console.error("Error en createMembership:", error);
      res.status(500).json({
        success: false,
        message: "Error al crear la membresía",
        error: error.message,
      });
    }
  },

  /**
   * Calcula y devuelve los detalles de una membresía (precio final y fecha de fin) sin crearla.
   * Útil para previsualizaciones en el frontend.
   * @async
   * @param {import('express').Request} req - El objeto de solicitud de Express. Se esperan `id_tipo_membresia`, `fecha_inicio` y `descuento` en `req.body`.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   * @returns {Promise<void>}
   */
  async calculateDetails(req, res) {
    try {
      const { id_tipo_membresia, fecha_inicio, descuento } = req.body;
      const details = await MembershipService.calculateMembershipDetails(
        id_tipo_membresia,
        fecha_inicio,
        descuento
      );
      res.json(details);
    } catch (error) {
      console.error("Error calculating membership details:", error);
      res.status(400).json({ error: error.message });
    }
  },

  /**
   * Sirve el archivo de imagen del código QR para una membresía específica.
   * Se usa para mostrar el QR en una etiqueta <img> en el frontend.
   * @async
   * @param {import('express').Request} req - El objeto de solicitud de Express. Se espera `id_activa` en `req.params`.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   * @returns {Promise<void>}
   */
  async serveQRCode(req, res) {
    try {
      const { id_activa } = req.params;
      const qrRelativePath = await MembershipService.getQRPath(id_activa);
      const qrFullPath = path.join(process.cwd(), "public", qrRelativePath);

      // Verifica si el archivo físico existe antes de intentar enviarlo.
      if (!fs.existsSync(qrFullPath)) {
        return res.status(404).json({ error: "Archivo QR no encontrado en el servidor" });
      }

      res.sendFile(qrFullPath);
    } catch (error) {
      console.error("Error al servir QR:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || "Error al obtener el QR" });
    }
  },

  /**
   * Inicia la descarga del archivo de imagen del código QR.
   * Configura las cabeceras HTTP para que el navegador lo trate como una descarga.
   * @async
   * @param {import('express').Request} req - El objeto de solicitud de Express. Se espera `id_activa` en `req.params`.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   * @returns {Promise<void>}
   */
  async downloadQR(req, res) {
    try {
      const { id_activa } = req.params;
      const qrRelativePath = await MembershipService.getQRPath(id_activa);
      const qrFullPath = path.join(process.cwd(), "public", qrRelativePath);

      // Verifica la existencia del archivo para evitar errores.
      if (!fs.existsSync(qrFullPath)) {
        return res.status(404).json({ error: "Archivo QR no encontrado en el servidor" });
      }

      const filename = `membresia_${id_activa}_qr.png`;
      // Configura las cabeceras para forzar la descarga con un nombre de archivo específico.
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "image/png");

      const fileStream = fs.createReadStream(qrFullPath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error al descargar QR:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || "Error al descargar el QR" });
    }
  },

  /**
   * Obtiene los detalles de un tipo de membresía específico por su ID.
   * @async
   * @param {import('express').Request} req - El objeto de solicitud de Express. Se espera `id` en `req.params`.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   * @returns {Promise<void>}
   */
  async getTipoMembresiaById(req, res) {
    try {
      const { id } = req.params;
      const tipo = await MembershipService.getMembershipTypeById(id);
      res.json(tipo);
    } catch (error) {
      console.error("Error obteniendo tipo de membresía:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || "Error del servidor" });
    }
  },

  /**
   * Renderiza la página para crear una nueva membresía.
   * Carga previamente los datos necesarios (tipos de membresía, métodos de pago) desde el servicio.
   * @async
   * @param {import('express').Request} req - El objeto de solicitud de Express.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   * @returns {Promise<void>}
   */
  async renderTiposMembresia(req, res) {
    try {
      const userRole = req.session.user?.role || "Recepcionista";
      const isAdmin = userRole === "Administrador";
      // Llama al servicio para obtener los datos necesarios para poblar los selectores del formulario.
      const pageData = await MembershipService.getDataForCreatePage();

      res.render("membershipCreate", {
        title: "Crear Membesía",
        showFooter: true,
        isAdmin,
        userRole,
        ...pageData,
        apiBase: "/memberships",
      });
    } catch (error) {
      console.error("Error al cargar tipos de membresía:", error);
      res.status(500).render('error', {
          title: "Error",
          message: "Error al cargar la página de creación de membresía."
      });
    }
  },

  /**
   * Verifica si un cliente ya existe basado en su correo o teléfono
   * y devuelve el estado de su membresía si la tuviera.
   * @param {import('express').Request} req - El objeto de solicitud de Express.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   */
  async verifyClient(req, res) {
    try {
      const { correo, telefono } = req.body;
      const result = await ClientService.verifyClient({ correo, telefono });
      res.json(result);
    } catch (error) {
      console.error("Error en verifyClient:", error);
      res.status(500).json({ error: "Error al verificar el cliente", details: error.message });
    }
  },
};

export { MembershipController };