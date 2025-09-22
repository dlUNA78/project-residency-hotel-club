import { pool } from "../../../dataBase/conecctionDataBase.js";

export class MembershipModel {
  /**
   * Creates a membership contract.
   * @param {object} data - The membership data.
   * @param {number} data.clientId - The client's ID.
   * @param {number} data.membershipTypeId - The membership type ID.
   * @param {string} data.startDate - The start date.
   * @param {string} data.endDate - The end date.
   * @returns {Promise<number>} The ID of the new membership contract.
   */
  static async createContract({ clientId, membershipTypeId, startDate, endDate }) {
    const [result] = await pool.query(
      `INSERT INTO membresias (id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin)
       VALUES (?, ?, ?, ?)`,
      [clientId, membershipTypeId, startDate, endDate]
    );
    return result.insertId;
  }

  /**
   * Activates a membership.
   * @param {object} data - The activation data.
   * @param {number} data.clientId - The client's ID.
   * @param {number} data.membershipId - The membership contract ID.
   * @param {string} data.startDate - The start date.
   * @param {string} data.endDate - The end date.
   * @param {number} data.finalPrice - The final price.
   * @returns {Promise<number>} The ID of the active membership.
   */
  static async activate({ clientId, membershipId, startDate, endDate, finalPrice }) {
    const [result] = await pool.query(
      `INSERT INTO membresias_activas (id_cliente, id_membresia, fecha_inicio, fecha_fin, precio_final, qr_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [clientId, membershipId, startDate, endDate, finalPrice, null]
    );
    return result.insertId;
  }

  /**
   * Updates the QR code path for an active membership.
   * @param {number} activeMembershipId - The active membership ID.
   * @param {string} qrPath - The new QR code path.
   * @returns {Promise<boolean>} True if the update was successful.
   */
  static async updateQrPath(activeMembershipId, qrPath) {
    const [result] = await pool.query(
      `UPDATE membresias_activas SET qr_path = ? WHERE id_activa = ?`,
      [qrPath, activeMembershipId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Adds family members to an active membership.
   * @param {number} activeMembershipId - The active membership ID.
   * @param {Array<object>} members - The family members to add.
   */
  static async addFamilyMembers(activeMembershipId, members) {
    for (const member of members) {
      await pool.query(
        `INSERT INTO integrantes_membresia (id_activa, nombre_completo)
         VALUES (?, ?)`,
        [activeMembershipId, member.fullName]
      );
    }
  }

  /**
   * Retrieves all membership types.
   * @returns {Promise<Array<object>>} A list of membership types.
   */
  static async getMembershipTypes() {
    const [rows] = await pool.query(
      `SELECT id_tipo_membresia as membershipTypeId,
              nombre as name,
              precio as price,
              max_integrantes as maxMembers
       FROM tipos_membresia
       ORDER BY nombre`
    );
    return rows;
  }

  /**
   * Retrieves a membership type by its ID.
   * @param {number} membershipTypeId - The ID of the membership type.
   * @returns {Promise<object|null>} The membership type object.
   */
  static async findTypeById(membershipTypeId) {
    const [rows] = await pool.query(
      `SELECT id_tipo_membresia as membershipTypeId,
              nombre as name,
              precio as price,
              max_integrantes as maxMembers
       FROM tipos_membresia
       WHERE id_tipo_membresia = ?`,
      [membershipTypeId]
    );
    return rows[0] || null;
  }

  /**
   * Retrieves the family members for an active membership.
   * @param {number} activeMembershipId - The active membership ID.
   * @returns {Promise<Array<object>>} A list of family members.
   */
  static async findMembersByActiveId(activeMembershipId) {
    const [rows] = await pool.query(
      `SELECT nombre_completo as fullName
       FROM integrantes_membresia
       WHERE id_activa = ?`,
      [activeMembershipId]
    );
    return rows;
  }

  static async getPaymentMethods() {
    const [rows] = await pool.query(
      `SELECT id_metodo_pago as paymentMethodId, nombre as name FROM metodos_pago ORDER BY nombre`
    );
    return rows;
  }

  static async getFullMembershipWithPayment(activeMembershipId) {
    try {
      const [rows] = await pool.query(
        `SELECT
          ma.id_activa as activeMembershipId,
          c.nombre_completo as clientName,
          tm.nombre as membershipTypeName,
          ma.fecha_inicio as startDate,
          ma.fecha_fin as endDate,
          ma.precio_final as finalPrice,
          ma.qr_path as qrPath,
          mp.nombre as paymentMethod
        FROM membresias_activas ma
        INNER JOIN clientes c ON c.id_cliente = ma.id_cliente
        INNER JOIN membresias m ON m.id_membresia = ma.id_membresia
        INNER JOIN tipos_membresia tm ON m.id_tipo_membresia = tm.id_tipo_membresia
        LEFT JOIN pagos p ON p.id_activa = ma.id_activa
        LEFT JOIN metodos_pago mp ON mp.id_metodo_pago = p.id_metodo_pago
        WHERE ma.id_activa = ?
        ORDER BY p.fecha_pago DESC
        LIMIT 1`,
        [activeMembershipId]
      );

      if (rows.length === 0) {
        return null;
      }

      const membership = rows[0];
      membership.familyMembers = await this.findMembersByActiveId(activeMembershipId);

      return membership;
    } catch (error) {
      console.error("Error in getFullMembershipWithPayment:", error);
      throw error;
    }
  }
}
