import { pool } from "../../../dataBase/conecctionDataBase.js";

export class ReportsModel {
  /**
   * Calculates the total income grouped by payment method for a given date range.
   * @param {string} startDate - The start of the date range.
   * @param {string} endDate - The end of the date range.
   * @returns {Promise<object>} An object containing income breakdown and total.
   */
  static async getIncomeByPaymentMethod(startDate, endDate) {
    const [rows] = await pool.query(
      `
      SELECT
        mp.nombre as paymentMethod,
        SUM(p.monto) as total
      FROM pagos p
      JOIN metodos_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
      WHERE p.fecha_pago BETWEEN ? AND ?
      GROUP BY mp.nombre
    `,
      [startDate, endDate]
    );

    const income = {
      cash: 0,
      debit: 0,
      credit: 0,
      transfer: 0,
    };
    let totalIncome = 0;

    rows.forEach((row) => {
      const method = row.paymentMethod.toLowerCase();
      const amount = parseFloat(row.total);

      if (method.includes("efectivo")) {
        income.cash += amount;
      } else if (method.includes("débito")) {
        income.debit += amount;
      } else if (method.includes("crédito")) {
        income.credit += amount;
      } else if (method.includes("transferencia")) {
        income.transfer += amount;
      }
      totalIncome += amount;
    });

    return {
      income,
      total: totalIncome,
    };
  }

  /**
   * Gets dashboard statistics for memberships.
   * @returns {Promise<object>} An object with statistics.
   */
  static async getDashboardStats() {
    try {
      const query = `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN DATEDIFF(ma.fecha_fin, CURDATE()) > 7 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN DATEDIFF(ma.fecha_fin, CURDATE()) BETWEEN 0 AND 7 THEN 1 ELSE 0 END) as expiring,
          SUM(CASE WHEN DATEDIFF(ma.fecha_fin, CURDATE()) < 0 THEN 1 ELSE 0 END) as expired,
          SUM(CASE WHEN tm.max_integrantes > 1 THEN 1 ELSE 0 END) as family,
          SUM(CASE WHEN tm.max_integrantes = 1 THEN 1 ELSE 0 END) as individual
        FROM membresias_activas ma
        INNER JOIN membresias m ON ma.id_membresia = m.id_membresia
        INNER JOIN tipos_membresia tm ON m.id_tipo_membresia = tm.id_tipo_membresia
      `;

      const [stats] = await pool.query(query);
      return stats[0];
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      throw error;
    }
  }
}
