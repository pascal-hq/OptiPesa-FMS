requireAuth();

const msg = document.getElementById("message");
const welcomeText = document.getElementById("welcomeText");
const lastUpdatedEl = document.getElementById("lastUpdated");
const refreshBtn = document.getElementById("refreshBtn");

const kpiTodaySales = document.getElementById("kpiTodaySales");
const kpiMonthSales = document.getElementById("kpiMonthSales");
const kpiTodayExpenses = document.getElementById("kpiTodayExpenses");
const kpiTodayNet = document.getElementById("kpiTodayNet");

const recentSalesBody = document.getElementById("recentSalesBody");
const recentExpensesBody = document.getElementById("recentExpensesBody");
const topPerformersEl = document.getElementById("topPerformers");

const trendChartCanvas = document.getElementById("trendChart");
const departmentChartCanvas = document.getElementById("departmentChart");

const startDateEl = document.getElementById("dashStartDate");
const endDateEl = document.getElementById("dashEndDate");
const applyDateBtn = document.getElementById("applyDateBtn");
const clearDateBtn = document.getElementById("clearDateBtn");
const alertContainer = document.getElementById("alertContainer");

let IS_ADMIN_MANAGER = false;
let CURRENT_USER = null;
let POLL_TIMER = null;
let trendChart = null;
let departmentChart = null;

function formatKES(value) {
  const num = Number(value || 0);
  try {
    return "KES " + num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return "KES " + num;
  }
}

function safeText(v) {
  return (v === null || v === undefined) ? "" : String(v);
}

function badgeHTML(text, kind) {
  return `<span class="badge ${kind}">${safeText(text)}</span>`;
}

