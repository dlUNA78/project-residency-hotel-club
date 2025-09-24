// services/membershipService.js
import { MembershipModel } from "../models/membershipModel.js";
import { sendReceiptEmail } from "../utils/nodeMailer.js";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";

export const MembershipService = {
  async createMembershipContract(contractData) {
    const { clientId, membershipTypeId, startDate, endDate } = contractData;
    return await MembershipModel.createMembershipContract({
      clientId,
      membershipTypeId,
      startDate,
      endDate,
    });
  },

  async generateQRCode(qrData, membershipId, holderName) {
    try {
      if (!qrData || qrData.trim() === "") {
        throw new Error("QR data is empty or invalid");
      }
      const qrDir = path.join(process.cwd(), "public", "uploads", "qrs");
      if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true });
      }
      const cleanName = holderName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20);
      const qrFilename = `qr_${membershipId}_${cleanName}.png`;
      const qrFullPath = path.join(qrDir, qrFilename);
      const qrWebPath = `/uploads/qrs/${qrFilename}`;
      await QRCode.toFile(qrFullPath, qrData, {
        errorCorrectionLevel: "H",
        type: "png",
        margin: 2,
        width: 300,
        color: { dark: "#16a34a", light: "#FFFFFF" },
        version: 10,
      });
      return qrWebPath;
    } catch (error) {
      console.error("Error generating QR:", error);
      // Fallback mechanism
      try {
        const fallbackData = JSON.stringify({ id: membershipId, t: "Membership", d: new Date().toISOString().split("T")[0] });
        const qrDir = path.join(process.cwd(), "public", "uploads", "qrs");
        const cleanName = holderName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20);
        const qrFilename = `qr_${membershipId}_${cleanName}_fallback.png`;
        const qrFullPath = path.join(qrDir, qrFilename);
        const qrWebPath = `/uploads/qrs/${qrFilename}`;
        await QRCode.toFile(qrFullPath, fallbackData, {
          errorCorrectionLevel: "H",
          type: "png",
          margin: 2,
          width: 300,
          color: { dark: "#16a34a", light: "#FFFFFF" },
        });
        return qrWebPath;
      } catch (fallbackError) {
        throw new Error(`Failed to generate QR: ${error.message}`);
      }
    }
  },

  async activateMembership(activationData) {
    const { clientId, membershipId, startDate, endDate, finalPrice } = activationData;
    return await MembershipModel.activateMembership({
      clientId,
      membershipId,
      startDate,
      endDate,
      finalPrice,
    });
  },

  async addFamilyMembers(activeMembershipId, familyMembers) {
    if (!familyMembers || familyMembers.length === 0) {
      return;
    }
    const membersData = familyMembers.map((item) => ({
      fullName: typeof item === "string" ? item : item.fullName || "",
    }));
    await MembershipModel.addFamilyMembers(activeMembershipId, membersData);
  },

  async getMembershipDetailsForCreation(clientId, membershipTypeId, activeMembershipId) {
    const [client, type, familyMembers] = await Promise.all([
      MembershipModel.getClientById(clientId),
      MembershipModel.getMembershipTypeById(membershipTypeId),
      MembershipModel.getFamilyMembersByMembershipId(activeMembershipId),
    ]);
    return { client, type, familyMembers };
  },

  async generateQRPayload(client, type, startDate, endDate, familyMembers = []) {
    // The keys in this object (id, nombre, etc.) are part of the QR "contract"
    // and should not be changed to maintain compatibility with QR readers.
    const qrData = {
      id: client.clientId,
      nombre: client.fullName,
      membresia: type.name,
      inicio: startDate,
      fin: endDate,
      integrantes: familyMembers.map((i) => i.fullName),
    };
    return JSON.stringify(qrData);
  },

  async sendMembershipReceiptEmail(emailData) {
    const { client, type, startDate, endDate, familyMembers, paymentMethod, finalPrice } = emailData;
    if (client?.email) {
      await sendReceiptEmail({
        to: client.email,
        subject: "Comprobante de Membresía - Hotel Club",
        holderName: client.fullName,
        membershipType: type?.name || "N/D",
        startDate,
        endDate,
        paymentMethod: paymentMethod || "No especificado",
        finalPrice,
        familyMembers,
      });
    }
  },
};