import { ClientService } from "../services/client.service.js";
import { MembershipService } from "../services/membership.service.js";

export class MembershipCreationController {
  /**
   * Renders the page for creating a new membership.
   */
  static async renderCreationPage(req, res) {
    try {
      const userRole = req.session.user?.role || "Recepcionista";
      const isAdmin = userRole === "Administrador";

      const pageData = await MembershipService.getCreationPageData();

      res.render("membership/createMembership", {
        title: "Create Membership",
        showFooter: true,
        isAdmin,
        userRole,
        membershipTypes: pageData.membershipTypes,
        paymentMethods: pageData.paymentMethods,
        apiBase: "/memberships",
      });
    } catch (error) {
      console.error("Error rendering membership creation page:", error);
      res.status(500).send("Error loading the page.");
    }
  }

  /**
   * Handles the creation of a new client.
   */
  static async handleClientCreation(req, res) {
    try {
      const { nombre_completo, correo, telefono } = req.body;
      const result = await ClientService.create({
        fullName: nombre_completo,
        email: correo,
        phone: telefono,
      });
      res.json(result);
    } catch (err) {
      console.error("Error in handleClientCreation:", err);
      res
        .status(500)
        .json({ error: "Error creating the client.", details: err.message });
    }
  }

  /**
   * Handles the creation of a new membership.
   */
  static async handleMembershipCreation(req, res) {
    try {
      // The body names are still in Spanish from the form
      const {
        id_cliente,
        id_tipo_membresia,
        fecha_inicio,
        fecha_fin,
        precio_final,
        integrantes, // This is an array of strings
        metodo_pago,
      } = req.body;

      const membershipData = {
        clientId: Number(id_cliente),
        membershipTypeId: Number(id_tipo_membresia),
        startDate: fecha_inicio,
        endDate: fecha_fin,
        finalPrice: parseFloat(precio_final),
        familyMembers: integrantes || [],
        paymentMethodId: Number(metodo_pago),
      };

      const result = await MembershipService.createCompleteMembership(membershipData);

      res.json({
        success: true,
        message: "Membership created successfully.",
        data: result,
      });

    } catch (err) {
      console.error("Error in handleMembershipCreation:", err);
      res.status(500).json({
        success: false,
        message: "Failed to create membership.",
        error: err.message,
      });
    }
  }
}
