import { ClientModel } from "../models/client.model.js";
import { MembershipModel } from "../models/membership.model.js";
import { PaymentModel } from "../models/payment.model.js";
import { sendReceiptEmail } from "../utils/nodeMailer.js";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";

export class MembershipService {
  /**
   * Orchestrates the complete creation of a membership.
   * @param {object} data - The full data for creating the membership.
   * @returns {Promise<object>} The details of the created membership for the response.
   */
  static async createCompleteMembership(data) {
    // 1. Create membership contract
    const contractId = await MembershipModel.createContract({
      clientId: data.clientId,
      membershipTypeId: data.membershipTypeId,
      startDate: data.startDate,
      endDate: data.endDate,
    });

    // 2. Activate membership
    const activeMembershipId = await MembershipModel.activate({
      clientId: data.clientId,
      membershipId: contractId,
      startDate: data.startDate,
      endDate: data.endDate,
      finalPrice: data.finalPrice,
    });

    // 3. Add family members if any
    if (data.familyMembers && data.familyMembers.length > 0) {
      const members = data.familyMembers.map(name => ({ fullName: name }));
      await MembershipModel.addFamilyMembers(activeMembershipId, members);
    }

    // 4. Get data for QR and email
    const [client, membershipType] = await Promise.all([
      ClientModel.findById(data.clientId),
      MembershipModel.findTypeById(data.membershipTypeId),
    ]);

    // 5. Generate QR payload and file
    const qrPayload = this._generateQrPayload(client, membershipType, data.startDate, data.endDate, data.familyMembers);
    const qrCodePath = await this._generateQrCodeFile(qrPayload, activeMembershipId, client.fullName);

    // 6. Update membership with QR path
    await MembershipModel.updateQrPath(activeMembershipId, qrCodePath);

    // 7. Record payment
    if (data.paymentMethodId) {
      await PaymentModel.create({
        activeMembershipId,
        paymentMethodId: data.paymentMethodId,
        amount: data.finalPrice,
      });
    }

    // 8. Get final details for receipt
    const finalMembershipDetails = await MembershipModel.getFullMembershipWithPayment(activeMembershipId);

    // 9. Send receipt email
    await this._sendReceiptEmail(client, finalMembershipDetails);

    // 10. Return data for the controller's response
    return {
        activeMembershipId,
        contractId,
        clientName: client.fullName,
        membershipTypeName: membershipType.name,
        startDate: data.startDate,
        endDate: data.endDate,
        finalPrice: data.finalPrice,
        paymentMethod: finalMembershipDetails.paymentMethod || "Not specified",
        familyMembers: finalMembershipDetails.familyMembers,
        qrPath: qrCodePath
    };
  }

  static async getCreationPageData() {
    const [membershipTypes, paymentMethods] = await Promise.all([
      MembershipModel.getMembershipTypes(),
      MembershipModel.getPaymentMethods(),
    ]);
    return { membershipTypes, paymentMethods };
  }

  /**
   * @private
   */
  static _generateQrPayload(client, membershipType, startDate, endDate, familyMembers = []) {
    const qrData = {
      clientId: client.clientId,
      name: client.fullName,
      membership: membershipType.name,
      start: startDate,
      end: endDate,
      members: familyMembers.length > 0 ? familyMembers : [],
    };
    return JSON.stringify(qrData);
  }

  /**
   * @private
   */
  static async _generateQrCodeFile(qrData, membershipId, clientName) {
    try {
      if (!qrData || qrData.trim() === '') {
        throw new Error('QR data cannot be empty.');
      }

      const qrDir = path.join(process.cwd(), 'public', 'uploads', 'qrs');
      if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true });
      }

      const cleanName = clientName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      const qrFilename = `qr_${membershipId}_${cleanName}.png`;
      const qrFullPath = path.join(qrDir, qrFilename);
      const qrWebPath = `/uploads/qrs/${qrFilename}`;

      await QRCode.toFile(qrFullPath, qrData, {
        errorCorrectionLevel: 'H',
        type: 'png',
        margin: 2,
        width: 300,
        color: { dark: '#16a34a', light: '#FFFFFF' },
      });

      return qrWebPath;

    } catch (error) {
      console.error('Error generating QR code:', error);
      // In case of error, we don't want to halt the entire process,
      // but we should not return a path that failed.
      // The controller can decide what to do if the path is null.
      return null;
    }
  }

  /**
   * @private
   */
  static async _sendReceiptEmail(client, membershipDetails) {
    if (client?.email) {
      try {
        await sendReceiptEmail({
          to: client.email,
          subject: "Membership Receipt - Hotel Club",
          clientName: client.fullName,
          membershipTypeName: membershipDetails.membershipTypeName,
          startDate: membershipDetails.startDate,
          endDate: membershipDetails.endDate,
          paymentMethod: membershipDetails.paymentMethod,
          finalPrice: membershipDetails.finalPrice,
          familyMembers: membershipDetails.familyMembers,
        });
      } catch(error) {
        console.error(`Failed to send receipt email to ${client.email}:`, error);
        // Do not rethrow; failing to send an email should not fail the transaction.
      }
    }
  }
}