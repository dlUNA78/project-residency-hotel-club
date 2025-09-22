import express from "express";
import { authMiddleware } from "../../login/middlewares/accessDenied.js";
import { MembershipViewsController } from "../controllers/membershipController.js";
import { MembershipCreationController } from "../controllers/membershipCreation.controller.js";
import { MembershipListController } from "../controllers/membershipList.controller.js";
import { MembershipEditController } from "../controllers/membershipEdit.controller.js";
import { MembershipDeleteController } from "../controllers/membershipDelete.controller.js";
import { MembershipReportsController } from "../controllers/membershipReports.controller.js";

const router = express.Router();
router.use(authMiddleware);

// === Page-Rendering Routes (GET) ===
router.get("/", MembershipViewsController.renderHomePage);
router.get("/list", MembershipListController.renderListPage);
router.get("/create", MembershipCreationController.renderCreationPage);
router.get("/edit/:id", MembershipEditController.renderEditPage);
router.get("/renew/:id", MembershipEditController.renderRenewalPage);
router.get("/reports", MembershipReportsController.renderReportsPage);

// === Form Action Routes (POST, DELETE) ===
router.post("/client", MembershipCreationController.handleClientCreation);
router.post("/membership", MembershipCreationController.handleMembershipCreation);
router.post("/edit/:id", MembershipEditController.handleUpdate);
router.post("/renew/:id", MembershipEditController.handleRenewal);
router.delete("/:id", MembershipDeleteController.handleDelete);

// === API Routes (for client-side fetching) ===
router.get("/api/memberships", MembershipListController.getMembershipsApi);
router.get("/api/stats", MembershipListController.getStatsApi);
router.get("/api/members/:id", MembershipListController.getFamilyMembersApi);

// === PDF Download Route ===
router.get("/download/report", MembershipReportsController.downloadReportPdf);

export { router as membershipRoutes };
