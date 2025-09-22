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

  static async getAllActive() {
    const [rows] = await pool.query(`
      SELECT ma.id_activa as activeMembershipId,
             c.nombre_completo as clientName,
             tm.nombre as membershipTypeName,
             ma.fecha_inicio as startDate,
             ma.fecha_fin as endDate,
             ma.estado
      FROM membresias_activas ma
      JOIN clientes c ON c.id_cliente = ma.id_cliente
      JOIN membresias m ON m.id_membresia = ma.id_membresia
      JOIN tipos_membresia tm ON tm.id_tipo_membresia = m.id_tipo_membresia
      ORDER BY ma.fecha_inicio DESC
    `);
    return rows;
  }

  static async findById(id) {
    try {
      const [rows] = await pool.query(
        `SELECT
          ma.id_activa as activeMembershipId,
          ma.id_cliente as clientId,
          ma.id_membresia as membershipId,
          ma.fecha_inicio as startDate,
          ma.fecha_fin as endDate,
          ma.precio_final as finalPrice,
          ma.estado as status,
          ma.qr_path as qrPath,
          c.nombre_completo as clientName,
          c.telefono as clientPhone,
          c.correo as clientEmail,
          tm.nombre as membershipTypeName,
          tm.max_integrantes as maxMembers,
          tm.precio as price,
          DATEDIFF(ma.fecha_fin, CURDATE()) as remainingDays,
          CASE
            WHEN tm.max_integrantes > 1 THEN 'Family'
            ELSE 'Individual'
          END as type
        FROM membresias_activas ma
        INNER JOIN clientes c ON ma.id_cliente = c.id_cliente
        INNER JOIN membresias m ON ma.id_membresia = ma.id_membresia
        INNER JOIN tipos_membresia tm ON m.id_tipo_membresia = tm.id_tipo_membresia
        WHERE ma.id_activa = ?`,
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      const membership = rows[0];
      if (membership.maxMembers > 1) {
        membership.familyMembers = await this.findMembersByActiveId(id);
      } else {
        membership.familyMembers = [];
      }

      return membership;
    } catch (error) {
      console.error("Error in MembershipModel.findById:", error);
      throw error;
    }
  }

  static async updateStatus(activeMembershipId, newStatus) {
    const [result] = await pool.query(
      `UPDATE membresias_activas SET estado = ? WHERE id_activa = ?`,
      [newStatus, activeMembershipId]
    );
    return result.affectedRows > 0;
  }

  static async getFamilyPrice() {
    const [rows] = await pool.query(
      `SELECT precio FROM tipos_membresia WHERE nombre = 'Familiar'`
    );
    return rows[0]?.precio || 1200.0;
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT
        ma.id_activa as activeMembershipId,
        c.nombre_completo as clientName,
        c.telefono as clientPhone,
        c.correo as clientEmail,
        tm.nombre as membershipTypeName,
        ma.fecha_inicio as startDate,
        ma.fecha_fin as endDate,
        ma.estado as status,
        DATEDIFF(ma.fecha_fin, CURDATE()) as remainingDays,
        CASE
          WHEN tm.max_integrantes > 1 THEN 'Family'
          ELSE 'Individual'
        END as type,
        (SELECT COUNT(*) FROM integrantes_membresia im WHERE im.id_activa = ma.id_activa) as memberCount
      FROM membresias_activas ma
      JOIN clientes c ON c.id_cliente = ma.id_cliente
      JOIN membresias m ON m.id_membresia = ma.id_membresia
      JOIN tipos_membresia tm ON m.id_tipo_membresia = tm.id_tipo_membresia
    `;

    const whereClauses = [];
    const params = [];

    if (filters.searchTerm) {
      whereClauses.push(`(c.nombre_completo LIKE ? OR c.telefono LIKE ? OR c.correo LIKE ?)`);
      const searchTerm = `%${filters.searchTerm}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if(filters.type) {
        const isFamily = filters.type === 'Family';
        whereClauses.push(`tm.max_integrantes ${isFamily ? '>' : '='} 1`);
    }

    if(filters.status) {
        switch (filters.status) {
            case "Active":
              whereClauses.push("DATEDIFF(ma.fecha_fin, CURDATE()) > 7");
              break;
            case "Expiring":
              whereClauses.push("DATEDIFF(ma.fecha_fin, CURDATE()) BETWEEN 0 AND 7");
              break;
            case "Expired":
              whereClauses.push("DATEDIFF(ma.fecha_fin, CURDATE()) < 0");
              break;
        }
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY ma.fecha_fin ASC`;

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async update(id, data) {
    const [result] = await pool.query(
      "UPDATE membresias_activas SET ? WHERE id_activa = ?",
      [data, id]
    );
    return result.affectedRows > 0;
  }

  static async rebuildFamilyMembers(activeMembershipId, members) {
    // This should be done in a transaction in the service layer.
    await pool.query("DELETE FROM integrantes_membresia WHERE id_activa = ?", [activeMembershipId]);

    if (members && members.length > 0) {
      const memberValues = members.map(m => [activeMembershipId, m.fullName]);
      await pool.query(
        "INSERT INTO integrantes_membresia (id_activa, nombre_completo) VALUES ?",
        [memberValues]
      );
    }
  }

  static async deleteFamilyMembersByActiveId(id, connection = pool) {
    await connection.query("DELETE FROM integrantes_membresia WHERE id_activa = ?", [id]);
  }

  static async deleteActiveById(id, connection = pool) {
    // Before deleting, we need the contract ID (id_membresia) to delete from the other table.
    const [rows] = await connection.query("SELECT id_membresia FROM membresias_activas WHERE id_activa = ?", [id]);
    const contractId = rows.length > 0 ? rows[0].id_membresia : null;

    const [result] = await connection.query("DELETE FROM membresias_activas WHERE id_activa = ?", [id]);

    return { affectedRows: result.affectedRows, contractId };
  }

  static async deleteContractById(id, connection = pool) {
    await connection.query("DELETE FROM membresias WHERE id_membresia = ?", [id]);
  }

  static async countActiveByClientId(clientId, connection = pool) {
    const [rows] = await connection.query("SELECT COUNT(*) as count FROM membresias_activas WHERE id_cliente = ?", [clientId]);
    return rows[0].count;
  }
}
