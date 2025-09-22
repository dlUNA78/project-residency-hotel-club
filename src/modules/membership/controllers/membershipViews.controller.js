export class MembershipViewsController {
  /**
   * Renderiza la página principal del módulo de membresías.
   */
  static renderHomePage(req, res) {
    const userRole = req.session.user?.role || "Receptionist";
    const isAdmin = userRole === "Administrator";

    res.render("membership/membershipHome", {
      title: "Membership Area",
      isAdmin,
      userRole,
    });
  }
}
