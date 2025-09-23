// models/membership.model.js
import { pool } from "../../../dataBase/conecctionDataBase.js";

const MembershipModel = {
  // =================================================================
  // Client Methods
  // =================================================================

  async createClient({ fullName, phone, email }) {
    try {
      const [result] = await pool.query(
        `INSERT INTO clientes (nombre_completo, telefono, correo) VALUES (?, ?, ?)`,
        [fullName, phone, email]
      );
      if (!result || (result.affectedRows === 0 && !result.insertId)) {
        throw new Error("Could not create the client in the database.");
      }
      return { clientId: result.insertId };
    } catch (error) {
      console.error("Error in model createClient:", error);
      throw error;
    }
  },

  async getClientById(clientId) {
    const [rows] = await pool.query(
      `SELECT id_cliente, nombre_completo, correo, telefono FROM clientes WHERE id_cliente = ?`,
      [clientId]
    );
    const client = rows[0] || null;
    if (!client) return null;
    // Map to English keys
    return {
      clientId: client.id_cliente,
      fullName: client.nombre_completo,
      email: client.correo,
      phone: client.telefono,
    };
  },

  async updateClient({ clientId, fullName, phone, email }) {
    try {
      const [result] = await pool.query(
        `UPDATE clientes SET nombre_completo = ?, telefono = ?, correo = ? WHERE id_cliente = ?`,
        [fullName, phone, email, clientId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error in model updateClient:", error);
      throw error;
    }
  },

  async getIncomeByPaymentMethod(startDate, endDate) {
    const [rows] = await pool.query(
      `SELECT mp.nombre as metodo_pago, SUM(p.monto) as total FROM pagos p JOIN metodos_pago mp ON p.id_metodo_pago = mp.id_metodo_pago WHERE p.fecha_pago BETWEEN ? AND ? GROUP BY mp.nombre`,
      [startDate, endDate]
    );

    const income = {
      cash: 0,
      debit: 0,
      credit: 0,
      transfer: 0,
    };
    let totalNet = 0;

    rows.forEach((row) => {
      const method = row.metodo_pago.toLowerCase();
      const amount = parseFloat(row.total);

      if (method.includes("efectivo")) income.cash += amount;
      else if (method.includes("débito")) income.debit += amount;
      else if (method.includes("crédito")) income.credit += amount;
      else if (method.includes("transferencia")) income.transfer += amount;

      totalNet += amount;
    });

    return { income, total: totalNet };
  },

  // =================================================================
  // Membership Write Methods
  // =================================================================

  async createMembershipContract({ clientId, membershipTypeId, startDate, endDate }) {
    const [result] = await pool.query(
      `INSERT INTO membresias (id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?)`,
      [clientId, membershipTypeId, startDate, endDate]
    );
    return result.insertId;
  },

  async activateMembership({ clientId, membershipId, startDate, endDate, finalPrice, qrPath = null }) {
    const [result] = await pool.query(
      `INSERT INTO membresias_activas (id_cliente, id_membresia, fecha_inicio, fecha_fin, precio_final, qr_path) VALUES (?, ?, ?, ?, ?, ?)`,
      [clientId, membershipId, startDate, endDate, finalPrice, qrPath]
    );
    return result.insertId;
  },

  async updateQrPath(activeMembershipId, qrPath) {
    const [result] = await pool.query(
      `UPDATE membresias_activas SET qr_path = ? WHERE id_activa = ?`,
      [qrPath, activeMembershipId]
    );
    return result.affectedRows > 0;
  },

  async addFamilyMembers(activeMembershipId, members) {
    for (const member of members) {
      // The service layer will pass objects with a `fullName` property.
      await pool.query(
        `INSERT INTO integrantes_membresia (id_activa, nombre_completo) VALUES (?, ?)`,
        [activeMembershipId, member.fullName]
      );
    }
  },

  async recordPayment({ activeMembershipId, paymentMethodId, amount }) {
    const [result] = await pool.query(
      `INSERT INTO pagos (id_activa, id_metodo_pago, monto) VALUES (?, ?, ?)`,
      [activeMembershipId, paymentMethodId, amount]
    );
    return result.insertId;
  },

  async updateMembershipStatus(activeMembershipId, newStatus) {
    const [result] = await pool.query(
      `UPDATE membresias_activas SET estado = ? WHERE id_activa = ?`,
      [newStatus, activeMembershipId]
    );
    return result.affectedRows > 0;
  },

  async updateById(activeMembershipId, data) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [memberships] = await connection.query("SELECT id_cliente FROM membresias_activas WHERE id_activa = ?", [activeMembershipId]);
      if (memberships.length === 0) throw new Error("Membership not found");
      const clientId = memberships[0].id_cliente;

      const clientData = { nombre_completo: data.fullName, telefono: data.phone, correo: data.email };
      await connection.query("UPDATE clientes SET ? WHERE id_cliente = ?", [clientData, clientId]);

      const membershipData = { estado: data.status, fecha_inicio: data.startDate, fecha_fin: data.endDate, precio_final: data.finalPrice };
      const [membershipResult] = await connection.query("UPDATE membresias_activas SET ? WHERE id_activa = ?", [membershipData, activeMembershipId]);

      if (data.type === "Familiar" && data.members) {
        await connection.query("DELETE FROM integrantes_membresia WHERE id_activa = ?", [activeMembershipId]);
        for (const member of data.members) {
          if (member.fullName && member.fullName.trim() !== "") {
            await connection.query("INSERT INTO integrantes_membresia (id_activa, nombre_completo) VALUES (?, ?)", [activeMembershipId, member.fullName]);
          }
        }
      }

      await connection.commit();
      return membershipResult;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async deleteById(activeMembershipId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [activeMemberships] = await connection.query("SELECT id_cliente, id_membresia FROM membresias_activas WHERE id_activa = ?", [activeMembershipId]);
      if (activeMemberships.length === 0) throw new Error("Membership not found");
      const { id_cliente: clientId, id_membresia: membershipId } = activeMemberships[0];

      await connection.query("DELETE FROM pagos WHERE id_activa = ?", [activeMembershipId]);
      await connection.query("DELETE FROM integrantes_membresia WHERE id_activa = ?", [activeMembershipId]);
      const [deleteResult] = await connection.query("DELETE FROM membresias_activas WHERE id_activa = ?", [activeMembershipId]);
      await connection.query("DELETE FROM membresias WHERE id_membresia = ?", [membershipId]);

      const [otherMemberships] = await connection.query("SELECT COUNT(*) as count FROM membresias_activas WHERE id_cliente = ?", [clientId]);
      if (otherMemberships[0].count === 0) {
        await connection.query("DELETE FROM clientes WHERE id_cliente = ?", [clientId]);
      }

      await connection.commit();
      return deleteResult;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // =================================================================
  // Membership Read Methods
  // =================================================================

  async getMembershipTypes() {
    const [rows] = await pool.query(`SELECT id_tipo_membresia, nombre, precio, max_integrantes FROM tipos_membresia ORDER BY nombre`);
    return rows.map(row => ({
        membershipTypeId: row.id_tipo_membresia,
        name: row.nombre,
        price: row.precio,
        maxMembers: row.max_integrantes
    }));
  },

  async getMembershipTypeById(id) {
    const [rows] = await pool.query(`SELECT * FROM tipos_membresia WHERE id_tipo_membresia = ?`, [id]);
    const type = rows[0] || null;
    if(!type) return null;
    return {
        membershipTypeId: type.id_tipo_membresia,
        name: type.nombre,
        price: type.precio,
        maxMembers: type.max_integrantes,
        description: type.descripcion
    };
  },

  async getPaymentMethods() {
    const [rows] = await pool.query(`SELECT id_metodo_pago, nombre FROM metodos_pago ORDER BY nombre`);
    return rows.map(row => ({
        paymentMethodId: row.id_metodo_pago,
        name: row.nombre
    }));
  },

  async getFamilyPrice() {
    const [rows] = await pool.query(`SELECT precio FROM tipos_membresia WHERE nombre = 'Familiar'`);
    return rows[0]?.precio || 1200.0;
  },

  async getMembersByActiveMembershipId(activeMembershipId) {
    const [rows] = await pool.query(`SELECT nombre_completo FROM integrantes_membresia WHERE id_activa = ?`, [activeMembershipId]);
    return rows.map(r => ({ fullName: r.nombre_completo }));
  },

  async getById(id) {
    const [rows] = await pool.query(
        `SELECT ma.*, c.nombre_completo, c.telefono, c.correo, tm.nombre as tipo_membresia, tm.max_integrantes, DATEDIFF(ma.fecha_fin, CURDATE()) as dias_restantes FROM membresias_activas ma JOIN clientes c ON ma.id_cliente = c.id_cliente JOIN membresias m ON ma.id_membresia = m.id_membresia JOIN tipos_membresia tm ON m.id_tipo_membresia = tm.id_tipo_membresia WHERE ma.id_activa = ?`,
        [id]
    );
    if (rows.length === 0) return null;
    const m = rows[0];
    const members = m.max_integrantes > 1 ? await this.getMembersByActiveMembershipId(id) : [];
    return {
        activeMembershipId: m.id_activa,
        clientId: m.id_cliente,
        membershipId: m.id_membresia,
        startDate: m.fecha_inicio,
        endDate: m.fecha_fin,
        finalPrice: m.precio_final,
        status: m.estado,
        qrPath: m.qr_path,
        holderName: m.nombre_completo,
        holderPhone: m.telefono,
        holderEmail: m.correo,
        membershipTypeName: m.tipo_membresia,
        maxMembers: m.max_integrantes,
        daysRemaining: m.dias_restantes,
        members
    };
  },

  async getFullMembershipWithPayment(activeMembershipId) {
    const [rows] = await pool.query(
        `SELECT ma.*, c.nombre_completo, c.correo, c.telefono, tm.nombre as tipo_membresia, tm.max_integrantes, mp.nombre as metodo_pago FROM membresias_activas ma JOIN clientes c ON c.id_cliente = c.id_cliente JOIN membresias m ON ma.id_membresia = m.id_membresia JOIN tipos_membresia tm ON m.id_tipo_membresia = m.id_tipo_membresia LEFT JOIN pagos p ON p.id_activa = ma.id_activa LEFT JOIN metodos_pago mp ON mp.id_metodo_pago = p.id_metodo_pago WHERE ma.id_activa = ? ORDER BY p.fecha_pago DESC LIMIT 1`,
        [activeMembershipId]
    );
    if (rows.length === 0) return null;
    const m = rows[0];
    const members = m.max_integrantes > 1 ? await this.getMembersByActiveMembershipId(activeMembershipId) : [];
    return {
        activeMembershipId: m.id_activa,
        clientId: m.id_cliente,
        holderName: m.nombre_completo,
        holderEmail: m.correo,
        membershipTypeName: m.tipo_membresia,
        paymentMethod: m.metodo_pago,
        members
    };
  },

  async getAllActive(filters = {}) {
    let query = `
        SELECT
          ma.id_activa, c.nombre_completo, ma.fecha_inicio, ma.fecha_fin,
          tm.nombre as tipo_membresia, ma.estado, DATEDIFF(ma.fecha_fin, CURDATE()) as dias_restantes,
          (SELECT COUNT(*) FROM integrantes_membresia im WHERE im.id_activa = ma.id_activa) as total_integrantes
        FROM membresias_activas ma
        INNER JOIN clientes c ON ma.id_cliente = c.id_cliente
        INNER JOIN membresias m ON ma.id_membresia = m.id_membresia
        INNER JOIN tipos_membresia tm ON m.id_tipo_membresia = tm.id_tipo_membresia
        WHERE 1=1 `;

    const params = [];

    if (filters.status) {
        let condition;
        switch (filters.status) {
            case "Active": condition = "AND DATEDIFF(ma.fecha_fin, CURDATE()) > 7"; break;
            case "Due": condition = "AND DATEDIFF(ma.fecha_fin, CURDATE()) BETWEEN 0 AND 7"; break;
            case "Expired": condition = "AND DATEDIFF(ma.fecha_fin, CURDATE()) < 0"; break;
            default: condition = "";
        }
        query += condition;
    }

    if (filters.searchTerm) {
        query += ` AND (c.nombre_completo LIKE ? OR c.telefono LIKE ? OR c.correo LIKE ?)`;
        const searchTerm = `%${filters.searchTerm}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY ma.fecha_fin ASC`;

    const [rows] = await pool.query(query, params);
    return rows.map(m => ({
        activeMembershipId: m.id_activa,
        holderName: m.nombre_completo,
        startDate: m.fecha_inicio,
        endDate: m.fecha_fin,
        membershipType: m.tipo_membresia,
        status: m.estado,
        daysRemaining: m.dias_restantes,
        memberCount: m.total_integrantes
    }));
  },

};

export { MembershipModel };