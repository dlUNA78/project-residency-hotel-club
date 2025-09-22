export class MembershipViewsController {
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


