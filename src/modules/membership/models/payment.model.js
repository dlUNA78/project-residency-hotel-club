import { pool } from "../../../dataBase/conecctionDataBase.js";

export class PaymentModel {
  /**
   * Records a payment in the database.
   * @param {object} paymentData - The data for the payment.
   * @param {number} paymentData.activeMembershipId - The active membership ID.
   * @param {number} paymentData.paymentMethodId - The payment method ID.
   * @param {number} paymentData.amount - The amount paid.
   * @returns {Promise<number>} The ID of the newly created payment record.
   */
  static async create({ activeMembershipId, paymentMethodId, amount }) {
    try {
      const [result] = await pool.query(
        `INSERT INTO pagos (id_activa, id_metodo_pago, monto)
         VALUES (?, ?, ?)`,
        [activeMembershipId, paymentMethodId, amount]
      );

      if (!result || result.affectedRows === 0 || !result.insertId) {
        throw new Error("Could not record the payment in the database.");
      }

      return result.insertId;
    } catch (error) {
      console.error("Error in PaymentModel.create:", error);
      throw error;
    }
  }
}
