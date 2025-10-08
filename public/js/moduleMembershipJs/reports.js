/**
 * @file Manages the report generation UI and logic.
 * @description This class handles period selection, date inputs, and fetching/displaying report previews.
 */
class ReportManager {
  /**
   * Initializes the report manager.
   */
  constructor() {
    this.dom = {};
    this.state = {
      currentPeriod: 'monthly', // Default period
    };
    this.cacheDOM();
    this.bindEvents();
    this.initializeDateInputs();
  }

  /**
   * Caches all required DOM elements for performance.
   */
  cacheDOM() {
    this.dom.periodOptions = document.querySelectorAll('.period-option');
    this.dom.generateReportButton = document.getElementById('generateReportButton');
    this.dom.messageArea = document.getElementById('messageArea');
    this.dom.messageText = document.getElementById('messageText');
    this.dom.resultsTable = document.getElementById('resultsTable');
    this.dom.notificationArea = document.getElementById('notificationArea');
    this.dom.downloadPdfButton = document.getElementById('downloadPdfButton');

    // Date selectors
    this.dom.dateSelectors = document.querySelectorAll('.date-selector');
    this.dom.monthInput = document.getElementById('monthInput');
    this.dom.biweeklyMonthInput = document.getElementById('biweeklyMonthInput');
    this.dom.fortnightSelect = document.getElementById('fortnightSelect');
    this.dom.weekInput = document.getElementById('weekInput');

    // Result fields
    this.dom.cashAmount = document.getElementById('cashAmount');
    this.dom.debitAmount = document.getElementById('debitAmount');
    this.dom.creditAmount = document.getElementById('creditAmount');
    this.dom.transferAmount = document.getElementById('transferAmount');
    this.dom.totalAmount = document.getElementById('totalAmount');
  }

  /**
   * Binds all necessary event listeners.
   */
  bindEvents() {
    this.dom.periodOptions.forEach(option => {
      option.addEventListener('click', (event) => this.handlePeriodChange(event));
    });

    if (this.dom.generateReportButton) {
      this.dom.generateReportButton.addEventListener('click', () => this.generateReportPreview());
    }
  }

  /**
   * Sets the default values for date inputs to the current date.
   */
  initializeDateInputs() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    if (this.dom.monthInput) this.dom.monthInput.value = `${year}-${month}`;
    if (this.dom.biweeklyMonthInput) this.dom.biweeklyMonthInput.value = `${year}-${month}`;

    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (today - firstDayOfYear) / 86400000;
    const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    if (this.dom.weekInput) this.dom.weekInput.value = `${year}-W${String(week).padStart(2, '0')}`;

    this.handleUrlErrors();
    this.setActivePeriod(this.state.currentPeriod);
  }

  /**
   * Handles switching between report periods (monthly, weekly, etc.).
   * @param {Event} event - The click event from the period option.
   */
  handlePeriodChange(event) {
    this.state.currentPeriod = event.currentTarget.dataset.period;
    this.setActivePeriod(this.state.currentPeriod);
  }

  /**
   * Updates the UI to show the correct date selector for the active period.
   * @param {string} period - The currently selected period ('monthly', 'weekly', 'biweekly').
   */
  setActivePeriod(period) {
      this.dom.periodOptions.forEach(opt => {
        const isSelected = opt.dataset.period === period;
        opt.classList.toggle('bg-blue-500', isSelected);
        opt.classList.toggle('text-white', isSelected);
      });

      this.dom.dateSelectors.forEach(selector => {
        selector.classList.toggle('hidden', selector.id !== `${period}-selector`);
      });
  }

  /**
   * Displays a message in the preview area.
   * @param {string} text - The message to display.
   * @param {'info'|'error'|'warning'} type - The type of message.
   */
  showMessage(text, type = 'info') {
    this.dom.messageText.textContent = text;
    const colorClasses = {
      error: 'text-red-500',
      warning: 'text-yellow-600',
      info: 'text-gray-500',
    };
    this.dom.messageText.className = colorClasses[type] || colorClasses.info;
    this.dom.messageArea.classList.remove('hidden');
    this.dom.resultsTable.classList.add('hidden');
  }

  /**
   * Displays the report results in the table.
   * @param {object} data - The report data from the API.
   */
  showResults(data) {
    const formatCurrency = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

    this.dom.cashAmount.textContent = formatCurrency(data.ingresos.efectivo);
    this.dom.debitAmount.textContent = formatCurrency(data.ingresos.debito);
    this.dom.creditAmount.textContent = formatCurrency(data.ingresos.credito);
    this.dom.transferAmount.textContent = formatCurrency(data.ingresos.transferencia);
    this.dom.totalAmount.textContent = formatCurrency(data.total);

    const { period, date } = this.getReportParams();
    this.dom.downloadPdfButton.href = `/api/memberships/reports/download?period=${period}&date=${date}`;

    this.dom.messageArea.classList.add('hidden');
    this.dom.resultsTable.classList.remove('hidden');
  }

  /**
   * Gathers the current report parameters from the form.
   * @returns {{period: string, date: string}} The report parameters.
   */
  getReportParams() {
    let date;
    switch (this.state.currentPeriod) {
      case 'monthly':
        date = this.dom.monthInput.value;
        break;
      case 'biweekly':
        const month = this.dom.biweeklyMonthInput.value;
        const fortnight = this.dom.fortnightSelect.value;
        date = `${month}-${fortnight}`;
        break;
      case 'weekly':
        const rawDate = this.dom.weekInput.value;
        date = rawDate.replace('-W', 'W');
        break;
    }
    return { period: this.state.currentPeriod, date };
  }

  /**
   * Fetches the report preview data from the API and updates the UI.
   */
  async generateReportPreview() {
    const { period, date } = this.getReportParams();
    if (!date) {
      this.showMessage('Please select a valid date.', 'error');
      return;
    }

    this.showMessage('Generating preview...', 'info');

    try {
      const url = `/api/memberships/reports/preview?period=${period}&date=${date}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Could not get preview.');
      if (data.noData) {
        this.showMessage(data.message, 'warning');
        return;
      }
      this.showResults(data);
    } catch (error) {
      this.showMessage(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Checks for and displays any errors passed in the URL parameters.
   */
  handleUrlErrors() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error && this.dom.notificationArea) {
      this.dom.notificationArea.innerHTML = `
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong class="font-bold">Error: </strong>
            <span class="block sm:inline">${decodeURIComponent(error)}</span>
        </div>`;
      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new ReportManager();
});