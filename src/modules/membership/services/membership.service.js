import { ClientModel } from "../models/client.model.js";
import { MembershipModel } from "../models/membership.model.js";
import { PaymentModel } from "../models/payment.model.js";
import { pool } from "../../../dataBase/conecctionDataBase.js";
import { sendReceiptEmail } from "../utils/nodeMailer.js";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";

export class MembershipService {

  /**
   * Orquesta la creación completa de una membresía, incluyendo contrato, activación,
   * miembros, QR, pago y correo de confirmación.
   * @param {object} data - Datos completos para la creación.
   * @returns {Promise<object>} Los detalles de la membresía creada.
   */
  static async createCompleteMembership(data) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const contractId = await MembershipModel.createContract({ ...data, connection });
      const activeMembershipId = await MembershipModel.activate({ ...data, membershipId: contractId, connection });

      if (data.familyMembers && data.familyMembers.length > 0) {
        await MembershipModel.addFamilyMembers(activeMembershipId, data.familyMembers.map(name => ({ fullName: name })), connection);
      }

      const client = await ClientModel.findById(data.clientId, connection);
      const membershipType = await MembershipModel.findTypeById(data.membershipTypeId, connection);
      const qrPayload = this._generateQrPayload(client, membershipType, data.startDate, data.endDate, data.familyMembers);
      const qrCodePath = await this._generateQrCodeFile(qrPayload, activeMembershipId, client.fullName);

      await MembershipModel.updateQrPath(activeMembershipId, qrCodePath, connection);

      if (data.paymentMethodId) {
        await PaymentModel.create({ activeMembershipId, paymentMethodId: data.paymentMethodId, amount: data.finalPrice, connection });
      }

      // Se omite el envío de email dentro de la transacción para no ralentizarla.
      // Se podría mover a una cola de trabajos o realizarse después del commit.

      await connection.commit();

      // Enviar email después de que la transacción ha sido exitosa
      // this._sendReceiptEmail(client, ...);

      return { activeMembershipId, qrPath: qrCodePath, ... }; // Devolver datos relevantes
    } catch (error) {
      await connection.rollback();
      console.error("Error en MembershipService.createCompleteMembership:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Orquesta la actualización completa de una membresía.
   */
  static async updateCompleteMembership(activeMembershipId, data) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await ClientModel.update({ ...data.clientData, clientId: data.clientId, connection });
      await MembershipModel.update(activeMembershipId, data.membershipData, connection);
      if (data.familyMembers) {
        await MembershipModel.rebuildFamilyMembers(activeMembershipId, data.familyMembers, connection);
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error("Error en MembershipService.updateCompleteMembership:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Orquesta la renovación de una membresía.
   */
  static async renewMembership(oldMembershipId, renewalData) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await ClientModel.update({ ...renewalData.clientData, connection });
        await MembershipModel.updateStatus(oldMembershipId, 'Vencida', connection);

        const newContractId = await MembershipModel.createContract({ ...renewalData, connection });
        const membershipType = await MembershipModel.findTypeById(renewalData.membershipTypeId, connection);
        const finalPrice = membershipType.precio;
        const newActiveId = await MembershipModel.activate({ ...renewalData, membershipId: newContractId, finalPrice, connection });

        await PaymentModel.create({ activeMembershipId: newActiveId, paymentMethodId: renewalData.paymentMethodId, amount: finalPrice, connection });

        await connection.commit();
        return { newActiveId };
      } catch (error) {
        await connection.rollback();
        console.error("Error en MembershipService.renewMembership:", error);
        throw error;
      } finally {
        connection.release();
      }
  }

  /**
   * Orquesta la eliminación completa de una membresía y sus datos asociados.
   */
  static async deleteCompleteMembership(activeMembershipId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const membership = await MembershipModel.findById(activeMembershipId, connection);
      if (!membership) throw new Error("Membresía no encontrada");

      await PaymentModel.deleteByActiveMembershipId(activeMembershipId, connection);
      await MembershipModel.deleteFamilyMembersByActiveId(activeMembershipId, connection);
      const { contractId } = await MembershipModel.deleteActiveById(activeMembershipId, connection);
      if (contractId) {
        await MembershipModel.deleteContractById(contractId, connection);
      }
      const otherMembershipsCount = await MembershipModel.countActiveByClientId(membership.clientId, connection);
      if (otherMembershipsCount === 0) {
        await ClientModel.deleteById(membership.clientId, connection);
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      console.error("Error en MembershipService.deleteCompleteMembership:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Métodos privados de ayuda
  static _generateQrPayload(client, membershipType, startDate, endDate, familyMembers = []) {
    const qrData = {
      id: client.clientId,
      n: client.fullName,
      m: membershipType.nombre,
      s: startDate,
      e: endDate,
      fm: familyMembers.length > 0 ? familyMembers.map(i => i.nombre_completo) : []
    };
    return JSON.stringify(qrData);
  }

  static async _generateQrCodeFile(qrData, membershipId, clientName) {
    try {
      const qrDir = path.join(process.cwd(), 'public', 'uploads', 'qrs');
      if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

      const cleanName = clientName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      const qrFilename = `qr_${membershipId}_${cleanName}.png`;
      const qrFullPath = path.join(qrDir, qrFilename);
      const qrWebPath = `/uploads/qrs/${qrFilename}`;

      await QRCode.toFile(qrFullPath, qrData, {
        errorCorrectionLevel: 'H', type: 'png', margin: 2, width: 300,
        color: { dark: '#16a34a', light: '#FFFFFF' },
      });
      return qrWebPath;
    } catch (error) {
      console.error('Error generando archivo QR:', error);
      return null;
    }
  }
}
