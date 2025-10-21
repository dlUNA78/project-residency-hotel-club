/**
 * @file membership.Routes.js - Enrutador para el Módulo de Membresías
 * @description Define las rutas para el módulo de membresías.
 * Este archivo centraliza todas las rutas HTTP, tanto para renderizar vistas (páginas web)
 * como para exponer una API interna (endpoints para acciones específicas).
 */
import express from "express";
import { authMiddleware } from "../../login/middlewares/accessDenied.js";
import {
  renderMembershipHome,
  renderMembershipCreate,
  renderEditMembership,
  renderRenewMembership,
} from "../controllers/membershipController.js";
import { reportsController } from "../controllers/reportsController.js";
import { MembershipController } from "../controllers/createMemberController.js";
import { listMembershipController } from "../controllers/listMemberController.js";
import { editMemberController } from "../controllers/editMemberController.js";
import { deleteMemberController } from "../controllers/deleteMemberController.js";

const routerMembership = express.Router();

// Middleware de autenticación global para todas las rutas de membresías.
// Asegura que solo usuarios autenticados puedan acceder a estas rutas.
routerMembership.use(authMiddleware);

// Helper para vincular el contexto 'this' de los controladores a sus métodos.
// Esto es crucial para que los métodos de una clase funcionen correctamente como manejadores de rutas en Express.
const bind = (controller, method) => controller[method].bind(controller);

// ===================================================================
// 1. RUTAS DE VISTAS (PÁGINAS) - Métodos GET que renderizan HTML
// ===================================================================

// Renderiza la vista principal con el listado de membresías.
routerMembership.get("/", renderMembershipHome);

// Renderiza el formulario para crear una nueva membresía.
routerMembership.get("/createMembership", renderMembershipCreate);

// Renderiza el formulario para editar una membresía existente.
routerMembership.get("/editMembership/:id", renderEditMembership);

// Renderiza el formulario para renovar una membresía.
routerMembership.get("/renew/:id", renderRenewMembership);

// Renderiza la página para la visualización de reportes.
routerMembership.get("/reports", bind(reportsController, "renderReports"));

// ===================================================================
// 2. RUTAS DE API Y DATOS - Endpoints para la API interna (JSON, archivos)
// ===================================================================

// GET: Obtiene la lista de membresías formateada para la tabla principal (consumido por el frontend).
routerMembership.get(
  "/listMembership",
  bind(listMembershipController, "renderMembershipList")
);

// GET: Obtiene los tipos de membresía (usado para poblar selects en el formulario de creación).
routerMembership.get(
  "/createMembership/tipos",
  bind(MembershipController, "renderTiposMembresia")
);

// GET: Sirve la imagen del código QR generada para una membresía.
routerMembership.get(
  "/api/qr/:id_activa",
  bind(MembershipController, "serveQRCode")
);

// GET: Permite la descarga del archivo de imagen del código QR.
routerMembership.get('/download-qr/:id_activa', MembershipController.downloadQR);

// POST: Calcula dinámicamente el precio y la fecha de fin de una membresía (para previsualizaciones).
routerMembership.post(
  "/api/calculate-details",
  bind(MembershipController, "calculateDetails")
);

// ===================================================================
// 3. RUTAS DE ACCIONES (FORMULARIOS) - Métodos POST, DELETE para CRUD
// ===================================================================

// POST: Crea la membresía completa (contrato, activación, integrantes, etc.).
routerMembership.post(
  "/createMembership",
  bind(MembershipController, "createMembership")
);
// POST: Actualiza los datos de una membresía existente.
routerMembership.post('/updateMembership/:id', editMemberController.updateMembership);

// POST: Procesa la renovación de una membresía.
routerMembership.post("/renew/:id", editMemberController.renewMembership);

// DELETE: Elimina una membresía de forma permanente.
routerMembership.delete("/delete/:id", deleteMemberController.deleteMembership);

// ===================================================================
// 4. RUTAS DE EJEMPLO / DESARROLLO
// ===================================================================

// GET: Ruta de ejemplo que comprueba si un método existe en el controlador antes de ejecutarlo.
// Útil para desarrollo progresivo o feature flags.
routerMembership.get("/tipos_membresia/:id", (req, res) => {
  if (MembershipController.getTipoMembresiaById) {
    return MembershipController.getTipoMembresiaById(req, res);
  }
  res.status(501).json({ error: "Not implemented" });
});

export { routerMembership as membershipRoutes };
