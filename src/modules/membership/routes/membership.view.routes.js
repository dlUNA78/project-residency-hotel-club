import express from 'express';
import { MembershipViewController } from '../controllers/membership.view.controller.js';
import { setRoleLocals, requireAdmin } from '../../../middlewares/auth/roleHandler.js';

const router = express.Router();

// Apply role middleware to all view routes
router.use(setRoleLocals);

// Define view routes
router.get('/', MembershipViewController.renderHomePage);
router.get('/list', MembershipViewController.renderListPage);
router.get('/create', MembershipViewController.renderCreatePage);
router.get('/edit/:id', MembershipViewController.renderEditPage);
router.get('/renew/:id', MembershipViewController.renderRenewPage);

// Secure the reports page to be admin-only
router.get('/reports', requireAdmin, MembershipViewController.renderReportsPage);

export { router as membershipViewRoutes };
