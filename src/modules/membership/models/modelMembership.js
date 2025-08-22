import { pool } from "../../../dataBase/conecctionDataBase.js";

const MembershipModel = {
 
  /**
   * Crear un cliente
   */
  async createClient({ name, phone, email }) {
    const [result] = await pool.query(
      `INSERT INTO clientes (nombre_completo, telefono, correo)
       VALUES (?, ?, ?)`,
      [name, phone, email]
    );
    return result.insertId; // id_cliente
  },

  /**
   * Crear una membresía activa
   */
  async createMembership({ id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin, precio_final }) {
    const [result] = await pool.query(
      `INSERT INTO membresias_activas (id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin, precio_final)
       VALUES (?, ?, ?, ?, ?)`,
      [id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin, precio_final]
    );
    return result.insertId; // id_activa
  },

  /**
   * Obtener tipos de membresia
   */
  async getTiposMembresia() {
    const [rows] = await pool.query(`
      SELECT id_tipo_membresia, nombre, precio
      FROM tipos_membresia
      ORDER BY nombre
    `);
    return rows;
  },

  /**
   * Obtener precio familiar
   */
  async getPrecioFamiliar() {
    const [rows] = await pool.query(`
      SELECT precio
      FROM tipos_membresia
      WHERE nombre = 'Familiar'
    `);
    return rows[0].precio;
  }
 

};






export  { MembershipModel };

