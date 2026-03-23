requireAuth();

const msg = document.getElementById("message");
const txBody = document.getElementById("txBody");
const refreshBtn = document.getElementById("refreshBtn");
const lastUpdatedEl = document.getElementById("lastUpdated");

const tabs = document.getElementById("txTabs");
const searchInput = document.getElementById("searchInput");
const statusSelect = document.getElementById("statusSelect");

const kpiTodaySales = document.getElementById("kpiTodaySales");
const kpiTodayExpenses = document.getElementById("kpiTodayExpenses");
const kpiTodayNet = document.getElementById("kpiTodayNet");
const kpiTxCount = document.getElementById("kpiTxCount");

let ALL_TX = [];
let ACTIVE_TYPE = "all";
let POLL_TIMER = null;

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
  const cls = `badge ${kind}`;
  return `<span class="${cls}">${safeText(text)}</span>`;
}

function setUpdatedNow() {
  const now = new Date();
  lastUpdatedEl.textContent = `Last updated: ${now.toLocaleString()}`;
}

function getTodayKey() {
  // uses local date
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function loadTransactions() {
  try {
    showMessage(msg, "Loading transactions...", "success");

    const data = await apiRequest("/api/transactions/", "GET");
    ALL_TX = Array.isArray(data) ? data : [];

    setUpdatedNow();
    showMessage(msg, `Loaded ${ALL_TX.length} transaction(s).`, "success");

    renderKPIs();
    renderTable();
  } catch (err) {
    showMessage(msg, err.message || "Failed to load transactions", "error");
    txBody.innerHTML = `<tr><td colspan="8">Failed to load.</td></tr>`;
  }
}

async function loadTodayExpensesTotal() {
  // Only works if the logged-in user has permission to read expenses.
  // If staff is blocked from expenses (as intended), we’ll just show "—".
  try {
    const exps = await apiRequest("/api/expenses/", "GET");
    const today = getTodayKey();

    const total = (Array.isArray(exps) ? exps : [])
      .filter(e => safeText(e.expense_date) === today)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    return total;
  } catch {
    return null;
  }
}

async function renderKPIs() {
  const today = getTodayKey();

  // Today successful sales total
  const todaySalesTotal = ALL_TX
    .filter(t => t.tx_type === "sale" && t.status === "successful")
    .filter(t => safeText(t.created_at).slice(0, 10) === today)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  kpiTodaySales.textContent = formatKES(todaySalesTotal);
  kpiTxCount.textContent = String(ALL_TX.length);

  // Expenses (optional based on permissions)
  const expensesTotal = await loadTodayExpensesTotal();
  if (expensesTotal === null) {
    kpiTodayExpenses.textContent = "—";
    kpiTodayNet.textContent = "—";
  } else {
    kpiTodayExpenses.textContent = formatKES(expensesTotal);
    kpiTodayNet.textContent = formatKES(todaySalesTotal - expensesTotal);
  }
}

function getFilteredTx() {
  const q = (searchInput.value || "").trim().toLowerCase();
  const status = statusSelect.value;

  return ALL_TX.filter(t => {
    const typeOk = (ACTIVE_TYPE === "all") ? true : (t.tx_type === ACTIVE_TYPE);
    const statusOk = (status === "all") ? true : (t.status === status);

    if (!typeOk || !statusOk) return false;

    if (!q) return true;

    const hay = [
      t.narration,
      t.sender,
      t.receiver,
      t.reference,
      t.department,
      t.employee,
      t.service,
      t.customer_name,
      t.channel,
      t.tx_type,
      t.status
    ].map(safeText).join(" ").toLowerCase();

    return hay.includes(q);
  });
}

function renderTable() {
  const rows = getFilteredTx();

  if (!rows.length) {
    txBody.innerHTML = `<tr><td colspan="8">No transactions match your filters.</td></tr>`;
    return;
  }

  txBody.innerHTML = rows.map(t => {
    const dt = t.created_at ? new Date(t.created_at).toLocaleString() : "—";

    const typeKind = `type-${t.tx_type || "other"}`;
    const statusKind = `status-${t.status || "other"}`;

    const amount = formatKES(t.amount);
    const sender = safeText(t.sender) || "—";
    const receiver = safeText(t.receiver) || "—";
    const narration = safeText(t.narration) || "—";

    return `
      <tr>
        <td>${dt}</td>
        <td>${badgeHTML(t.tx_type || "—", typeKind)}</td>
        <td>${badgeHTML(t.channel || "—", `channel-${t.channel || "other"}`)}</td>
        <td>${badgeHTML(t.status || "—", statusKind)}</td>
        <td><strong>${amount}</strong></td>
        <td>${sender}</td>
        <td>${receiver}</td>
        <td>${narration}</td>
      </tr>
    `;
  }).join("");
}

function setActiveTab(type) {
  ACTIVE_TYPE = type;
  [...tabs.querySelectorAll(".tab")].forEach(btn => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });
  renderTable();
}

function startPolling() {
  stopPolling();
  // 8 seconds is “live enough” without spamming the backend
  POLL_TIMER = setInterval(() => {
    if (document.visibilityState === "visible") {
      loadTransactions();
    }
  }, 8000);
}

function stopPolling() {
  if (POLL_TIMER) clearInterval(POLL_TIMER);
  POLL_TIMER = null;
}

/* Events */
tabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  setActiveTab(btn.dataset.type);
});

searchInput.addEventListener("input", () => renderTable());
statusSelect.addEventListener("change", () => renderTable());

refreshBtn.addEventListener("click", () => loadTransactions());

document.addEventListener("visibilitychange", () => {
  // refresh immediately when user returns
  if (document.visibilityState === "visible") loadTransactions();
});

/* Init */
loadTransactions();
startPolling();