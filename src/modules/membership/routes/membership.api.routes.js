import express from "express";
import { authMiddleware } from "../../login/middlewares/accessDenied.js";
import { MembershipListController } from "../controllers/membershipList.controller.js";
import { MembershipReportsController } from "../controllers/membershipReports.controller.js";

const routerApi = express.Router();

// Middleware
routerApi.use(authMiddleware);

// === API Routes for client-side data fetching ===

// Get filtered list of memberships
// Final URL: GET /api/memberships/
routerApi.get("/", MembershipListController.getMembershipsApi);

// Get dashboard statistics
// Final URL: GET /api/memberships/statistics
routerApi.get("/statistics", MembershipListController.getStatsApi);

// Get family members for a specific membership
// Final URL: GET /api/memberships/:id/members
routerApi.get("/:id/members", MembershipListController.getFamilyMembersApi);

// Get a preview of report data
// Final URL: GET /api/memberships/reports/preview
routerApi.get("/reports/preview", MembershipReportsController.getReportPreview);

export { routerApi as membershipApiRoutes };
