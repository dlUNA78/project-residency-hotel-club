import { ReportsModel } from "../models/reports.model.js";
import puppeteer from "puppeteer";
import hbs from "handlebars";
import fs from "fs/promises";
import path from "path";

/**
 * Calcula el rango de fechas para un reporte basado en un período y fecha.
 * @param {string} period - 'monthly', 'biweekly', 'weekly'
 * @param {string} date - La fecha para el período (ej. '2023-10', '2023-10-first', '2023W42')
 * @returns {{startDate: Date, endDate: Date}}
 */
const getReportDateRange = (period, date) => {
  const year = parseInt(date.substring(0, 4));
  let startDate, endDate;

  switch (period) {
    case "monthly": {
      const month = parseInt(date.substring(5, 7)) - 1;
      startDate = new Date(Date.UTC(year, month, 1));
      endDate = new Date(Date.UTC(year, month + 1, 0));
      break;
    }
    case "biweekly": {
      const month = parseInt(date.substring(5, 7)) - 1;
      const fortnight = date.endsWith("first") ? 1 : 16;
      if (fortnight === 1) {
        startDate = new Date(Date.UTC(year, month, 1));
        endDate = new Date(Date.UTC(year, month, 15));
      } else {
        startDate = new Date(Date.UTC(year, month, 16));
        endDate = new Date(Date.UTC(year, month + 1, 0));
      }
      break;
    }
    case "weekly": {
      const week = parseInt(date.substring(5));
      const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
      const days = (week - 1) * 7;
      startDate = new Date(firstDayOfYear.getTime() + days * 24 * 60 * 60 * 1000);
      endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
      break;
    }
    default:
      throw new Error("Periodo inválido especificado");
  }
  return { startDate, endDate };
};

/**
 * Valida los parámetros para la generación de un reporte.
 * @param {string} period - El período del reporte.
 * @param {string} date - La fecha del reporte.
 * @returns {string|null} Un mensaje de error o nulo si es válido.
 */
const validateReportParams = (period, date) => {
  if (!period || !date) return "El período y la fecha son requeridos.";
  const validPeriods = ["monthly", "biweekly", "weekly"];
  if (!validPeriods.includes(period)) return "Período especificado inválido.";

  let dateRegex;
  switch (period) {
    case "monthly": dateRegex = /^\d{4}-\d{2}$/; break;
    case "biweekly": dateRegex = /^\d{4}-\d{2}-(first|second)$/; break;
    case "weekly": dateRegex = /^\d{4}W\d{2}$/; break;
  }
  if (!dateRegex.test(date)) return `Formato de fecha inválido para el período '${period}'.`;
  return null;
};

export class ReportsService {
  /**
   * Obtiene los datos para la previsualización de un reporte.
   */
  static async getPreviewData(period, date) {
    const validationError = validateReportParams(period, date);
    if (validationError) {
      throw new Error(validationError);
    }
    const { startDate, endDate } = getReportDateRange(period, date);
    return await ReportsModel.getIncomeByPaymentMethod(startDate, endDate);
  }

  /**
   * Genera un reporte en PDF.
   */
  static async generatePdfReport(period, date) {
    const validationError = validateReportParams(period, date);
    if (validationError) throw new Error(validationError);

    const { startDate, endDate } = getReportDateRange(period, date);
    const incomeData = await ReportsModel.getIncomeByPaymentMethod(startDate, endDate);
    if (incomeData.total === 0) {
        throw new Error("No se encontraron datos para este rango de fechas. No se puede generar el PDF.");
    }

    const templatePath = path.resolve("src", "views", "partials", "report-template.hbs");
    const templateFile = await fs.readFile(templatePath, "utf8");
    const template = hbs.compile(templateFile);
    const reportHtml = template(incomeData);

    const cssPath = path.resolve("public", "styles.css");
    const tailwindCss = await fs.readFile(cssPath, "utf8");

    const finalHtml = `
      <!DOCTYPE html><html><head><meta charset="UTF-8"><style>${tailwindCss}</style></head>
      <body>${reportHtml}</body></html>
    `;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    const formatDate = (d) => d.toISOString().split("T")[0];
    const filename = `Report-${period}-${formatDate(startDate)}-to-${formatDate(endDate)}.pdf`;

    return { pdf, filename };
  }
}
