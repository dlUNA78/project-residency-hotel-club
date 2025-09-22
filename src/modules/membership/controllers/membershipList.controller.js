import { MembershipModel } from "../models/membership.model.js";
import { ReportsModel } from "../models/reports.model.js";

export class MembershipListController {

  static async _getFormattedMemberships(filters) {
    const memberships = await MembershipModel.getAll(filters);

    return memberships.map(m => {
      let statusType = "Active";
      if (m.remainingDays < 0) {
        statusType = "Expired";
      } else if (m.remainingDays <= 7) {
        statusType = "Expiring";
      }

      return {
        ...m,
        statusType,
      };
    });
  }

  static async renderListPage(req, res) {
    try {
      const userRole = req.session.user?.role || "Receptionist";
      const isAdmin = userRole === "Administrator";

      const filters = {
        searchTerm: req.query.search,
        type: req.query.type,
        status: req.query.status,
      };

      const [memberships, stats] = await Promise.all([
        this._getFormattedMemberships(filters),
        ReportsModel.getDashboardStats()
      ]);

      res.render("membership/membershipList", {
        title: "Membership List",
        isAdmin,
        userRole,
        memberships,
        stats,
        currentSearch: filters.searchTerm || "",
        currentType: filters.type || "",
        currentStatus: filters.status || "",
      });
    } catch (error) {
      console.error("Error rendering membership list:", error);
      res.status(500).send("Error loading membership list.");
    }
  }

  static async getMembershipsApi(req, res) {
    try {
      const filters = {
        searchTerm: req.query.search,
        type: req.query.type,
        status: req.query.status,
      };
      const memberships = await this._getFormattedMemberships(filters);
      res.json({ success: true, data: memberships });
    } catch (error) {
      console.error("Error in getMembershipsApi:", error);
      res.status(500).json({ success: false, message: "Failed to get memberships." });
    }
  }

  static async getStatsApi(req, res) {
    try {
      const stats = await ReportsModel.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("Error in getStatsApi:", error);
      res.status(500).json({ success: false, message: "Failed to get statistics." });
    }
  }

  static async getFamilyMembersApi(req, res) {
    try {
      const { id } = req.params;
      const members = await MembershipModel.findMembersByActiveId(id);
      res.json({ success: true, data: members });
    } catch (error)      {
      console.error("Error in getFamilyMembersApi:", error);
      res.status(500).json({ success: false, message: "Failed to get family members." });
    }
  }
}
