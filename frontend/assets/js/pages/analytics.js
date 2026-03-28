requireAuth();

const msg = document.getElementById("message");
const cardsEl = document.getElementById("overviewCards");
const topSummaryEl = document.getElementById("topSummary");
const deptBody = document.getElementById("deptBody");
const empBody = document.getElementById("empBody");

const filterForm = document.getElementById("filterForm");
const startDateEl = document.getElementById("start_date");
const endDateEl = document.getElementById("end_date");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

const trendMonthBtn = document.getElementById("trendMonthBtn");
const trendDayBtn = document.getElementById("trendDayBtn");

const trendChartCanvas = document.getElementById("trendChart");
const deptChartCanvas = document.getElementById("deptChart");

let currentPeriod = "month";
let trendChart = null;
let deptChart = null;

function qsWithDates(basePath) {
  const params = new URLSearchParams();
  if (startDateEl.value) params.set("start_date", startDateEl.value);
  if (endDateEl.value) params.set("end_date", endDateEl.value);
  const q = params.toString();
  return q ? `${basePath}?${q}` : basePath;
}

function renderOverviewCards(o) {
  const items = [
    { label: "Total Revenue", value: formatKES(o.total_revenue) },
    { label: "Total Expenses", value: formatKES(o.total_expenses) },
    { label: "Net Profit", value: formatKES(o.net_profit) },
    { label: "Sales Count", value: o.sales_count },
    { label: "Expense Count", value: o.expense_count },
  ];

  cardsEl.innerHTML = "";
  items.forEach((i) => {
    const div = document.createElement("div");
    div.className = "kpi";
    div.innerHTML = `
      <div class="kpi-label">${i.label}</div>
      <div class="kpi-value">${i.value}</div>
    `;
    cardsEl.appendChild(div);
  });
}

function renderTopSummary(perf) {
  const bestDept = perf.best_department;
  const bestEmp = perf.best_employee;

  const deptText = bestDept
    ? `${bestDept.department__name} — ${formatKES(bestDept.revenue)} (${bestDept.sales} sales)`
    : "N/A";

  const empText = bestEmp
    ? `${bestEmp.employee__full_name} (${bestEmp.department__name}) — ${formatKES(bestEmp.revenue)} (${bestEmp.sales} sales)`
    : "N/A";

  topSummaryEl.innerHTML = `
    <div class="stack">
      <div class="pill"><strong>🏆 Best Department:</strong> ${deptText}</div>
      <div class="pill"><strong>⭐ Best Employee:</strong> ${empText}</div>
    </div>
  `;
}

function renderDeptTable(rows) {
  deptBody.innerHTML = "";
  if (!rows || rows.length === 0) {
    deptBody.innerHTML = `<tr><td colspan="3">No data yet.</td></tr>`;
    return;
  }
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.department__name || ""}</td>
      <td>${r.sales ?? ""}</td>
      <td>${formatKES(r.revenue)}</td>
    `;
    deptBody.appendChild(tr);
  });
}

function renderEmpTable(rows) {
  empBody.innerHTML = "";
  if (!rows || rows.length === 0) {
    empBody.innerHTML = `<tr><td colspan="4">No data yet.</td></tr>`;
    return;
  }
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.employee__full_name || ""}</td>
      <td>${r.department__name || ""}</td>
      <td>${r.sales ?? ""}</td>
      <td>${formatKES(r.revenue)}</td>
    `;
    empBody.appendChild(tr);
  });
}

function renderTrendChart(salesTrend, expensesTrend) {
  const allPeriods = new Set();
  salesTrend.forEach((x) => allPeriods.add(x.period));
  expensesTrend.forEach((x) => allPeriods.add(x.period));

  const labels = Array.from(allPeriods).sort();

  const salesMap = {};
  const expensesMap = {};
  salesTrend.forEach((x) => (salesMap[x.period] = Number(x.total || 0)));
  expensesTrend.forEach((x) => (expensesMap[x.period] = Number(x.total || 0)));

  const salesData = labels.map((l) => salesMap[l] || 0);
  const expensesData = labels.map((l) => expensesMap[l] || 0);

  if (trendChart) trendChart.destroy();

  trendChart = new Chart(trendChartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Sales",
          data: salesData,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.12)",
          pointBackgroundColor: "#2563eb",
          pointBorderColor: "#ffffff",
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 3,
          tension: 0.38,
          fill: true,
        },
        {
          label: "Expenses",
          data: expensesData,
          borderColor: "#dc2626",
          backgroundColor: "rgba(220, 38, 38, 0.10)",
          pointBackgroundColor: "#dc2626",
          pointBorderColor: "#ffffff",
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 3,
          tension: 0.38,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          labels: { usePointStyle: true, boxWidth: 10, padding: 16 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatKES(ctx.raw)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#64748b" } },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#64748b",
            callback: (v) => formatKES(v),
          },
          grid: { color: "rgba(148, 163, 184, 0.15)" },
        },
      },
    },
  });
}

function renderDeptChart(rows) {
  if (!rows || rows.length === 0) return;

  const labels = rows.map((r) => r.department__name || "Unknown");
  const values = rows.map((r) => Number(r.revenue || 0));

  if (deptChart) deptChart.destroy();

  deptChart = new Chart(deptChartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Revenue",
          data: values,
          backgroundColor: [
            "rgba(37, 99, 235, 0.85)",
            "rgba(14, 165, 233, 0.85)",
            "rgba(16, 185, 129, 0.85)",
            "rgba(245, 158, 11, 0.85)",
            "rgba(168, 85, 247, 0.85)",
            "rgba(239, 68, 68, 0.85)",
          ],
          borderRadius: 10,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Revenue: ${formatKES(ctx.raw)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#64748b" } },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#64748b",
            callback: (v) => formatKES(v),
          },
          grid: { color: "rgba(148, 163, 184, 0.15)" },
        },
      },
    },
  });
}

function setActivePeriodBtn(period) {
  trendMonthBtn.classList.toggle("active", period === "month");
  trendDayBtn.classList.toggle("active", period === "day");
}

async function loadAnalytics() {
  try {
    showMessage(msg, "Loading analytics...", "success");

    const overview = await apiRequest(qsWithDates("/api/analytics/overview/"), "GET");
    renderOverviewCards(overview);

    const perf = await apiRequest(qsWithDates("/api/analytics/performance/"), "GET");
    renderTopSummary(perf);
    renderDeptTable(perf.revenue_by_department || []);
    renderEmpTable(perf.revenue_by_employee || []);
    renderDeptChart(perf.revenue_by_department || []);

    const trends = await apiRequest(
      `/api/analytics/trends/?period=${currentPeriod}`,
      "GET"
    );
    renderTrendChart(trends.sales_trend || [], trends.expenses_trend || []);

    setActivePeriodBtn(currentPeriod);
    showMessage(msg, "", "success");
  } catch (err) {
    console.error(err);
    showMessage(msg, "❌ " + err.message, "error");
  }
}

filterForm.addEventListener("submit", (e) => {
  e.preventDefault();
  loadAnalytics();
});

clearFiltersBtn.addEventListener("click", () => {
  startDateEl.value = "";
  endDateEl.value = "";
  loadAnalytics();
});

trendMonthBtn.addEventListener("click", () => {
  currentPeriod = "month";
  loadAnalytics();
});

trendDayBtn.addEventListener("click", () => {
  currentPeriod = "day";
  loadAnalytics();
});

loadAnalytics();