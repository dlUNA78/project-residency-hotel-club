/**
 * @file modelList.js
 * @description Modelo de datos para operaciones de lectura y listado de membresías.
 * Contiene consultas complejas para obtener listas filtradas, búsquedas y detalles completos.
 * @module models/modelList
 */
import { pool } from "../../../dataBase/connectionDataBase.js";

/**
 * Objeto que encapsula los métodos para las consultas de listado de membresías.
 * @type {object}
 */
const modelList = {
  /**
   * Obtiene TODAS las membresías, con capacidad de filtrado y búsqueda.
   * Esta es la función principal para el listado de membresías.
   * @param {object} filters - Opciones de filtrado.
   * @param {string} [filters.search] - Término de búsqueda para nombre, correo o teléfono.
   * @param {string} [filters.status] - Filtro por estado ('active', 'expiring', 'expired', 'scheduled').
   * @param {string} [filters.type] - ID del tipo de membresía a filtrar.
   * @returns {Promise<Array<object>>} Un array de objetos de membresía.
   */
  async getAllMembresias(filters = {}) {
    const { search, status, type } = filters;
    let queryParams = [];
    let baseQuery = `
      SELECT
        ma.id_activa, c.nombre_completo, c.telefono, c.correo,
        ma.fecha_inicio, ma.fecha_fin, ma.precio_final, ma.estado,
        tm.nombre as tipo_membresia, tm.id_tipo_membresia,
        DATEDIFF(ma.fecha_fin, CURDATE()) as dias_restantes,
        DATEDIFF(ma.fecha_inicio, CURDATE()) as dias_para_iniciar
      FROM membresias_activas ma
      JOIN clientes c ON ma.id_cliente = c.id_cliente
      JOIN membresias m ON ma.id_membresia = m.id_membresia
      JOIN tipos_membresia tm ON m.id_tipo_membresia = tm.id_tipo_membresia
      WHERE 1=1
    `;

    if (search) {
      baseQuery += ` AND (c.nombre_completo LIKE ? OR c.telefono LIKE ? OR c.correo LIKE ?)`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (type) {
        baseQuery += ` AND tm.id_tipo_membresia = ?`;
        queryParams.push(type);
    }

    if (status) {
        switch (status) {
            case 'active':
                baseQuery += ` AND ma.fecha_inicio <= CURDATE() AND ma.fecha_fin >= CURDATE() AND DATEDIFF(ma.fecha_fin, CURDATE()) > 7`;
                break;
            case 'expiring':
                baseQuery += ` AND ma.fecha_inicio <= CURDATE() AND ma.fecha_fin >= CURDATE() AND DATEDIFF(ma.fecha_fin, CURDATE()) BETWEEN 0 AND 7`;
                break;
            case 'expired':
                baseQuery += ` AND ma.fecha_fin < CURDATE()`;
                break;
            case 'scheduled':
                baseQuery += ` AND ma.fecha_inicio > CURDATE()`;
                break;
        }
    }

    baseQuery += ` ORDER BY ma.fecha_fin ASC`;

    const [rows] = await pool.query(baseQuery, queryParams);
    return rows;
  },


  /**
   * Calcula y devuelve estadísticas agregadas sobre las membresías activas.
   * @returns {Promise<object>} Un objeto con las estadísticas (total, activas, por vencer, etc.).
   */
  async getEstadisticasMembresias() {
    try {
      const query = `
        SELECT 
            COUNT(ma.id_activa) AS total,
            SUM(CASE
                WHEN ma.estado = 'Activa' AND DATEDIFF(ma.fecha_fin, CURDATE()) > 7 THEN 1
                ELSE 0
            END) AS activas,
            SUM(CASE
                WHEN ma.estado = 'Activa' AND DATEDIFF(ma.fecha_fin, CURDATE()) BETWEEN 0 AND 7 THEN 1
                ELSE 0
            END) AS por_vencer,
            SUM(CASE
                WHEN ma.estado = 'Vencida' OR DATEDIFF(ma.fecha_fin, CURDATE()) < 0 THEN 1
                ELSE 0
            END) AS vencidas,
            SUM(CASE
                WHEN tm.max_integrantes > 1 THEN 1
                ELSE 0
            END) AS familiares,
            SUM(CASE
                WHEN tm.max_integrantes = 1 THEN 1
                ELSE 0
            END) AS individuales
        FROM membresias_activas ma
        INNER JOIN membresias m ON ma.id_membresia = m.id_membresia
        INNER JOIN tipos_membresia tm ON m.id_tipo_membresia = tm.id_tipo_membresia
      `;

      const [stats] = await pool.query(query);
      return stats[0];
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);
      throw error;
    }
  },

  /**
   * Obtiene todos los detalles de una membresía específica, incluyendo integrantes y historial de pagos.
   * @param {number} id_activa - El ID de la membresía activa.
   * @returns {Promise<object|null>} Un objeto con los detalles completos o null si no se encuentra.
   */
  async getMembresiaDetalles(id_activa) {
    try {
      const query = `
        SELECT 
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
          tm.descripcion,
          tm.max_integrantes,
          DATEDIFF(ma.fecha_fin, CURDATE()) as dias_restantes
        FROM membresias_activas ma
        INNER JOIN clientes c ON ma.id_cliente = c.id_cliente
        INNER JOIN membresias m ON ma.id_membresia = m.id_membresia
        INNER JOIN tipos_membresia tm ON m.id_tipo_membresia = tm.id_tipo_membresia
        WHERE ma.id_activa = ?
      `;

      const [membresia] = await pool.query(query, [id_activa]);

      if (membresia.length > 0) {
        const membresiaData = membresia[0];

        // Obtener integrantes si es membresía familiar
        if (membresiaData.max_integrantes > 1) {
          membresiaData.integrantes = await this.getIntegrantesByMembresia(
            id_activa
          );
        } else {
          membresiaData.integrantes = [];
        }

        // Obtener historial de pagos
        membresiaData.pagos = await this.getPagosMembresia(id_activa);

        // Transformar la ruta del QR a una ruta web relativa
        if (membresiaData.qr_path) {
          const publicPath = '/uploads/';
          const indexOfPublic = membresiaData.qr_path.indexOf(publicPath);
          if (indexOfPublic !== -1) {
            membresiaData.qr_path = membresiaData.qr_path.substring(indexOfPublic);
          }
        }

        return membresiaData;
      }

      return null;
    } catch (error) {
      console.error("Error al obtener detalles de membresía:", error);
      throw error;
    }
  },

  /**
   * Obtiene el historial de pagos de una membresía específica.
   * @param {number} id_activa - El ID de la membresía activa.
   * @returns {Promise<Array<object>>} Un array con los pagos realizados.
   */
  async getPagosMembresia(id_activa) {
    try {
      const query = `
        SELECT 
          p.*,
          mp.nombre as metodo_pago
        FROM pagos p
        INNER JOIN metodos_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
        WHERE p.id_activa = ?
        ORDER BY p.fecha_pago DESC
      `;

      const [pagos] = await pool.query(query, [id_activa]);
      return pagos;
    } catch (error) {
      console.error("Error al obtener pagos de membresía:", error);
      throw error;
    }
  },

  /**
   * Actualiza el campo 'estado' de una membresía activa.
   * @param {number} id_activa - El ID de la membresía a actualizar.
   * @param {string} nuevo_estado - El nuevo estado (ej. 'Vencida', 'Inactiva').
   * @returns {Promise<boolean>} `true` si la actualización fue exitosa.
   */
  async actualizarEstadoMembresia(id_activa, nuevo_estado) {
    try {
      const query = `
        UPDATE membresias_activas 
        SET estado = ? 
        WHERE id_activa = ?
      `;

      const [result] = await pool.query(query, [nuevo_estado, id_activa]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error al actualizar estado de membresía:", error);
      throw error;
    }
  },

  /**
   * Obtiene los nombres de los integrantes de una membresía.
   * @param {number} id_activa - El ID de la membresía activa.
   * @returns {Promise<Array<{nombre_completo: string}>>} Un array de objetos con los nombres.
   */
  async getIntegrantesByMembresia(id_activa) {
    try {
      const query = `
        SELECT 
          nombre_completo
        FROM integrantes_membresia 
        WHERE id_activa = ?
        ORDER BY nombre_completo
      `;
  
      const [rows] = await pool.query(query, [id_activa]);
      return rows;
    } catch (error) {
      console.error("Error en getIntegrantesByMembresia:", error);
      throw error;
    }
  }
};

export { modelList };
