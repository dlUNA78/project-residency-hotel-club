// services/membershipService.js
import { MembershipModel } from "../models/membership.model.js";
import { sendReceiptEmail } from "../utils/nodeMailer.js"; // Will be refactored
import QRCode from "qrcode";
import path from "path";
import fs from "fs";

export const MembershipService = {

  async createMembershipContract(contractData) {
    return await MembershipModel.createMembershipContract(contractData);
  },

  async generateQRCode(qrPayload, activeMembershipId, holderName) {
    try {
      if (!qrPayload || qrPayload.trim() === "") {
        throw new Error("QR payload is empty or invalid");
      }
      const qrDir = path.join(process.cwd(), "public", "uploads", "qrs");
      if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true });
      }
      const cleanName = holderName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20);
      const qrFilename = `qr_${activeMembershipId}_${cleanName}.png`;
      const qrFullPath = path.join(qrDir, qrFilename);
      const qrWebPath = `/uploads/qrs/${qrFilename}`;

      await QRCode.toFile(qrFullPath, qrPayload, {
        errorCorrectionLevel: "H",
        type: "png",
        margin: 2,
        width: 300,
        color: { dark: "#16a34a", light: "#FFFFFF" },
        version: 10,
      });

      console.log(`✅ QR generated: ${qrWebPath}`);
      return qrWebPath;
    } catch (error) {
      console.error("❌ Error generating QR:", error);
      // Fallback mechanism can be improved or made more generic if needed
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  },

  async activateMembership(activationData) {
    return await MembershipModel.activateMembership(activationData);
  },

  async addFamilyMembers(activeMembershipId, members) {
    if (members && members.length > 0) {
      // Ensure data is in the format { fullName: '...' }
      const membersData = members.map((item) =>
        typeof item === 'string' ? { fullName: item } : { fullName: item.fullName || item.name || '' }
      );
      await MembershipModel.addFamilyMembers(activeMembershipId, membersData);
    }
  },

  async getMembershipDetails(clientId, membershipTypeId, activeMembershipId) {
    const [client, membershipType, members] = await Promise.all([
      MembershipModel.getClientById(clientId),
      MembershipModel.getMembershipTypeById(membershipTypeId),
      MembershipModel.getMembersByActiveMembershipId(activeMembershipId),
    ]);
    return { client, membershipType, members };
  },

  async generateQRPayload(client, membershipType, startDate, endDate, members = []) {
    try {
      const qrData = {
        id: client.clientId,
        name: client.fullName,
        membership: membershipType.name,
        start: startDate,
        end: endDate,
        members: members.length > 0 ? members.map((m) => m.fullName) : [],
      };
      const jsonString = JSON.stringify(qrData);

      if (jsonString.length > 4000) {
        console.warn("⚠️ QR data is very large, simplifying...");
        const simplifiedData = {
          id: client.clientId,
          n: client.fullName.substring(0, 30),
          m: membershipType.name.substring(0, 20),
          i: startDate,
          f: endDate,
        };
        return JSON.stringify(simplifiedData);
      }
      return jsonString;
    } catch (error) {
      console.error("❌ Error generating QR payload:", error);
      return JSON.stringify({
        id: client.clientId,
        name: client.fullName,
        error: "Payload generation failed",
      });
    }
  },

  async sendMembershipReceiptEmail(client, membershipType, startDate, endDate, members, paymentMethod, finalPrice) {
    if (client?.email) {
      await sendReceiptEmail({
        to: client.email,
        subject: "Membership Receipt - Hotel Club",
        holderName: client.fullName,
        membershipType: membershipType?.name || "N/A",
        startDate,
        endDate,
        paymentMethod: paymentMethod || "Not specified",
        finalPrice,
        members,
      });
    }
  },

  async updateMembershipQrPath(activeMembershipId, qrPath) {
    return await MembershipModel.updateQrPath(activeMembershipId, qrPath);
  },

  async recordPayment(paymentData) {
    return await MembershipModel.recordPayment(paymentData);
  },

  async getPaidMembershipDetails(activeMembershipId) {
    return await MembershipModel.getFullMembershipWithPayment(activeMembershipId);
  },

  async createFullMembership(data) {
    const { clientId, membershipTypeId, startDate, endDate, finalPrice, members, paymentMethodId } = data;

    const membershipId = await this.createMembershipContract({ clientId, membershipTypeId, startDate, endDate });
    const activeMembershipId = await this.activateMembership({ clientId, membershipId, startDate, endDate, finalPrice });
    await this.addFamilyMembers(activeMembershipId, members);

    const { client, membershipType, members: membersFromDB } = await this.getMembershipDetails(clientId, membershipTypeId, activeMembershipId);

    const qrPayload = await this.generateQRPayload(client, membershipType, startDate, endDate, membersFromDB);
    const qrPath = await this.generateQRCode(qrPayload, activeMembershipId, client.fullName);

    await this.updateMembershipQrPath(activeMembershipId, qrPath);

    if (paymentMethodId) {
      await this.recordPayment({ activeMembershipId, paymentMethodId, amount: finalPrice });
    }

    const completeMembership = await this.getPaidMembershipDetails(activeMembershipId);

    await this.sendMembershipReceiptEmail(
      client,
      membershipType,
      startDate,
      endDate,
      membersFromDB,
      completeMembership.paymentMethod,
      finalPrice
    );

    return {
      activeMembershipId,
      membershipId,
      holder: client.fullName,
      membershipType: membershipType.name,
      startDate,
      endDate,
      finalPrice: parseFloat(finalPrice),
      paymentMethod: completeMembership.paymentMethod || "Not specified",
      members: membersFromDB,
      qrPath,
    };
  },
};