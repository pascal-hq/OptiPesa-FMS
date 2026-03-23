requireAuth();

console.log("✅ analytics.js loaded");

const msg = document.getElementById("message");
const cardsEl = document.getElementById("overviewCards");
const topSummaryEl = document.getElementById("topSummary");
const deptBody = document.getElementById("deptBody");
const empBody = document.getElementById("empBody");
const salesTrendEl = document.getElementById("salesTrend");
const expensesTrendEl = document.getElementById("expensesTrend");

const filterForm = document.getElementById("filterForm");
const startDateEl = document.getElementById("start_date");
const endDateEl = document.getElementById("end_date");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

const trendMonthBtn = document.getElementById("trendMonthBtn");
const trendDayBtn = document.getElementById("trendDayBtn");

let currentPeriod = "month";

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
    div.className = "card mini-card";
    div.innerHTML = `<strong>${i.label}</strong><div style="margin-top:6px;">${i.value}</div>`;
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
    <p><strong>Best Department:</strong> ${deptText}</p>
    <p><strong>Best Employee:</strong> ${empText}</p>
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

function renderTrend(preEl, rows) {
  if (!rows || rows.length === 0) {
    preEl.textContent = "No trend data yet.";
    return;
  }
  preEl.textContent = rows.map((x) => `${x.period}: ${formatKES(x.total)}`).join("\n");
}

async function loadAnalytics() {
  try {
    showMessage(msg, "Loading analytics...", "success");

    // Overview + Performance use date filters
    const overview = await apiRequest(qsWithDates("/api/analytics/overview/"), "GET");
    renderOverviewCards(overview);

    const perf = await apiRequest(qsWithDates("/api/analytics/performance/"), "GET");
    renderTopSummary(perf);
    renderDeptTable(perf.revenue_by_department || []);
    renderEmpTable(perf.revenue_by_employee || []);

    // Trends currently do not filter dates (your backend supports period only)
    const trends = await apiRequest(`/api/analytics/trends/?period=${currentPeriod}`, "GET");
    renderTrend(salesTrendEl, trends.sales_trend || []);
    renderTrend(expensesTrendEl, trends.expenses_trend || []);

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