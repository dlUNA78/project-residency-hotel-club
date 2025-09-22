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

  /**
   * Finds all payments associated with a given active membership ID.
   * @param {number} activeMembershipId - The active membership ID.
   * @returns {Promise<Array<object>>} A list of payment records.
   */
  static async findByMembershipId(activeMembershipId) {
    const [rows] = await pool.query(
      `
      SELECT p.id_pago as paymentId,
             p.fecha_pago as paymentDate,
             p.monto as amount,
             mp.nombre as paymentMethod
      FROM pagos p
      JOIN metodos_pago mp ON mp.id_metodo_pago = p.id_metodo_pago
      WHERE p.id_activa = ?
      ORDER BY p.fecha_pago DESC
    `,
      [activeMembershipId]
    );

    return rows;
  }

  static async deleteByActiveMembershipId(activeMembershipId, connection = pool) {
    await connection.query("DELETE FROM pagos WHERE id_activa = ?", [activeMembershipId]);
  }
}
