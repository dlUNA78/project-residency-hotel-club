import { pool } from "../../../dataBase/conecctionDataBase.js";

export class ClientModel {
  /**
   * Crea un nuevo cliente en la base de datos.
   * @param {object} clientData - Los datos para el nuevo cliente.
   * @param {string} clientData.fullName - El nombre completo del cliente.
   * @param {string} clientData.phone - El teléfono del cliente.
   * @param {string} clientData.email - El correo electrónico del cliente.
   * @returns {Promise<number>} El ID del cliente recién creado.
   */
  static async create({ fullName, phone, email }) {
    try {
      const [result] = await pool.query(
        `INSERT INTO clientes (nombre_completo, telefono, correo)
         VALUES (?, ?, ?)`,
        [fullName, phone, email]
      );

      if (!result || result.affectedRows === 0 || !result.insertId) {
        throw new Error("No se pudo crear el cliente en la base de datos.");
      }

      return result.insertId;
    } catch (error) {
      console.error("Error en ClientModel.create:", error);
      throw error;
    }
  }

  /**
   * Actualiza los datos de un cliente en la base de datos.
   * @param {object} clientData - Los datos a actualizar.
   * @param {number} clientData.clientId - El ID del cliente a actualizar.
   * @param {string} clientData.fullName - El nombre completo del cliente.
   * @param {string} clientData.phone - El teléfono del cliente.
   * @param {string} clientData.email - El correo electrónico del cliente.
   * @returns {Promise<boolean>} Verdadero si la actualización fue exitosa.
   */
  static async update({ clientId, fullName, phone, email }) {
    try {
      const [result] = await pool.query(
        `UPDATE clientes SET nombre_completo = ?, telefono = ?, correo = ?
         WHERE id_cliente = ?`,
        [fullName, phone, email, clientId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error en ClientModel.update:", error);
      throw error;
    }
  }

  /**
   * Busca un cliente por su ID.
   * @param {number} clientId - El ID del cliente a buscar.
   * @returns {Promise<object|null>} El objeto del cliente o nulo si no se encuentra.
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

  /**
   * Elimina un cliente por su ID.
   * @param {number} id - El ID del cliente a eliminar.
   * @param {object} connection - (Opcional) Una conexión de base de datos existente.
   */
  static async deleteById(id, connection = pool) {
    await connection.query("DELETE FROM clientes WHERE id_cliente = ?", [id]);
  }
}
