import { pool } from "../../../dataBase/conecctionDataBase.js";

export class MembershipModel {
  /**
   * Crea un nuevo contrato de membresía.
   * @returns {Promise<number>} El ID del contrato de membresía creado.
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
   * Activa una membresía, creando un registro en la tabla `membresias_activas`.
   * @returns {Promise<number>} El ID de la membresía activa.
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
   * Actualiza la ruta del código QR para una membresía activa.
   * @returns {Promise<boolean>} Verdadero si la actualización fue exitosa.
   */
  static async updateQrPath(activeMembershipId, qrPath) {
    const [result] = await pool.query(
      `UPDATE membresias_activas SET qr_path = ? WHERE id_activa = ?`,
      [qrPath, activeMembershipId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Agrega miembros de la familia a una membresía activa.
   */
  static async addFamilyMembers(activeMembershipId, members) {
    if (!members || members.length === 0) return;
    const memberValues = members.map(m => [activeMembershipId, m.fullName]);
    await pool.query(
      "INSERT INTO integrantes_membresia (id_activa, nombre_completo) VALUES ?",
      [memberValues]
    );
  }

  /**
   * Obtiene todos los tipos de membresía desde la base de datos.
   * @returns {Promise<Array<object>>} Una lista de los tipos de membresía.
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
   * Busca un tipo de membresía por su ID.
   * @returns {Promise<object|null>} El objeto del tipo de membresía.
   */
  static async findTypeById(membershipTypeId) {
    const [rows] = await pool.query(
      `SELECT * FROM tipos_membresia WHERE id_tipo_membresia = ?`,
      [membershipTypeId]
    );
    return rows[0] || null;
  }

  /**
   * Busca los miembros de una familia por el ID de la membresía activa.
   * @returns {Promise<Array<object>>} Una lista de los miembros de la familia.
   */
  static async findMembersByActiveId(activeMembershipId) {
    const [rows] = await pool.query(
      `SELECT nombre_completo as fullName FROM integrantes_membresia WHERE id_activa = ?`,
      [activeMembershipId]
    );
    return rows;
  }

  /**
   * Busca una membresía activa por su ID, incluyendo detalles del cliente y tipo de membresía.
   * @returns {Promise<object|null>} La membresía o nulo si no se encuentra.
   */
  static async findById(id) {
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
        DATEDIFF(ma.fecha_fin, CURDATE()) as remainingDays,
        CASE WHEN tm.max_integrantes > 1 THEN 'Family' ELSE 'Individual' END as type
      FROM membresias_activas ma
      JOIN clientes c ON ma.id_cliente = c.id_cliente
      JOIN membresias m ON ma.id_membresia = ma.id_membresia
      JOIN tipos_membresia tm ON m.id_tipo_membresia = tm.id_tipo_membresia
      WHERE ma.id_activa = ?`,
      [id]
    );
    if (rows.length === 0) return null;
    const membership = rows[0];
    if (membership.maxMembers > 1) {
      membership.familyMembers = await this.findMembersByActiveId(id);
    }
    return membership;
  }

  /**
   * Obtiene todas las membresías con filtros opcionales.
   * @param {object} filters - Opciones de filtrado.
   * @returns {Promise<Array<object>>} Una lista de membresías.
   */
  static async getAll(filters = {}) {
    let query = `
      SELECT
        ma.id_activa as activeMembershipId, c.nombre_completo as clientName,
        c.telefono as clientPhone, c.correo as clientEmail, tm.nombre as membershipTypeName,
        ma.fecha_inicio as startDate, ma.fecha_fin as endDate, ma.estado as status,
        DATEDIFF(ma.fecha_fin, CURDATE()) as remainingDays,
        CASE WHEN tm.max_integrantes > 1 THEN 'Family' ELSE 'Individual' END as type
      FROM membresias_activas ma
      JOIN clientes c ON c.id_cliente = ma.id_cliente
      JOIN membresias m ON m.id_membresia = ma.id_membresia
      JOIN tipos_membresia tm ON m.id_tipo_membresia = tm.id_tipo_membresia
    `;
    const whereClauses = [], params = [];
    if (filters.searchTerm) {
      whereClauses.push(`(c.nombre_completo LIKE ? OR c.telefono LIKE ? OR c.correo LIKE ?)`);
      const searchTerm = `%${filters.searchTerm}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if(filters.type) {
        whereClauses.push(`tm.max_integrantes ${filters.type === 'Family' ? '>' : '='} 1`);
    }
    if(filters.status) {
        switch (filters.status) {
            case "Active": whereClauses.push("DATEDIFF(ma.fecha_fin, CURDATE()) > 7"); break;
            case "Expiring": whereClauses.push("DATEDIFF(ma.fecha_fin, CURDATE()) BETWEEN 0 AND 7"); break;
            case "Expired": whereClauses.push("DATEDIFF(ma.fecha_fin, CURDATE()) < 0"); break;
        }
    }
    if (whereClauses.length > 0) query += ` WHERE ${whereClauses.join(' AND ')}`;
    query += ` ORDER BY ma.fecha_fin ASC`;
    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Actualiza una membresía activa.
   * @returns {Promise<boolean>} Verdadero si fue exitoso.
   */
  static async update(id, data) {
    const [result] = await pool.query("UPDATE membresias_activas SET ? WHERE id_activa = ?", [data, id]);
    return result.affectedRows > 0;
  }

  /**
   * Re-escribe los miembros de una familia para una membresía.
   */
  static async rebuildFamilyMembers(activeMembershipId, members, connection = pool) {
    await connection.query("DELETE FROM integrantes_membresia WHERE id_activa = ?", [activeMembershipId]);
    if (members && members.length > 0) {
      const memberValues = members.map(m => [activeMembershipId, m.fullName]);
      await connection.query("INSERT INTO integrantes_membresia (id_activa, nombre_completo) VALUES ?", [memberValues]);
    }
  }

  /**
   * Actualiza el estado de una membresía (Activa, Vencida, etc.).
   * @returns {Promise<boolean>} Verdadero si fue exitoso.
   */
  static async updateStatus(activeMembershipId, newStatus) {
    const [result] = await pool.query("UPDATE membresias_activas SET estado = ? WHERE id_activa = ?", [newStatus, activeMembershipId]);
    return result.affectedRows > 0;
  }

  /**
   * Elimina los integrantes de una membresía.
   */
  static async deleteFamilyMembersByActiveId(id, connection = pool) {
    await connection.query("DELETE FROM integrantes_membresia WHERE id_activa = ?", [id]);
  }

  /**
   * Elimina una membresía activa y retorna el ID del contrato asociado.
   * @returns {Promise<{affectedRows: number, contractId: number|null}>}
   */
  static async deleteActiveById(id, connection = pool) {
    const [rows] = await connection.query("SELECT id_membresia FROM membresias_activas WHERE id_activa = ?", [id]);
    const contractId = rows.length > 0 ? rows[0].id_membresia : null;
    const [result] = await connection.query("DELETE FROM membresias_activas WHERE id_activa = ?", [id]);
    return { affectedRows: result.affectedRows, contractId };
  }

  /**
   * Elimina un contrato de membresía.
   */
  static async deleteContractById(id, connection = pool) {
    await connection.query("DELETE FROM membresias WHERE id_membresia = ?", [id]);
  }

  /**
   * Cuenta cuántas membresías activas tiene un cliente.
   * @returns {Promise<number>} El número de membresías activas.
   */
  static async countActiveByClientId(clientId, connection = pool) {
    const [rows] = await connection.query("SELECT COUNT(*) as count FROM membresias_activas WHERE id_cliente = ?", [clientId]);
    return rows[0].count;
  }
}