function setUpdatedNow() {
  lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleString()}`;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function monthPrefix() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

async function loadRoleAndApplyUI() {
  try {
    const me = await apiRequest("/api/me/", "GET");
    CURRENT_USER = me;
    const role = safeText(me.role).toLowerCase();
    IS_ADMIN_MANAGER = me.is_superuser || role === "admin" || role === "manager";

    welcomeText.textContent = `Welcome, ${me.username} (${me.role})`;

    if (!IS_ADMIN_MANAGER) {
      document.querySelectorAll(".admin-only").forEach((el) => {
        el.style.display = "none";
      });
      document.querySelectorAll(".staff-only").forEach((el) => {
        el.style.display = "";
      });
      const pageHead = document.querySelector(".page-head h1");
      if (pageHead) pageHead.textContent = "My Performance";
    }
  } catch (err) {
    welcomeText.textContent = "Welcome";
  }
}

function showExpenseAlert(totalExpenses) {
  if (!alertContainer) return;
  const threshold = localStorage.getItem("expenseThreshold");
  if (!threshold) return;
  const alert = checkExpenseAlert(totalExpenses, Number(threshold));
  if (alert) {
    alertContainer.innerHTML = `
      <div class="alert-banner ${alert.type}">
        ${alert.message}
      </div>
    `;
  } else {
    alertContainer.innerHTML = "";
  }
}

async function loadDashboard() {
  try {
    showMessage(msg, "Loading dashboard...", "success");

    const tx = await apiRequest("/api/transactions/", "GET");
    const txList = Array.isArray(tx) ? tx : [];

    setUpdatedNow();

    const tKey = todayKey();
    const mKey = monthPrefix();

    const successfulSales = txList.filter(
      (t) => t.tx_type === "sale" && t.status === "successful"
    );

    // For staff: filter to only their own sales
    const mySales = IS_ADMIN_MANAGER
      ? successfulSales
      : successfulSales.filter(
          (t) => t.receiver === (CURRENT_USER && CURRENT_USER.username)
        );

    // Apply date filter if set
    const filteredSales = mySales.filter(t => {
      if (startDateEl && startDateEl.value) {
        if (safeText(t.created_at).slice(0, 10) < startDateEl.value) return false;
      }
      if (endDateEl && endDateEl.value) {
        if (safeText(t.created_at).slice(0, 10) > endDateEl.value) return false;
      }
      return true;
    });

    const todaySales = filteredSales
      .filter((t) => safeText(t.created_at).slice(0, 10) === tKey)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const monthSales = filteredSales
      .filter((t) => safeText(t.created_at).slice(0, 7) === mKey)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    kpiTodaySales.textContent = formatKES(todaySales);
    kpiMonthSales.textContent = formatKES(monthSales);

    // Recent sales table
    const recentSales = filteredSales
      .slice()
      .sort((a, b) => safeText(b.created_at).localeCompare(safeText(a.created_at)))
      .slice(0, 10);

    if (!recentSales.length) {
      recentSalesBody.innerHTML = `<tr><td colspan="6">No sales yet.</td></tr>`;
    } else {
      recentSalesBody.innerHTML = recentSales.map((s) => {
        const dt = s.created_at ? new Date(s.created_at).toLocaleString() : "—";
        return `
          <tr>
            <td>${dt}</td>
            <td>${safeText(s.department) || "—"}</td>
            <td>${safeText(s.employee) || "—"}</td>
            <td><strong>${formatKES(s.amount)}</strong></td>
            <td>${badgeHTML(s.channel || "—", `channel-${s.channel || "other"}`)}</td>
            <td>${badgeHTML(s.status || "—", `status-${s.status || "other"}`)}</td>
          </tr>
        `;
      }).join("");
    }

    // Staff personal stats
    if (!IS_ADMIN_MANAGER) {
      const totalMySales = mySales.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const myTxCount = document.getElementById("kpiMyTotalSales");
      const myCountEl = document.getElementById("kpiMySalesCount");
      if (myTxCount) myTxCount.textContent = formatKES(totalMySales);
      if (myCountEl) myCountEl.textContent = String(mySales.length);
    }

    // Admin/Manager: load expenses, top performers and analytics
    if (IS_ADMIN_MANAGER) {
      const exp = await apiRequest("/api/expenses/", "GET");
      const expList = Array.isArray(exp) ? exp : [];

      // Apply date filter to expenses
      let filteredExp = expList;
      if (startDateEl && startDateEl.value) {
        filteredExp = filteredExp.filter(e => e.expense_date >= startDateEl.value);
      }
      if (endDateEl && endDateEl.value) {
        filteredExp = filteredExp.filter(e => e.expense_date <= endDateEl.value);
      }

      const todayExpenses = filteredExp
        .filter((e) => safeText(e.expense_date) === tKey)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const totalMonthExpenses = filteredExp
        .filter((e) => safeText(e.expense_date).slice(0, 7) === mKey)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      kpiTodayExpenses.textContent = formatKES(todayExpenses);
      kpiTodayNet.textContent = formatKES(todaySales - todayExpenses);

      // Show expense alert
      showExpenseAlert(totalMonthExpenses);

      // Recent expenses table
      const recentExp = filteredExp
        .slice()
        .sort((a, b) => safeText(b.expense_date).localeCompare(safeText(a.expense_date)))
        .slice(0, 10);

      if (!recentExp.length) {
        recentExpensesBody.innerHTML = `<tr><td colspan="5">No expenses yet.</td></tr>`;
      } else {
        recentExpensesBody.innerHTML = recentExp.map((e) => `
          <tr>
            <td>${safeText(e.expense_date) || "—"}</td>
            <td>${safeText(e.department_name || e.department) || "—"}</td>
            <td><strong>${formatKES(e.amount)}</strong></td>
            <td>${safeText(e.description) || "—"}</td>
            <td>${safeText(e.recorded_by_username || e.recorded_by) || "—"}</td>
          </tr>
        `).join("");
      }

      // Top performers — THIS WAS MISSING
      if (topPerformersEl) {
        try {
          const perf = await apiRequest("/api/analytics/performance/", "GET");
          const bestDept = perf.best_department;
          const bestEmp = perf.best_employee;

          const deptLine = bestDept
            ? `🏆 Best Department: <strong>${bestDept["department__name"]}</strong> (${formatKES(bestDept.revenue)})`
            : `🏆 Best Department: —`;

          const empLine = bestEmp
            ? `⭐ Best Employee: <strong>${bestEmp["employee__full_name"]}</strong> (${formatKES(bestEmp.revenue)})`
            : `⭐ Best Employee: —`;

          topPerformersEl.innerHTML = `
            <div class="stack">
              <div class="pill">${deptLine}</div>
              <div class="pill">${empLine}</div>
            </div>
          `;
        } catch {
          topPerformersEl.textContent = "Top performers unavailable.";
        }
      }
    }

    showMessage(msg, "", "success");
  } catch (err) {
    showMessage(msg, err.message || "Failed to load dashboard", "error");
  }
}

async function loadTrendChart() {
  if (!IS_ADMIN_MANAGER || !trendChartCanvas || typeof Chart === "undefined") return;

  try {
    const data = await apiRequest("/api/analytics/trends/?period=week", "GET");
    const salesTrend = Array.isArray(data.sales_trend) ? data.sales_trend : [];
    const expensesTrend = Array.isArray(data.expenses_trend) ? data.expenses_trend : [];

    const allPeriods = new Set();
    salesTrend.forEach((item) => allPeriods.add(item.period));
    expensesTrend.forEach((item) => allPeriods.add(item.period));

    const labels = Array.from(allPeriods).sort();
    const salesMap = {};
    const expensesMap = {};
    salesTrend.forEach((item) => (salesMap[item.period] = Number(item.total || 0)));
    expensesTrend.forEach((item) => (expensesMap[item.period] = Number(item.total || 0)));

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(trendChartCanvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Sales",
            data: labels.map((l) => salesMap[l] || 0),
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
            data: labels.map((l) => expensesMap[l] || 0),
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
            ticks: { color: "#64748b", callback: (v) => formatKES(v) },
            grid: { color: "rgba(148, 163, 184, 0.15)" },
          },
        },
      },
    });
  } catch (err) {
    console.error("Trend chart error:", err);
  }
}

async function loadDepartmentChart() {
  if (!IS_ADMIN_MANAGER || !departmentChartCanvas || typeof Chart === "undefined") return;

  try {
    const perf = await apiRequest("/api/analytics/performance/", "GET");
    const rows = Array.isArray(perf.revenue_by_department) ? perf.revenue_by_department : [];

    const labels = rows.map((item) => item["department__name"] || "Unknown");
    const values = rows.map((item) => Number(item.revenue || 0));

    if (departmentChart) departmentChart.destroy();

    departmentChart = new Chart(departmentChartCanvas, {
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
            ticks: { color: "#64748b", callback: (v) => formatKES(v) },
            grid: { color: "rgba(148, 163, 184, 0.15)" },
          },
        },
      },
    });
  } catch (err) {
    console.error("Department chart error:", err);
  }
}

async function refreshAll() {
  await loadDashboard();
  await loadTrendChart();
  await loadDepartmentChart();
}

function startPolling() {
  stopPolling();
  POLL_TIMER = setInterval(async () => {
    if (document.visibilityState === "visible") await refreshAll();
  }, 10000);
}

function stopPolling() {
  if (POLL_TIMER) clearInterval(POLL_TIMER);
  POLL_TIMER = null;
}

refreshBtn.addEventListener("click", async () => await refreshAll());

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") await refreshAll();
});

if (applyDateBtn) {
  applyDateBtn.addEventListener("click", () => refreshAll());
}
if (clearDateBtn) {
  clearDateBtn.addEventListener("click", () => {
    if (startDateEl) startDateEl.value = "";
    if (endDateEl) endDateEl.value = "";
    refreshAll();
  });
}

(async function init() {
  await loadRoleAndApplyUI();
  await refreshAll();
  startPolling();
})();