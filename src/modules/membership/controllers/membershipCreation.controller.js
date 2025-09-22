import { ClientService } from "../services/client.service.js";
import { MembershipService } from "../services/membership.service.js";
import { MembershipModel } from "../models/membership.model.js"; // For getMembershipTypes
import { PaymentModel } from "../models/payment.model.js"; // For getPaymentMethods

export class MembershipCreationController {
  /**
   * Renderiza la página para crear una nueva membresía.
   */
  static async renderCreationPage(req, res) {
    try {
      const userRole = req.session.user?.role || "Receptionist";
      const isAdmin = userRole === "Administrator";

      const [membershipTypes, paymentMethods] = await Promise.all([
        MembershipModel.getMembershipTypes(),
        PaymentModel.getPaymentMethods()
      ]);

      res.render("membership/createMembership", {
        title: "Create Membership",
        showFooter: true,
        isAdmin,
        userRole,
        membershipTypes,
        paymentMethods,
        apiBase: "/memberships",
      });
    } catch (error) {
      console.error("Error rendering membership creation page:", error);
      res.status(500).send("Error loading the page.");
    }
  }

  /**
   * Maneja la creación de un nuevo cliente.
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
        .json({ error: "Error al crear el cliente.", details: err.message });
    }
  }

  /**
   * Maneja la creación de una nueva membresía.
   */
  static async handleMembershipCreation(req, res) {
    try {
      const {
        id_cliente,
        id_tipo_membresia,
        fecha_inicio,
        fecha_fin,
        precio_final,
        integrantes,
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
        message: "Membresía creada exitosamente.",
        data: result,
      });
    } catch (err) {
      console.error("Error in handleMembershipCreation:", err);
      res.status(500).json({
        success: false,
        message: "Error al crear la membresía.",
        error: err.message,
      });
    }
  }
}
