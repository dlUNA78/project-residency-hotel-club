import { MembershipModel } from "../models/membership.model.js";

/**
 * Controller for rendering membership-related views.
 */
export const MembershipViewController = {
  /**
   * Renders the membership module's home page.
   */
  renderHomePage(req, res) {
    res.render("membershipHome", {
      title: "Membership Area",
    });
  },

  /**
   * Renders the page that lists all memberships.
   */
  renderListPage(req, res) {
    res.render("membershipList", {
      title: "Membership List",
      apiBase: "/memberships", // This could be passed to the client-side JS
    });
  },

  /**
   * Renders the page for creating a new membership.
   */
  async renderCreatePage(req, res, next) {
    try {
      const [membershipTypes, paymentMethods] = await Promise.all([
        MembershipModel.getMembershipTypes(),
        MembershipModel.getPaymentMethods(),
      ]);

      res.render("membershipCreate", {
        title: "Create Membership",
        membershipTypes,
        paymentMethods,
      });
    } catch (error) {
      console.error("Error loading the create membership page:", error);
      next(error);
    }
  },

  /**
   * Renders the page for renewing an existing membership.
   */
  async renderRenewPage(req, res, next) {
    try {
      const { id } = req.params;
      const [membership, membershipTypes, paymentMethods] = await Promise.all([
        MembershipModel.getById(id),
        MembershipModel.getMembershipTypes(),
        MembershipModel.getPaymentMethods(),
      ]);

      if (!membership) {
        return res.status(404).render("error404");
      }

      res.render("renewalMembership", {
        title: "Renew Membership",
        membership,
        membershipTypes,
        paymentMethods,
      });
    } catch (error) {
      console.error("Error loading the renew membership page:", error);
      next(error);
    }
  },

  /**
   * Renders the page for editing an existing membership.
   */
  async renderEditPage(req, res, next) {
    try {
      const { id } = req.params;
       const [membership, membershipTypes] = await Promise.all([
        MembershipModel.getById(id),
        MembershipModel.getMembershipTypes(),
      ]);

      if (!membership) {
        return res.status(404).render("error404");
      }

      res.render("editMembership", {
        title: "Edit Membership",
        membership,
        membershipTypes,
      });
    } catch (error) {
      console.error("Error loading the edit membership page:", error);
      next(error);
    }
  },

  /**
   * Renders the reports page.
   * (Authorization is handled by middleware).
   */
  renderReportsPage(req, res) {
    res.render("reports", {
      title: "Generate Reports",
    });
  },
};
