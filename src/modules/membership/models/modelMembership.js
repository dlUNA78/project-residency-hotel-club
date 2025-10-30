/**
 * @file modelMembership.js
 * @description Modelo de datos para todas las operaciones de membresías en la base de datos.
 * Interactúa directamente con la tabla de clientes, membresías, pagos, etc.
 * @module models/MembershipModel
 */
import { pool } from "../../../dataBase/connectionDataBase.js";

/**
 * Objeto que encapsula los métodos para interactuar con la base de datos en el contexto de membresías.
 * @type {object}
 */
const MembershipModel = {
  /**
   * Crea un nuevo cliente en la base de datos.
   * @param {object} clientData - Datos del cliente.
   * @param {string} clientData.nombre_completo - Nombre completo del cliente.
   * @param {string} clientData.telefono - Teléfono del cliente.
   * @param {string} clientData.correo - Correo electrónico del cliente.
   * @returns {Promise<object>} Un objeto con el ID del cliente recién creado.
   * @throws {Error} Si falla la inserción en la base de datos.
   */
  async createClient({ nombre_completo, telefono, correo }) {
    try {
      const [result] = await pool.query(
        `INSERT INTO clientes (nombre_completo, telefono, correo)
         VALUES (?, ?, ?)`,
        [nombre_completo, telefono, correo]
      );

      if (!result || (result.affectedRows === 0 && !result.insertId)) {
        throw new Error("No se pudo crear el cliente en la base de datos");
      }

      return {
        id_cliente: result.insertId,
        insertId: result.insertId,
      };
    } catch (error) {
      console.error("Error en createClient del modelo:", error);
      throw error;
    }
  },

  /**
   * Actualiza los datos de un cliente existente.
   * @param {object} clientData - Datos del cliente a actualizar.
   * @param {number} clientData.id_cliente - ID del cliente.
   * @param {string} clientData.nombre_completo - Nuevo nombre completo.
   * @param {string} clientData.telefono - Nuevo teléfono.
   * @param {string} clientData.correo - Nuevo correo.
   * @returns {Promise<boolean>} `true` si la actualización fue exitosa, `false` en caso contrario.
   * @throws {Error} Si ocurre un error en la base de datos.
   */
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

  /**
   * Crea un registro de contrato de membresía.
   * @param {object} contractData - Datos del contrato.
   * @param {number} contractData.id_cliente - ID del cliente titular.
   * @param {number} contractData.id_tipo_membresia - ID del tipo de membresía.
   * @param {string} contractData.fecha_inicio - Fecha de inicio (YYYY-MM-DD).
   * @param {string} contractData.fecha_fin - Fecha de fin (YYYY-MM-DD).
   * @returns {Promise<number>} El ID del contrato de membresía creado.
   */
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

  /**
   * Crea un registro de membresía activa.
   * @param {object} activationData - Datos para la activación.
   * @param {number} activationData.id_cliente - ID del cliente.
   * @param {number} activationData.id_membresia - ID del contrato de membresía.
   * @param {string} activationData.fecha_inicio - Fecha de inicio.
   * @param {string} activationData.fecha_fin - Fecha de fin.
   * @param {number} activationData.precio_final - Precio pagado.
   * @param {string|null} [activationData.qr_path=null] - Ruta al archivo del código QR.
   * @returns {Promise<number>} El ID de la membresía activa (`id_activa`).
   */
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

  /**
   * Actualiza la ruta del archivo QR para una membresía activa.
   * @param {number} id_activa - El ID de la membresía activa.
   * @param {string} qr_path - La ruta relativa al archivo QR.
   * @returns {Promise<boolean>} `true` si la actualización fue exitosa.
   */
  async updateQRPath(id_activa, qr_path) {
    const [result] = await pool.query(
      `UPDATE membresias_activas SET qr_path = ? WHERE id_activa = ?`,
      [qr_path, id_activa]
    );
    return result.affectedRows > 0;
  },

  /**
   * Agrega integrantes a una membresía familiar.
   * @param {number} id_activa - El ID de la membresía activa.
   * @param {Array<object>} integrantes - Un array de objetos, cada uno con `nombre_completo`.
   */
  async addFamilyMembers(id_activa, integrantes) {
    for (let integrante of integrantes) {
      await pool.query(
        `INSERT INTO integrantes_membresia (id_activa, nombre_completo)
         VALUES (?, ?)`,
        [id_activa, integrante.nombre_completo]
      );
    }
  },

  /**
   * Obtiene todos los tipos de membresía disponibles.
   * @returns {Promise<Array<object>>} Un array con los tipos de membresía.
   */
  async getTiposMembresia() {
    const [rows] = await pool.query(
      `SELECT id_tipo_membresia, nombre, precio, max_integrantes
       FROM tipos_membresia 
       ORDER BY nombre`
    );
    return rows;
  },

  /**
   * Obtiene un tipo de membresía específico por su ID.
   * @param {number} id - El ID del tipo de membresía.
   * @returns {Promise<object|null>} El objeto del tipo de membresía o `null` si no se encuentra.
   */
  async getTipoMembresiaById(id) {
    const [rows] = await pool.query(
      `SELECT * FROM tipos_membresia WHERE id_tipo_membresia = ?`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Obtiene todas las membresías activas con información básica del cliente y tipo.
   * @returns {Promise<Array<object>>} Un array de membresías activas.
   */
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

  /**
   * Obtiene un cliente por su ID.
   * @param {number} id_cliente - El ID del cliente.
   * @returns {Promise<object|null>} El objeto del cliente o `null` si no se encuentra.
   */
  async getClienteById(id_cliente) {
    const [rows] = await pool.query(
      `SELECT id_cliente, nombre_completo, correo, telefono
       FROM clientes WHERE id_cliente = ?`,
      [id_cliente]
    );
    return rows[0] || null;
  },

  /**
   * Obtiene los nombres de los integrantes de una membresía activa.
   * @param {number} id_activa - El ID de la membresía activa.
   * @returns {Promise<Array<object>>} Un array de objetos, cada uno con `nombre_completo`.
   */
  async getIntegrantesByActiva(id_activa) {
    const [rows] = await pool.query(
      `SELECT nombre_completo
       FROM integrantes_membresia 
       WHERE id_activa = ?`,
      [id_activa]
    );
    return rows;
  },

  /**
   * Registra un pago asociado a una membresía activa.
   * @param {object} paymentData - Datos del pago.
   * @param {number} paymentData.id_activa - ID de la membresía activa.
   * @param {number} paymentData.id_metodo_pago - ID del método de pago.
   * @param {number} paymentData.monto - Monto del pago.
   * @returns {Promise<number>} El ID del registro de pago creado.
   */
  async recordPayment({ id_activa, id_metodo_pago, monto }) {
    const [result] = await pool.query(
      `INSERT INTO pagos (id_activa, id_metodo_pago, monto)
       VALUES (?, ?, ?)`,
      [id_activa, id_metodo_pago, monto]
    );
    return result.insertId;
  },

  /**
   * Obtiene todos los métodos de pago disponibles.
   * @returns {Promise<Array<object>>} Un array con los métodos de pago.
   */
  async getMetodosPago() {
    const [rows] = await pool.query(
      `SELECT id_metodo_pago, nombre FROM metodos_pago ORDER BY nombre`
    );
    return rows;
  },

  /**
   * Obtiene un método de pago por su ID.
   * @param {number} id_metodo_pago - El ID del método de pago.
   * @returns {Promise<object|null>} El objeto del método de pago o null si no se encuentra.
   */
  async getMetodoPagoById(id_metodo_pago) {
    const [rows] = await pool.query(
      `SELECT * FROM metodos_pago WHERE id_metodo_pago = ?`, [id_metodo_pago]
    );
    return rows[0] || null;
  },

  /**
   * Obtiene los detalles completos de una membresía activa, incluyendo datos del cliente y tipo.
   * @param {number} id_activa - El ID de la membresía activa.
   * @returns {Promise<object|null>} Un objeto con los detalles completos o `null` si no se encuentra.
   */
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

  /**
   * Obtiene el historial de pagos de una membresía activa.
   * @param {number} id_activa - El ID de la membresía activa.
   * @returns {Promise<Array<object>>} Un array con los pagos realizados.
   */
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

  /**
   * Actualiza el estado de una membresía activa (ej. 'Activa', 'Vencida').
   * @param {number} id_activa - El ID de la membresía activa.
   * @param {string} nuevo_estado - El nuevo estado para la membresía.
   * @returns {Promise<boolean>} `true` si la actualización fue exitosa.
   */
  async updateEstadoMembresia(id_activa, nuevo_estado) {
    const [result] = await pool.query(
      `UPDATE membresias_activas SET estado = ? WHERE id_activa = ?`,
      [nuevo_estado, id_activa]
    );
    return result.affectedRows > 0;
  },

  /**
   * Obtiene el precio del tipo de membresía 'Familiar'.
   * @returns {Promise<number>} El precio de la membresía familiar.
   */
  async getPrecioFamiliar() {
    const [rows] = await pool.query(
      `SELECT precio FROM tipos_membresia WHERE nombre = 'Familiar'`
    );
    return rows[0]?.precio || 1200.0;
  },

  /**
   * Obtiene todos los detalles de una membresía por su ID para edición o visualización.
   * Incluye datos del cliente, tipo, estado, e integrantes si es familiar.
   * @param {number} id - El ID de la membresía activa.
   * @returns {Promise<object|null>} Un objeto con todos los detalles de la membresía o `null`.
   */
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
        membresia.integrantes = await this.getIntegrantesByActiva(id);
      } else {
        membresia.integrantes = [];
      }

      return membresia;
    } catch (error) {
      console.error("Error en getMembresiaById:", error);
      throw error;
    }
  },

  /**
   * Obtiene los detalles de una membresía, incluyendo el método de pago del último pago registrado.
   * @param {number} id_activa - El ID de la membresía activa.
   * @returns {Promise<object|null>} Un objeto con los detalles de la membresía y el método de pago, o `null`.
   * @throws {Error} Si ocurre un error en la base de datos.
   */
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
        membresia.integrantes = await this.getIntegrantesByActiva(id_activa);
      } else {
        membresia.integrantes = [];
      }

      return membresia;
    } catch (error) {
      console.error("Error en getMembresiaConPago:", error);
      throw error;
    }
  },

  /**
   * Calcula los ingresos totales agrupados por método de pago dentro de un rango de fechas.
   * @param {Date} startDate - La fecha de inicio del reporte.
   * @param {Date} endDate - La fecha de fin del reporte.
   * @returns {Promise<object>} Un objeto con los ingresos desglosados y el total.
   */
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

  /**
   * Busca un cliente por correo o teléfono y devuelve el estado de su membresía más reciente.
   * @async
   * @param {string} correo - Correo electrónico del cliente.
   * @param {string} telefono - Número de teléfono del cliente.
   * @returns {Promise<object|null>} Un objeto con el estado de la membresía (ej. { estado: 'Activa' }) o null si el cliente no se encuentra.
   */
  async findClientAndMembershipStatus(correo, telefono) {
    try {
      const [rows] = await pool.query(
        `
        SELECT
          ma.estado,
          ma.id_activa
        FROM clientes c
        LEFT JOIN membresias_activas ma ON c.id_cliente = ma.id_cliente
        WHERE c.correo = ? OR c.telefono = ?
        ORDER BY ma.fecha_fin DESC
        LIMIT 1
        `,
        [correo, telefono]
      );

      // Si no se encuentra un cliente o no tiene membresías, rows estará vacío.
      // Si se encuentra un cliente sin membresía, rows[0].estado será null.
      // Si se encuentra con membresía, rows[0].estado será 'Activa' o 'Inactiva'.
      return rows[0] || null;
    } catch (error) {
      console.error("Error en findClientAndMembershipStatus del modelo:", error);
      throw error;
    }
  },

  /**
   * Inserta un registro en la tabla de historial de entradas.
   * @param {number} id_activa - El ID de la membresía activa que ingresa.
   * @param {string} area_acceso - El área de acceso (se usará el tipo de membresía).
   * @returns {Promise<number>} El ID del registro de entrada creado.
   */
  async recordAccess(id_activa, area_acceso) {
    try {
      // Truncar area_acceso si es más largo de 50 caracteres para evitar errores de BD.
      const truncatedArea = area_acceso.substring(0, 50);
      const [result] = await pool.query(
        `INSERT INTO registro_entradas (id_activa, area_acceso) VALUES (?, ?)`,
        [id_activa, truncatedArea]
      );
      return result.insertId;
    } catch (error) {
      console.error("Error en recordAccess del modelo:", error);
      throw error;
    }
  },

  /**
   * Obtiene el historial de entradas para una fecha específica, con paginación.
   * @param {string} date - La fecha en formato 'YYYY-MM-DD'.
   * @param {number} page - El número de página a obtener.
   * @param {number} limit - El número de registros por página.
   * @returns {Promise<{logs: Array<object>, total: number}>} Un objeto con los registros y el conteo total.
   */
  async getAccessLogByDate(date, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      // Consulta para obtener el total de registros para esa fecha
      const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) as total
         FROM registro_entradas
         WHERE DATE(fecha_hora_entrada) = ?`,
        [date]
      );

      // Consulta para obtener los registros de la página actual
      const [logs] = await pool.query(
        `SELECT
          re.id_entrada,
          re.fecha_hora_entrada,
          re.area_acceso,
          c.nombre_completo AS titular
        FROM registro_entradas re
        JOIN membresias_activas ma ON re.id_activa = ma.id_activa
        JOIN clientes c ON ma.id_cliente = c.id_cliente
        WHERE DATE(re.fecha_hora_entrada) = ?
        ORDER BY re.fecha_hora_entrada DESC
        LIMIT ? OFFSET ?`,
        [date, limit, offset]
      );

      return { logs, total };
    } catch (error) {
      console.error("Error en getAccessLogByDate del modelo:", error);
      throw error;
    }
  }
};

export { MembershipModel };