import { ReportsModel } from "../models/reports.model.js";
import puppeteer from "puppeteer";
import hbs from "handlebars";
import fs from "fs/promises";
import path from "path";

const getReportDateRange = (period, date) => {
  const year = parseInt(date.substring(0, 4));
  let startDate, endDate;

  switch (period) {
    case "monthly": {
      const month = parseInt(date.substring(5, 7)) - 1;
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0);
      break;
    }
    case "biweekly": {
      const month = parseInt(date.substring(5, 7)) - 1;
      const fortnight = date.endsWith("first") ? 1 : 16;
      if (fortnight === 1) {
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month, 15);
      } else {
        startDate = new Date(year, month, 16);
        endDate = new Date(year, month + 1, 0);
      }
      break;
    }
    case "weekly": {
      const week = parseInt(date.substring(5));
      const firstDay = new Date(year, 0, 1 + (week - 1) * 7);
      const dayOfWeek = firstDay.getDay();
      const adjustment = dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek;
      startDate = new Date(year, 0, firstDay.getDate() + adjustment);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6);
      break;
    }
    default:
      throw new Error("Invalid period specified");
  }

  return { startDate, endDate };
};

const validateReportParams = (period, date) => {
  if (!period || !date) return "Period and date are required.";
  const validPeriods = ["monthly", "biweekly", "weekly"];
  if (!validPeriods.includes(period)) return "Invalid period specified.";

  let dateRegex;
  switch (period) {
    case "monthly": dateRegex = /^\d{4}-\d{2}$/; break;
    case "biweekly": dateRegex = /^\d{4}-\d{2}-(first|second)$/; break;
    case "weekly": dateRegex = /^\d{4}W\d{2}$/; break;
  }
  if (!dateRegex.test(date)) return `Invalid date format for period '${period}'.`;
  return null;
};

export class ReportsService {
  static async getPreviewData(period, date) {
    const validationError = validateReportParams(period, date);
    if (validationError) {
      throw new Error(validationError);
    }
    const { startDate, endDate } = getReportDateRange(period, date);
    return await ReportsModel.getIncomeByPaymentMethod(startDate, endDate);
  }

  static async generatePdfReport(period, date) {
    const validationError = validateReportParams(period, date);
    if (validationError) throw new Error(validationError);

    const { startDate, endDate } = getReportDateRange(period, date);
    const incomeData = await ReportsModel.getIncomeByPaymentMethod(startDate, endDate);
    if (incomeData.total === 0) {
        throw new Error("No data found for the selected date range. PDF cannot be generated.");
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
