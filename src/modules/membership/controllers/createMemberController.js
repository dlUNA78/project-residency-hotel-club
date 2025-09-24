// controllers/createMemberController.js
import { ClientService } from "../services/clientService.js";
import { MembershipService } from "../services/membershipService.js";
import { MembershipModel } from "../models/membershipModel.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const MembershipController = {
  // Crear cliente principal
  async createClient(req, res) {
    try {
      const { fullName, email, phone } = req.body;
      const result = await ClientService.createClient({
        fullName,
        email,
        phone,
      });
      res.json(result);
    } catch (err) {
      console.error("Error en createClient:", err);
      res
        .status(500)
        .json({ error: "Error al crear el cliente", details: err.message });
    }
  },

  // Crear membresía (familiar o individual)
  async createMembership(req, res) {
    try {
      const {
        clientId,
        membershipTypeId,
        startDate,
        endDate,
        finalPrice,
        familyMembers,
        paymentMethodId,
      } = req.body;

      const membershipId = await MembershipService.createMembershipContract({
        clientId,
        membershipTypeId,
        startDate,
        endDate,
      });

      const activeMembershipId = await MembershipService.activateMembership({
        clientId,
        membershipId,
        startDate,
        endDate,
        finalPrice,
      });

      await MembershipService.addFamilyMembers(activeMembershipId, familyMembers);

      const { client, type, familyMembers: membersFromDB } =
        await MembershipService.getMembershipDetailsForCreation(
          clientId,
          membershipTypeId,
          activeMembershipId
        );

      const qrPayload = await MembershipService.generateQRPayload(
        client,
        type,
        startDate,
        endDate,
        membersFromDB
      );

      const qrPath = await MembershipService.generateQRCode(
        qrPayload,
        activeMembershipId,
        client.fullName
      );

      await MembershipModel.updateQRPath(activeMembershipId, qrPath);

      if (paymentMethodId) {
        await MembershipModel.recordPayment({
          activeMembershipId,
          paymentMethodId,
          amount: finalPrice,
        });
      }

      const fullMembership = await MembershipModel.getMembresiaConPago(
        activeMembershipId
      );

      await MembershipService.sendMembershipReceiptEmail({
        client,
        type,
        startDate,
        endDate,
        familyMembers: membersFromDB,
        paymentMethod: fullMembership.metodo_pago,
        finalPrice,
      });

      res.json({
        success: true,
        message: "Membresía creada exitosamente",
        data: {
          activeMembershipId,
          membershipId,
          holder: client.fullName,
          membershipType: type.name,
          startDate,
          endDate,
          finalPrice: parseFloat(finalPrice),
          paymentMethod: fullMembership.metodo_pago || "No especificado",
          familyMembers: membersFromDB,
          qrPath,
        },
      });
    } catch (err) {
      console.error("Error en createMembership:", err);
      res.status(500).json({
        success: false,
        message: "Error al crear la membresía",
        error: err.message,
      });
    }
  },

  // Método para descargar el QR - CORREGIDO para usar uploads/qrs/
  // Método para descargar el QR - CORREGIDO para usar public/uploads/qrs/
  async downloadQr(req, res) {
    try {
      const { activeMembershipId } = req.params;
      const membership = await MembershipModel.getMembresiaById(activeMembershipId);

      if (!membership || !membership.qr_path) {
        return res
          .status(404)
          .json({ error: "QR not found in database" });
      }

      const qrFullPath = path.join(process.cwd(), "public", membership.qr_path);

      if (!fs.existsSync(qrFullPath)) {
        console.error("File not found at:", qrFullPath);
        return res
          .status(404)
          .json({ error: "QR file not found on server" });
      }

      const filename = `membership_${activeMembershipId}_qr.png`;

      // Configurar headers para descarga
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Type", "image/png");

      // Enviar el archivo
      const fileStream = fs.createReadStream(qrFullPath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error al descargar QR:", error);
      res.status(500).json({ error: "Error al descargar el QR" });
    }
  },

  async getMembershipTypeById(req, res) {
    try {
      const { id } = req.params;
      const type = await MembershipModel.getMembershipTypeById(id);
      if (!type)
        return res.status(404).json({ error: "Membership type not found" });
      res.json(type);
    } catch (err) {
      console.error("Error getting membership type:", err);
      res.status(500).json({ error: "Server error" });
    }
  },

  async renderCreatePage(req, res) {
    try {
      const userRole = req.session.user?.role || "Recepcionista";
      const isAdmin = userRole === "Administrador";
      const membershipTypes = await MembershipModel.getMembershipTypes();
      const paymentMethods = await MembershipModel.getPaymentMethods();
      const familyPrice = await MembershipModel.getPrecioFamiliar?.(); // This method is out of scope for now

      res.render("membershipCreate", {
        title: "Crear Membresía",
        showFooter: true,
        isAdmin,
        userRole,
        membershipTypes,
        paymentMethods,
        familyPrice,
        apiBase: "/memberships",
      });
    } catch (error) {
      console.error("Error loading create membership page:", error);
      res.status(500).send("Error loading page");
    }
  },
};

export { MembershipController };
