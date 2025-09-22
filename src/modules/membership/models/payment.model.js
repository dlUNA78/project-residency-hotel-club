import { pool } from "../../../dataBase/conecctionDataBase.js";

export class PaymentModel {
  /**
   * Registra un nuevo pago en la base de datos.
   * @returns {Promise<number>} El ID del nuevo registro de pago.
   */
  static async create({ activeMembershipId, paymentMethodId, amount }) {
    const [result] = await pool.query(
      `INSERT INTO pagos (id_activa, id_metodo_pago, monto)
       VALUES (?, ?, ?)`,
      [activeMembershipId, paymentMethodId, amount]
    );
    return result.insertId;
  }

  /**
   * Obtiene todos los métodos de pago disponibles.
   * @returns {Promise<Array<object>>} Una lista de métodos de pago.
   */
  static async getPaymentMethods() {
    const [rows] = await pool.query(
      `SELECT id_metodo_pago as paymentMethodId, nombre as name FROM metodos_pago ORDER BY nombre`
    );
    return rows;
  }

  /**
   * Elimina los pagos asociados a una membresía activa.
   */
  static async deleteByActiveMembershipId(activeMembershipId, connection = pool) {
    await connection.query("DELETE FROM pagos WHERE id_activa = ?", [activeMembershipId]);
  }
}
