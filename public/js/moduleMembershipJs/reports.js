document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const periodOptions = document.querySelectorAll('.period-option');
    const generateBtn = document.getElementById('generate-report-btn');
    const messageArea = document.getElementById('message-area');
    const messageText = document.getElementById('message-text');
    const resultsTable = document.getElementById('results-table');
    const notificationArea = document.getElementById('notification-area');

    // --- State ---
    let currentPeriod = 'monthly';

    // --- Functions ---
    function showMessage(text, type = 'info') {
        messageText.textContent = text;
        messageText.className = type === 'error' ? 'text-red-500' : (type === 'warning' ? 'text-yellow-600' : 'text-gray-500');
        messageArea.classList.remove('hidden');
        resultsTable.classList.add('hidden');
    }

    function showResults(data) {
        const formatCurrency = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
        document.getElementById('monto-efectivo').textContent = formatCurrency(data.ingresos.efectivo);
        document.getElementById('monto-debito').textContent = formatCurrency(data.ingresos.debito);
        document.getElementById('monto-credito').textContent = formatCurrency(data.ingresos.credito);
        document.getElementById('monto-transferencia').textContent = formatCurrency(data.ingresos.transferencia);
        document.getElementById('monto-total').textContent = formatCurrency(data.total);

        const { period, date } = getReportParams();
        document.getElementById('download-pdf-btn').href = `/api/memberships/reports/download?period=${period}&date=${date}`;

        messageArea.classList.add('hidden');
        resultsTable.classList.remove('hidden');
    }

    function getReportParams() {
        let date;
        switch (currentPeriod) {
            case 'monthly':
                date = document.getElementById('month-input').value;
                break;
            case 'biweekly':
                const month = document.getElementById('biweekly-month-input').value;
                const fortnight = document.getElementById('fortnight-select').value;
                date = `${month}-${fortnight}`;
                break;
            case 'weekly':
                const rawDate = document.getElementById('week-input').value;
                date = rawDate.replace('-W', 'W');
                break;
        }
        return { period: currentPeriod, date };
    }

    async function generateReportPreview() {
        const { period, date } = getReportParams();
        if (!date) {
            showMessage('Por favor, selecciona una fecha válida.', 'error');
            return;
        }

        showMessage('Generando vista previa...', 'info');

        try {
            const url = `/api/memberships/reports/preview?period=${period}&date=${date}`;
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'No se pudo obtener la vista previa.');
            if (data.noData) {
                showMessage(data.message, 'warning');
                return;
            }
            showResults(data);
        } catch (error) {
            showMessage(`Error: ${error.message}`, 'error');
        }
    }

    // --- Event Listeners ---
    periodOptions.forEach(option => {
        option.addEventListener('click', function () {
            currentPeriod = this.getAttribute('data-period');
            periodOptions.forEach(opt => {
                opt.classList.remove('bg-blue-500', 'text-white');
            });
            this.classList.add('bg-blue-500', 'text-white');

            document.querySelectorAll('.date-selector').forEach(s => s.classList.add('hidden'));
            document.getElementById(`${currentPeriod}-selector`).classList.remove('hidden');
        });
    });

    generateBtn.addEventListener('click', generateReportPreview);

    // --- Initialization ---
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    document.getElementById('month-input').value = `${year}-${month}`;
    document.getElementById('biweekly-month-input').value = `${year}-${month}`;
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (today - firstDayOfYear) / 86400000;
    const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    document.getElementById('week-input').value = `${year}-W${week.toString().padStart(2, '0')}`;

    // Set initial active period without triggering click
    const initialActive = document.querySelector('.period-option[data-period="monthly"]');
    if(initialActive) {
        initialActive.classList.add('bg-blue-500', 'text-white');
    }


    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
        notificationArea.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong class="font-bold">Error: </strong>
                    <span class="block sm:inline">${decodeURIComponent(error)}</span>
                </div>`;
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});