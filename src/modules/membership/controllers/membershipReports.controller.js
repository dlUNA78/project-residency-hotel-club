import { ReportsService } from "../services/reports.service.js";

export class MembershipReportsController {
  static renderReportsPage(req, res) {
    const userRole = req.session.user?.role || "Receptionist";
    const isAdmin = userRole === "Administrator";

    if (!isAdmin) {
      return res.status(403).send("Access Denied");
    }
    res.render("membership/reports", {
      title: "Reports",
      isAdmin,
      userRole,
    });
  }

  static async getReportPreview(req, res) {
    try {
      const { period, date } = req.query;
      const incomeData = await ReportsService.getPreviewData(period, date);
      if (incomeData.total === 0) {
        return res.json({
          noData: true,
          message: "No data found for this date range.",
        });
      }
      res.json(incomeData);
    } catch (error) {
      console.error("Error generating report preview:", error);
      res.status(400).json({ error: error.message });
    }
  }

  static async downloadReportPdf(req, res) {
    try {
      const { period, date } = req.query;
      const { pdf, filename } = await ReportsService.generatePdfReport(period, date);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      res.send(pdf);
    } catch (error) {
      console.error("Error generating PDF report:", error);
      // Redirect with an error message that the frontend can display
      res.redirect(`/memberships/reports?error=${encodeURIComponent(error.message)}`);
    }
  }
}
