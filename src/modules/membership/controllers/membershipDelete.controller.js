import { MembershipService } from "../services/membership.service.js";

export class MembershipDeleteController {
  /**
   * Maneja la eliminación de una membresía.
   */
  static async handleDelete(req, res) {
    try {
      const { id } = req.params;
      await MembershipService.deleteCompleteMembership(id);
      res.json({ success: true, message: "Membership deleted successfully." });
    } catch (error) {
      console.error("Error deleting membership:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete membership.",
        details: error.message,
      });
    }
  }
}
