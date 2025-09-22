import { pool } from "../../../dataBase/conecctionDataBase.js";

export class ClientModel {
  /**
   * Creates a new client in the database.
   * @param {object} clientData - The data for the new client.
   * @param {string} clientData.fullName - The client's full name.
   * @param {string} clientData.phone - The client's phone number.
   * @param {string} clientData.email - The client's email address.
   * @returns {Promise<number>} The ID of the newly created client.
   */
  static async create({ fullName, phone, email }) {
    try {
      const [result] = await pool.query(
        `INSERT INTO clientes (nombre_completo, telefono, correo)
         VALUES (?, ?, ?)`,
        [fullName, phone, email]
      );

      if (!result || result.affectedRows === 0 || !result.insertId) {
        throw new Error("Could not create the client in the database.");
      }

      return result.insertId;
    } catch (error) {
      console.error("Error in ClientModel.create:", error);
      throw error;
    }
  }

  /**
   * Finds a client by their ID.
   * @param {number} clientId - The ID of the client to find.
   * @returns {Promise<object|null>} The client object or null if not found.
   */
  static async findById(clientId) {
    const [rows] = await pool.query(
      `SELECT id_cliente as clientId,
              nombre_completo as fullName,
              correo as email,
              telefono as phone
       FROM clientes
       WHERE id_cliente = ?`,
      [clientId]
    );
    return rows[0] || null;
  }
}
