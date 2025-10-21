/**
 * @file membership.api.routes.js - Enrutador para la API de Membresías
 * @description Define las rutas de la API interna para el módulo de membresías.
 * Estas rutas están diseñadas para ser consumidas por el frontend a través de AJAX/Fetch
 * para obtener datos dinámicamente (listas, detalles, estadísticas) sin recargar la página.
 * Todas las rutas aquí definidas estarán prefijadas por `/api/memberships` en la aplicación principal.
 */
import express from "express";
import { authMiddleware } from "../../login/middlewares/accessDenied.js";
import { MembershipController } from "../controllers/createMemberController.js";
import { listMembershipController } from "../controllers/listMemberController.js";
import { reportsController } from "../controllers/reportsController.js";

const routerApi = express.Router();

// Middleware de autenticación global.
// Asegura que solo los usuarios autenticados puedan consumir esta API.
routerApi.use(authMiddleware);

// Helper para vincular el contexto 'this' de los controladores a sus métodos.
// Esencial para que los métodos de clase funcionen como manejadores de rutas en Express.
const bind = (controller, method) => controller[method].bind(controller);

// ===================================================================
// RUTAS DE LA API DE MEMBRESÍAS
// ===================================================================

// GET /api/memberships/
// Obtiene la lista completa de membresías, formateada para ser mostrada en una tabla.
// Acepta parámetros de query (?search=, ?status=) para filtrar los resultados.
routerApi.get("/", bind(listMembershipController, "getMembresiasAPI"));

// GET /api/memberships/statistics
// Devuelve un objeto JSON con estadísticas clave sobre las membresías (activas, vencidas, total).
routerApi.get("/statistics", bind(listMembershipController, "getEstadisticasAPI"));

// GET /api/memberships/:id_activa/integrantes
// Obtiene la lista de integrantes (miembros familiares) asociados a una membresía específica.
routerApi.get("/:id_activa/integrantes", (req, res) =>
  listMembershipController.getIntegrantesAPI(req, res)
);

// GET /api/memberships/details/:id
// Obtiene todos los detalles de una membresía específica para mostrar en una vista de detalle o modal.
routerApi.get("/details/:id", (req, res) =>
  listMembershipController.getMembershipDetailsAPI(req, res)
);

// POST /api/memberships/verify-client
// Verifica si un cliente existe por su teléfono o correo y devuelve el estado de su membresía.
routerApi.post("/verify-client", bind(MembershipController, "verifyClient"));


// ===================================================================
// RUTAS DE LA API DE REPORTES
// ===================================================================

// GET /api/memberships/reports/preview
// Obtiene los datos para una vista previa de un reporte de ingresos sin generar el PDF.
routerApi.get("/reports/preview", bind(reportsController, "getReportPreview"));

// GET /api/memberships/reports/download
// Genera y sirve un reporte de ingresos en formato PDF para su descarga.
routerApi.get("/reports/download", bind(reportsController, "downloadReportPDF"));

export { routerApi as membershipApiRoutes };
