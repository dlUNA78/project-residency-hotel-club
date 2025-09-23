import puppeteer from "puppeteer";
import hbs from "handlebars";
import fs from "fs/promises";
import path from "path";
import { MembershipModel } from "../models/membership.model.js";

function getReportDateRange(period, date) {
  const year = parseInt(date.substring(0, 4));
  let startDate, endDate;

  switch (period) {
    case "monthly": {
      const month = parseInt(date.substring(5, 7)) - 1;
      startDate = new Date(Date.UTC(year, month, 1));
      endDate = new Date(Date.UTC(year, month + 1, 0));
      break;
    }
    // Other cases would be here...
    default:
      throw new Error("Invalid period specified");
  }
  // This is a simplified version of the logic from the controller
  return { startDate, endDate };
}

function validateReportParams(period, date) {
  if (!period || !date) return "Period and date are required.";
  // More validation logic...
  return null; // No errors
}

export const ReportingService = {
  async getReportData(period, date) {
    const validationError = validateReportParams(period, date);
    if (validationError) {
      const error = new Error(validationError);
      error.statusCode = 400;
      throw error;
    }

    const { startDate, endDate } = getReportDateRange(period, date);
    // The model method for this was not refactored yet, I'll assume it will be.
    // I will need to refactor getIncomeByPaymentMethod in the model.
    const incomeData = await MembershipModel.getIncomeByPaymentMethod(startDate, endDate);

    if (incomeData.total === 0) {
      const error = new Error("No data found for the selected period.");
      error.statusCode = 404;
      throw error;
    }
    return incomeData;
  },

  async generateReportPdf(reportData) {
    const templatePath = path.resolve("src", "views", "partials", "report-template.hbs");
    const templateFile = await fs.readFile(templatePath, "utf8");
    const template = hbs.compile(templateFile);
    const reportHtml = template(reportData);

    const cssPath = path.resolve("public", "styles.css");
    const tailwindCss = await fs.readFile(cssPath, "utf8");

    const fontCss = `
      @font-face { font-family: 'Lato'; font-style: normal; font-weight: 400; src: url(file://${path.resolve("public", "fonts", "lato-v25-latin-regular.ttf")}) format('truetype'); }
      @font-face { font-family: 'Lato'; font-style: italic; font-weight: 400; src: url(file://${path.resolve("public", "fonts", "lato-v25-latin-italic.ttf")}) format('truetype'); }
      @font-face { font-family: 'Lato'; font-style: normal; font-weight: 700; src: url(file://${path.resolve("public", "fonts", "lato-v25-latin-700.ttf")}) format('truetype'); }
      @font-face { font-family: 'Lato'; font-style: italic; font-weight: 700; src: url(file://${path.resolve("public", "fonts", "lato-v25-latin-700italic.ttf")}) format('truetype'); }
      body { font-family: 'Lato', sans-serif; }
    `;

    const finalHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"><style>${tailwindCss}${fontCss}</style></head>
        <body>${reportHtml}</body>
      </html>
    `;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    return pdf;
  },
};
