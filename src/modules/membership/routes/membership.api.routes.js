import express from 'express';
import { MembershipApiController } from '../controllers/membership.api.controller.js';
import { requireAdmin } from '../../../middlewares/auth/roleHandler.js';

const router = express.Router();

// Get all memberships (with filtering)
router.get('/', MembershipApiController.getAllMemberships);

// Create a new client
router.post('/client', MembershipApiController.createClient);

// Create a new membership
router.post('/', MembershipApiController.createMembership);

// Get a single membership type's details
router.get('/type/:id', MembershipApiController.getMembershipTypeById);

// Download a QR code
router.get('/download-qr/:id', MembershipApiController.downloadQrCode);

// Update a membership (Admin only)
router.put('/:id', requireAdmin, MembershipApiController.updateMembership);

// Delete a membership (Admin only)
router.delete('/:id', requireAdmin, MembershipApiController.deleteMembership);

// --- Reporting Routes (Admin only) ---
router.get('/reports/preview', requireAdmin, MembershipApiController.getReportPreview);
router.get('/reports/download', requireAdmin, MembershipApiController.downloadReportPdf);


export { router as membershipApiRoutes };
