import { ClientService } from "../services/clientService.js";
import { MembershipService } from "../services/membershipService.js";
import { ReportingService } from "../services/reporting.service.js";
import { MembershipModel } from "../models/membership.model.js"; // For simple lookups
import path from "path";
import fs from "fs";

/**
 * Controller for handling membership-related API requests.
 */
export const MembershipApiController = {

  /**
   * Gets all active memberships, with optional filtering and searching.
   */
  async getAllMemberships(req, res, next) {
    try {
      const { searchTerm, status, sort } = req.query;
      const filters = { searchTerm, status, sort };
      const memberships = await MembershipModel.getAllActive(filters);
      res.json(memberships);
    } catch (error) {
      console.error("Error fetching memberships:", error);
      next(error);
    }
  },

  /**
   * Creates a new client.
   */
  async createClient(req, res, next) {
    try {
      const { fullName, email, phone } = req.body;
      const result = await ClientService.createClient({ fullName, email, phone });
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating client:", error);
      next(error);
    }
  },

  /**
   * Creates a new membership.
   */
  async createMembership(req, res, next) {
    try {
      // Data is expected to come in with English names from the form
      const result = await MembershipService.createFullMembership(req.body);
      res.status(201).json({
        success: true,
        message: "Membership created successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error creating membership:", error);
      next(error);
    }
  },

  /**
   * Gets details for a specific membership type.
   */
  async getMembershipTypeById(req, res, next) {
    try {
      const { id } = req.params;
      const type = await MembershipModel.getMembershipTypeById(id); // Direct model call for simple lookup
      if (!type) {
        return res.status(404).json({ error: "Membership type not found" });
      }
      res.json(type);
    } catch (error) {
      console.error("Error getting membership type:", error);
      next(error);
    }
  },

  /**
   * Handles downloading a QR code file.
   */
  async downloadQrCode(req, res, next) {
    try {
      const { id } = req.params;
      const membership = await MembershipModel.getById(id);

      if (!membership?.qrPath) {
        return res.status(404).json({ error: "QR code not found in database" });
      }

      const qrFullPath = path.join(process.cwd(), "public", membership.qrPath);

      if (!fs.existsSync(qrFullPath)) {
        console.error("File not found at:", qrFullPath);
        return res.status(404).json({ error: "QR code file not found on server" });
      }

      const filename = `membership_${id}_qr.png`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "image/png");

      const fileStream = fs.createReadStream(qrFullPath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading QR code:", error);
      next(error);
    }
  },

  /**
   * Deletes a membership.
   */
  async deleteMembership(req, res, next) {
    try {
        const { id } = req.params;
        // A service method should be created for this to keep controllers thin
        await MembershipModel.deleteById(id);
        res.status(200).json({ success: true, message: 'Membership deleted successfully' });
    } catch (error) {
        console.error("Error deleting membership:", error);
        next(error);
    }
  },

  /**
   * Updates a membership.
   */
  async updateMembership(req, res, next) {
    try {
        const { id } = req.params;
        // A service method should be created for this
        await MembershipModel.updateById(id, req.body);
        res.status(200).json({ success: true, message: 'Membership updated successfully' });
    } catch (error) {
        console.error("Error updating membership:", error);
        next(error);
    }
  },

  /**
   * Gets a preview of the report data.
   */
  async getReportPreview(req, res, next) {
    try {
      const { period, date } = req.query;
      const reportData = await ReportingService.getReportData(period, date);
      res.json(reportData);
    } catch (error) {
      console.error("Error getting report preview:", error);
      // Pass status code from service if available
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  },

  /**
   * Generates and downloads a PDF report.
   */
  async downloadReportPdf(req, res, next) {
    try {
      const { period, date } = req.query;
      const reportData = await ReportingService.getReportData(period, date);
      const pdf = await ReportingService.generateReportPdf(reportData);

      const filename = `Report-${period}-${date}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      res.send(pdf);
    } catch (error) {
      console.error("Error generating PDF report:", error);
      // Redirect with an error message that the frontend can display
      res.redirect(`/reports?error=${encodeURIComponent(error.message)}`);
    }
  },
};
