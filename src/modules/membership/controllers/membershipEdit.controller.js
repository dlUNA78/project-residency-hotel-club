import { MembershipModel } from "../models/membership.model.js";
import { PaymentModel } from "../models/payment.model.js";
import { MembershipService } from "../services/membership.service.js";

export class MembershipEditController {
  /**
   * Renderiza la página para editar una membresía.
   */
  static async renderEditPage(req, res) {
    try {
      const { id } = req.params;
      const membership = await MembershipModel.findById(id);
      if (!membership) {
        return res.status(404).send("Membership not found");
      }
      res.render("membership/editMembership", { membership });
    } catch (err) {
      console.error("Error getting membership for edit:", err);
      res.status(500).send("Server error");
    }
  }

  /**
   * Renderiza la página para renovar una membresía.
   */
  static async renderRenewalPage(req, res) {
    try {
      const userRole = req.session.user?.role || "Receptionist";
      const isAdmin = userRole === "Administrator";
      const { id } = req.params;

      const [membership, membershipTypes, paymentMethods] = await Promise.all([
        MembershipModel.findById(id),
        MembershipModel.getMembershipTypes(),
        PaymentModel.getPaymentMethods()
      ]);

      if (!membership) {
        return res.status(404).send("Membership not found");
      }

      res.render("membership/renewalMembership", {
        title: "Renew Membership",
        isAdmin,
        userRole,
        membership,
        membershipTypes,
        paymentMethods,
      });
    } catch (error) {
      console.error("Error loading renewal page:", error);
      res.status(500).send("Error loading page");
    }
  }

  /**
   * Maneja la actualización de una membresía.
   */
  static async handleUpdate(req, res) {
    try {
      const { id } = req.params;
      const {
        nombre_completo, telefono, correo, estado,
        fecha_inicio, fecha_fin, precio_final,
        integrantes, id_cliente
      } = req.body;

      const updateData = {
        clientId: id_cliente,
        clientData: { fullName: nombre_completo, phone: telefono, email: correo },
        membershipData: { estado, fecha_inicio, fecha_fin, precio_final: parseFloat(precio_final) },
        familyMembers: integrantes ? integrantes.map(name => ({ fullName: name })) : []
      };

      await MembershipService.updateCompleteMembership(id, updateData);
      res.redirect("/memberships/list?success=Membership+updated+successfully");
    } catch (error) {
      console.error("Error updating membership:", error);
      res.redirect(`/memberships/edit/${req.params.id}?error=Failed+to+update`);
    }
  }

  /**
   * Maneja la renovación de una membresía.
   */
  static async handleRenewal(req, res) {
    try {
      const { id } = req.params; // Old active membership ID
      const {
        id_cliente, nombre_completo, telefono, correo,
        id_tipo_membresia, fecha_inicio, fecha_fin, id_metodo_pago,
      } = req.body;

      const renewalData = {
          clientId: id_cliente,
          clientData: { fullName: nombre_completo, phone: telefono, email: correo },
          membershipTypeId: id_tipo_membresia,
          startDate: fecha_inicio,
          endDate: fecha_fin,
          paymentMethodId: id_metodo_pago
      };

      await MembershipService.renewMembership(id, renewalData);
      res.redirect("/memberships/list?success=Membership+renewed+successfully");
    } catch (error) {
      console.error("Error renewing membership:", error);
      res.redirect(`/memberships/renew/${req.params.id}?error=Failed+to+renew`);
    }
  }
}
