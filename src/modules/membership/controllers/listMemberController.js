/**
 * @file listMemberController.js
 * @description Controlador para listar membresías y proporcionar endpoints de API relacionados.
 * @module controllers/listMemberController
 */

import { MembershipService } from "../services/membershipService.js";

/**
 * Objeto controlador para las operaciones de listado y consulta de membresías.
 * @type {object}
 */
const listMembershipController = {
  /**
   * Renderiza la página de la lista de membresías con datos iniciales.
   * @async
   * @param {import('express').Request} req - El objeto de solicitud de Express. Puede contener `query params` para filtros.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   */
  async renderMembershipList(req, res) {
    try {
      const userRole = req.session.user?.role || "Recepcionista";
      const isAdmin = userRole === "Administrador";
      const { filter, search, type, status } = req.query;

      // Llama al servicio para obtener la lista de membresías y las estadísticas.
      const [listData, pageData] = await Promise.all([
          MembershipService.getMembershipListData(req.query, userRole),
          MembershipService.getDataForCreatePage()
      ]);

      // Renderiza la vista 'membershipList' con todos los datos necesarios.
      res.render("membershipList", {
        title: "Lista de Membresías",
         showFooter: true,
        isAdmin,
        userRole,
        memberships: listData.memberships,
        membershipTypes: pageData.tiposMembresia,
        estadisticas: listData.estadisticas,
        currentFilter: filter || "all",
        currentSearch: search || "",
        currentType: type || "",
        currentStatus: status || "",
        // Helper para la plantilla Handlebars.
        helpers: {
          eq: (a, b) => a === b,
          formatPeriod: (start, end) => {
            const startDate = new Date(start);
            const endDate = new Date(end);
            const formatDate = (d) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
            return `${formatDate(startDate)} - ${formatDate(endDate)}`;
          }
        }
      });
    } catch (error) {
      // En caso de error, renderiza una página de error genérica.
      console.error("Error al renderizar lista de membresías:", error);
      res.status(500).render('error', {
        title: "Error",
        message: "Error al cargar la lista de membresías."
      });
    }
  },

  /**
   * Endpoint de API para obtener la lista de membresías en formato JSON.
   * @async
   * @param {import('express').Request} req - El objeto de solicitud de Express.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   */
  async getMembresiasAPI(req, res) {
    try {
      const userRole = req.session.user?.role || "Recepcionista";
      // Llama al servicio para obtener los datos ya formateados para la API.
      const membresiasFormateadas = await MembershipService.getFormattedMembresiasAPI(req.query, userRole);
      res.json({
        success: true,
        data: membresiasFormateadas,
        total: membresiasFormateadas.length,
      });
    } catch (error) {
      // Devuelve un error en formato JSON si algo falla.
      console.error("Error en API de membresías:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener las membresías",
        error: error.message,
      });
    }
  },

  /**
   * Endpoint de API para obtener las estadísticas de las membresías.
   * @async
   * @param {import('express').Request} req - El objeto de solicitud de Express.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   */
  async getEstadisticasAPI(req, res) {
    try {
      const estadisticas = await MembershipService.getEstadisticas();
      res.json({
        success: true,
        data: estadisticas,
      });
    } catch (error) {
      console.error("Error en API de estadísticas:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener las estadísticas",
        error: error.message,
      });
    }
  },

  /**
   * Endpoint de API para obtener los integrantes de una membresía específica.
   * @async
   * @param {import('express').Request} req - El objeto de solicitud de Express. Se espera `id_activa` en `req.params`.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   */
  async getIntegrantesAPI(req, res) {
    try {
      const { id_activa } = req.params;
      const integrantes = await MembershipService.getIntegrantes(id_activa);
      res.json(integrantes);
    } catch (error) {
      // Maneja errores específicos (ej. 400 si falta el ID, 404 si no se encuentra)
      // o un 500 genérico.
      console.error("Error al obtener integrantes:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        error: error.message || "Error interno del servidor al obtener integrantes",
      });
    }
  },

  /**
   * Endpoint de API para obtener el historial de pagos de una membresía.
   * @async
   * @param {import('express').Request} req - El objeto de solicitud de Express. Se espera `id_activa` en `req.params`.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   */
  async getPaymentsHistoryAPI(req, res) {
    try {
      const { id_activa } = req.params;
      const payments = await MembershipService.getPaymentsHistory(id_activa);
      res.json(payments);
    } catch (error) {
      console.error("Error al obtener historial de pagos:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        error: error.message || "Error interno del servidor al obtener el historial de pagos",
      });
    }
  },


  /**
   * Endpoint de API para obtener los detalles completos de una membresía.
   * @async
   * @param {import('express').Request} req - El objeto de solicitud de Express. Se espera `id` en `req.params`.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   */
  async getMembershipDetailsAPI(req, res) {
    try {
      const { id } = req.params;
      const userRole = req.session.user?.role || "Recepcionista";
      const isAdmin = userRole === "Administrador";

      // Obtiene los detalles desde el servicio.
      const details = await MembershipService.getMembershipDetailsForAPI(id);

      // Devuelve los detalles y añade información sobre los permisos del usuario actual.
      res.json({
        ...details,
        isAdmin,
      });
    } catch (error) {
      // Maneja errores como "no encontrado" (404) o errores del servidor.
      console.error("Error al obtener los detalles de la membresía:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        error: error.message || "Error interno del servidor al obtener los detalles de la membresía",
      });
    }
  },

  /**
   * Endpoint de API para obtener y validar la información de una membresía desde un QR.
   * Si la membresía es válida y está activa, registra una nueva entrada en el historial de acceso.
   * @async
   * @param {import('express').Request} req - El objeto de solicitud de Express. Se espera `id` en `req.params`.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   */
  async getMembershipByQR(req, res) {
    try {
      const { id } = req.params;
      // Llama al servicio para procesar el QR. El servicio se encargará de la validación y el registro.
      const result = await MembershipService.processQRScan(id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error al procesar el QR de la membresía:", error);
      // Devuelve un estado de error específico si el servicio lo proporciona (ej. no encontrado).
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Error al procesar el código QR.",
        error: error.message,
      });
    }
  },

  /**
   * Endpoint de API para obtener el historial de acceso de una fecha específica.
   * @async
   * @param {import('express').Request} req - El objeto de solicitud de Express. Se espera `date` en `req.query`.
   * @param {import('express').Response} res - El objeto de respuesta de Express.
   */
  async getAccessHistoryAPI(req, res) {
    try {
      const { date } = req.query;
      // Si no se proporciona una fecha, se usa el día actual.
      const targetDate = date || new Date().toISOString().split('T')[0];
      const accessLog = await MembershipService.getAccessHistory(targetDate);
      res.json({
        success: true,
        data: accessLog,
      });
    } catch (error) {
      console.error("Error en API de historial de acceso:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener el historial de acceso",
        error: error.message,
      });
    }
  },
};

export { listMembershipController };