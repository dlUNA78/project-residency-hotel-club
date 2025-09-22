import express from "express";
import { authMiddleware } from "../../login/middlewares/accessDenied.js";
import { MembershipListController } from "../controllers/membershipList.controller.js";
import { MembershipReportsController } from "../controllers/membershipReports.controller.js";

const routerApi = express.Router();
routerApi.use(authMiddleware);

// API route to get a filtered list of memberships
routerApi.get("/", MembershipListController.getMembershipsApi);

// API route to get dashboard statistics
routerApi.get("/statistics", MembershipListController.getStatsApi);

// API route to get family members for a specific membership
routerApi.get("/:id/members", MembershipListController.getFamilyMembersApi);

// API route to get a preview of report data
routerApi.get("/reports/preview", MembershipReportsController.getReportPreview);

export { routerApi as membershipApiRoutes };
