import { MembershipModel } from "../models/membershipModel.js";
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
      const adjustment = dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek; // Adjust to start of the week (Monday)
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
  if (!period || !date) {
    return "El período y la fecha son obligatorios.";
  }

  const validPeriods = ["monthly", "biweekly", "weekly"];
  if (!validPeriods.includes(period)) {
    return "El período especificado no es válido.";
  }

  let dateRegex;
  switch (period) {
    case "monthly":
      dateRegex = /^\d{4}-\d{2}$/; // YYYY-MM
      break;
    case "biweekly":
      dateRegex = /^\d{4}-\d{2}-(first|second)$/; // YYYY-MM-first/second
      break;
    case "weekly":
      dateRegex = /^\d{4}W\d{2}$/; // YYYYWww
      break;
  }

  if (!dateRegex.test(date)) {
    return `El formato de fecha para el período '${period}' no es válido.`;
  }

  return null; // No hay errores
};

const reportsController = {
  async getReportPreview(req, res) {
    try {
      const { period, date } = req.query;

      const validationError = validateReportParams(period, date);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const { startDate, endDate } = getReportDateRange(period, date);

      const incomeData = await MembershipModel.getIncomeByPaymentMethod(
        startDate,
        endDate
      );

      if (incomeData.total === 0) {
        return res.json({
          noData: true,
          message: "No se encontraron datos para el reporte en esta fecha, elija una fecha correcta.",
        });
      }

      res.json(incomeData);
    } catch (error) {
      console.error("Error generating report preview:", error);
      res.status(500).json({ error: "Failed to generate report preview" });
    }
  },

  async downloadReportPDF(req, res) {
    try {
      const { period, date } = req.query;

      const validationError = validateReportParams(period, date);
      if (validationError) {
        // Redirect with an error message that the frontend can display
        return res.redirect(`/reports?error=${encodeURIComponent(validationError)}`);
      }

      const { startDate, endDate } = getReportDateRange(period, date);

      const incomeData = await MembershipModel.getIncomeByPaymentMethod(
        startDate,
        endDate
      );

      if (incomeData.total === 0) {
        const message = "No se encontraron datos para el reporte en esta fecha, no se puede generar el PDF.";
        return res.redirect(`/reports?error=${encodeURIComponent(message)}`);
      }

      // 1. Cargar la plantilla de Handlebars
      const templatePath = path.resolve("src", "views", "partials", "report-template.hbs");
      const templateFile = await fs.readFile(templatePath, "utf8");
      const template = hbs.compile(templateFile);
      const reportHtml = template(incomeData);

      // 2. Cargar el CSS de Tailwind
      const cssPath = path.resolve("public", "styles.css");
      const tailwindCss = await fs.readFile(cssPath, "utf8");

      // 3. Definir las @font-face para la fuente local
      const fontCss = `
        @font-face {
          font-family: 'Lato';
          font-style: normal;
          font-weight: 400;
          src: url(file://${path.resolve("public", "fonts", "lato-v25-latin-regular.ttf")}) format('truetype');
        }
        @font-face {
          font-family: 'Lato';
          font-style: italic;
          font-weight: 400;
          src: url(file://${path.resolve("public", "fonts", "lato-v25-latin-italic.ttf")}) format('truetype');
        }
        @font-face {
          font-family: 'Lato';
          font-style: normal;
          font-weight: 700;
          src: url(file://${path.resolve("public", "fonts", "lato-v25-latin-700.ttf")}) format('truetype');
        }
        @font-face {
          font-family: 'Lato';
          font-style: italic;
          font-weight: 700;
          src: url(file://${path.resolve("public", "fonts", "lato-v25-latin-700italic.ttf")}) format('truetype');
        }
        body {
          font-family: 'Lato', sans-serif;
        }
      `;

      // 4. Combinar todo en un solo documento HTML
      const finalHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              ${tailwindCss}
              ${fontCss}
            </style>
          </head>
          <body>
            ${reportHtml}
          </body>
        </html>
      `;

      // 5. Generar el PDF con Puppeteer
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(finalHtml, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({ format: "A4", printBackground: true });
      await browser.close();

      const formatDate = (date) => date.toISOString().split("T")[0];
      const filename = `Reporte-${period}-${formatDate(startDate)}-a-${formatDate(
        endDate
      )}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${filename}`
      );
      res.send(pdf);
    } catch (error) {
      console.error("Error generating PDF report:", error);
      res.status(500).send("Failed to generate PDF report");
    }
  },

  async renderReports(req, res) {
    const userRole = req.session.user?.role || "Recepcionista";
    const isAdmin = userRole === "Administrador";

    if (!isAdmin) {
      return res.status(403).send("Acceso denegado");
    } else {
      res.render("reports", {
        title: "Reportes",
        isAdmin,
        userRole,
      });
    }
  },
};

export { reportsController };
