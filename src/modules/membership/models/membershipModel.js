// models/membershipModel.js
import { pool } from "../../../dataBase/conecctionDataBase.js";

const MembershipModel = {
  async createClient({ fullName, phone, email }) {
    try {
      const [result] = await pool.query(
        `INSERT INTO clientes (nombre_completo, telefono, correo)
         VALUES (?, ?, ?)`,
        [fullName, phone, email]
      );

      if (!result || (result.affectedRows === 0 && !result.insertId)) {
        throw new Error("No se pudo crear el cliente en la base de datos");
      }

      return {
        clientId: result.insertId
      };
    } catch (error) {
      console.error("Error en createClient del modelo:", error);
      throw error;
    }
  },

  async updateClient({ id_cliente, nombre_completo, telefono, correo }) {
    try {
      const [result] = await pool.query(
        `UPDATE clientes SET nombre_completo = ?, telefono = ?, correo = ?
         WHERE id_cliente = ?`,
        [nombre_completo, telefono, correo, id_cliente]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error en updateClient del modelo:", error);
      throw error;
    }
  },

  async createMembershipContract({
    id_cliente,
    id_tipo_membresia,
    fecha_inicio,
    fecha_fin,
  }) {
    const [result] = await pool.query(
      `INSERT INTO membresias (id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin)
       VALUES (?, ?, ?, ?)`,
      [id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin]
    );
    return result.insertId;
  },

  async activateMembership({
    id_cliente,
    id_membresia,
    fecha_inicio,
    fecha_fin,
    precio_final,
    qr_path = null
  }) {
    const [result] = await pool.query(
      `INSERT INTO membresias_activas (id_cliente, id_membresia, fecha_inicio, fecha_fin, precio_final, qr_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_cliente, id_membresia, fecha_inicio, fecha_fin, precio_final, qr_path]
    );
    return result.insertId;
  },

  // Método para actualizar la ruta del QR después de generarlo
  async updateQRPath(id_activa, qr_path) {
    const [result] = await pool.query(
      `UPDATE membresias_activas SET qr_path = ? WHERE id_activa = ?`,
      [qr_path, id_activa]
    );
    return result.affectedRows > 0;
  },

  async addFamilyMembers(activeMembershipId, familyMembers) {
    for (let member of familyMembers) {
      await pool.query(
        `INSERT INTO integrantes_membresia (id_activa, nombre_completo)
         VALUES (?, ?)`,
        [activeMembershipId, member.fullName]
      );
    }
  },

  async getMembershipTypes() {
    const [rows] = await pool.query(
      `SELECT id_tipo_membresia as membershipTypeId, nombre as name, precio as price, max_integrantes as maxMembers
       FROM tipos_membresia 
       ORDER BY nombre`
    );
    return rows;
  },

  async getMembershipTypeById(id) {
    const [rows] = await pool.query(
      `SELECT id_tipo_membresia as membershipTypeId, nombre as name, precio as price, max_integrantes as maxMembers
       FROM tipos_membresia WHERE id_tipo_membresia = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async getMembresiasActivas() {
    const [rows] = await pool.query(`
      SELECT ma.*, 
             c.nombre_completo as nombre_cliente,
             tm.nombre as tipo_membresia
      FROM membresias_activas ma
      JOIN clientes c ON c.id_cliente = ma.id_cliente
      JOIN tipos_membresia tm ON tm.id_tipo_membresia = (
        SELECT m.id_tipo_membresia 
        FROM membresias m 
        WHERE m.id_membresia = ma.id_membresia
      )
    `);
    return rows;
  },

  async getClientById(clientId) {
    const [rows] = await pool.query(
      `SELECT id_cliente as clientId, nombre_completo as fullName, correo as email, telefono as phone
       FROM clientes WHERE id_cliente = ?`,
      [clientId]
    );
    return rows[0] || null;
  },

  async getFamilyMembersByMembershipId(activeMembershipId) {
    const [rows] = await pool.query(
      `SELECT nombre_completo as fullName
       FROM integrantes_membresia 
       WHERE id_activa = ?`,
      [activeMembershipId]
    );
    return rows;
  },

  async recordPayment({ activeMembershipId, paymentMethodId, amount }) {
    const [result] = await pool.query(
      `INSERT INTO pagos (id_activa, id_metodo_pago, monto)
       VALUES (?, ?, ?)`,
      [activeMembershipId, paymentMethodId, amount]
    );
    return result.insertId;
  },

  async getPaymentMethods() {
    const [rows] = await pool.query(
      `SELECT id_metodo_pago as paymentMethodId, nombre as name FROM metodos_pago ORDER BY nombre`
    );
    return rows;
  },

  async getMembresiaCompleta(id_activa) {
    const [rows] = await pool.query(
      `
      SELECT 
        ma.*,
        c.nombre_completo as nombre_cliente,
        c.correo,
        c.telefono,
        tm.nombre as tipo_membresia,
        tm.max_integrantes,
        (SELECT COUNT(*) FROM integrantes_membresia im WHERE im.id_activa = ma.id_activa) as total_integrantes
      FROM membresias_activas ma
      JOIN clientes c ON c.id_cliente = ma.id_cliente
      JOIN membresias m ON m.id_membresia = ma.id_membresia
      JOIN tipos_membresia tm ON tm.id_tipo_membresia = m.id_tipo_membresia
      WHERE ma.id_activa = ?
    `,
      [id_activa]
    );

    return rows[0] || null;
  },

  async getPagosByMembresia(id_activa) {
    const [rows] = await pool.query(
      `
      SELECT p.*, mp.nombre as metodo_pago
      FROM pagos p
      JOIN metodos_pago mp ON mp.id_metodo_pago = p.id_metodo_pago
      WHERE p.id_activa = ?
      ORDER BY p.fecha_pago DESC
    `,
      [id_activa]
    );

    return rows;
  },

  async updateEstadoMembresia(id_activa, nuevo_estado) {
    const [result] = await pool.query(
      `UPDATE membresias_activas SET estado = ? WHERE id_activa = ?`,
      [nuevo_estado, id_activa]
    );
    return result.affectedRows > 0;
  },

  async getPrecioFamiliar() {
    const [rows] = await pool.query(
      `SELECT precio FROM tipos_membresia WHERE nombre = 'Familiar'`
    );
    return rows[0]?.precio || 1200.0;
  },

  async getMembresiaById(id) {
    try {
      const [membresias] = await pool.query(
        `SELECT 
          ma.id_activa,
          ma.id_cliente,
          ma.id_membresia,
          ma.fecha_inicio,
          ma.fecha_fin,
          ma.precio_final,
          ma.estado,
          ma.qr_path,
          c.nombre_completo,
          c.telefono,
          c.correo,
          tm.nombre as tipo_membresia,
          tm.max_integrantes,
          tm.precio,
          DATEDIFF(ma.fecha_fin, CURDATE()) as dias_restantes,
          CASE 
            WHEN tm.max_integrantes > 1 THEN 'Familiar'
            ELSE 'Individual'
          END as tipo
        FROM membresias_activas ma
        INNER JOIN clientes c ON ma.id_cliente = c.id_cliente
        INNER JOIN membresias m ON ma.id_membresia = m.id_membresia
        INNER JOIN tipos_membresia tm ON m.id_tipo_membresia = tm.id_tipo_membresia
        WHERE ma.id_activa = ?`,
        [id]
      );

      if (membresias.length === 0) {
        return null;
      }

      const membresia = membresias[0];
      
      if (membresia.max_integrantes > 1) {
        membresia.integrantes = await this.getFamilyMembersByMembershipId(id);
      } else {
        membresia.integrantes = [];
      }

      return membresia;
    } catch (error) {
      console.error("Error en getMembresiaById:", error);
      throw error;
    }
  },

  // Método para obtener información completa de membresía con método de pago
  async getMembresiaConPago(id_activa) {
    try {
      const [rows] = await pool.query(
        `SELECT 
          ma.id_activa,
          ma.id_cliente,
          ma.id_membresia,
          ma.fecha_inicio,
          ma.fecha_fin,
          ma.precio_final,
          ma.estado,
          ma.qr_path,
          c.nombre_completo,
          c.telefono,
          c.correo,
          tm.nombre as tipo_membresia,
          tm.max_integrantes,
          tm.precio,
          mp.nombre as metodo_pago
        FROM membresias_activas ma
        INNER JOIN clientes c ON ma.id_cliente = c.id_cliente
        INNER JOIN membresias m ON ma.id_membresia = m.id_membresia
        INNER JOIN tipos_membresia tm ON m.id_tipo_membresia = tm.id_tipo_membresia
        LEFT JOIN pagos p ON p.id_activa = ma.id_activa
        LEFT JOIN metodos_pago mp ON mp.id_metodo_pago = p.id_metodo_pago
        WHERE ma.id_activa = ?
        ORDER BY p.fecha_pago DESC
        LIMIT 1`,
        [id_activa]
      );

      if (rows.length === 0) {
        return null;
      }

      const membresia = rows[0];
      
      if (membresia.max_integrantes > 1) {
        membresia.integrantes = await this.getFamilyMembersByMembershipId(id_activa);
      } else {
        membresia.integrantes = [];
      }

      return membresia;
    } catch (error) {
      console.error("Error en getMembresiaConPago:", error);
      throw error;
    }
  },

  async getIncomeByPaymentMethod(startDate, endDate) {
    const [rows] = await pool.query(
      `
      SELECT
        mp.nombre as metodo_pago,
        SUM(p.monto) as total
      FROM pagos p
      JOIN metodos_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
      WHERE p.fecha_pago BETWEEN ? AND ?
      GROUP BY mp.nombre
    `,
      [startDate, endDate]
    );

    const ingresos = {
      efectivo: 0,
      debito: 0,
      credito: 0,
      transferencia: 0,
    };

    let totalNeto = 0;

    rows.forEach((row) => {
      const metodo = row.metodo_pago.toLowerCase();
      const monto = parseFloat(row.total);

      if (metodo.includes("efectivo")) {
        ingresos.efectivo += monto;
      } else if (metodo.includes("débito")) {
        ingresos.debito += monto;
      } else if (metodo.includes("crédito")) {
        ingresos.credito += monto;
      } else if (metodo.includes("transferencia")) {
        ingresos.transferencia += monto;
      }
      totalNeto += monto;
    });

    return {
      ingresos,
      total: totalNeto,
    };
  },
};

export { MembershipModel };