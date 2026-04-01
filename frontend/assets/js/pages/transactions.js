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
const txPaginationEl = document.getElementById("txPagination");

let ALL_TX = [];
let ACTIVE_TYPE = "all";
let POLL_TIMER = null;

function formatKES(value) {
  const num = Number(value || 0);
  try {
    return "KES " + num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch { return "KES " + num; }
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

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const txPaginator = createPaginator({
  containerEl: txPaginationEl,
  pageSize: 20,
  onPageChange(rows) {
    if (!rows.length) {
      txBody.innerHTML = `<tr><td colspan="9">No transactions match your filters.</td></tr>`;
      return;
    }
    txBody.innerHTML = rows.map(t => {
      const dt = t.created_at ? new Date(t.created_at).toLocaleString() : "—";
      return `
        <tr>
          <td>${dt}</td>
          <td>${badgeHTML(t.tx_type || "—", `type-${t.tx_type || "other"}`)}</td>
          <td>${badgeHTML(t.channel || "—", `channel-${t.channel || "other"}`)}</td>
          <td>${badgeHTML(t.status || "—", `status-${t.status || "other"}`)}</td>
          <td><strong>${formatKES(t.amount)}</strong></td>
          <td>${safeText(t.sender) || "—"}</td>
          <td>${safeText(t.receiver) || "—"}</td>
          <td>${safeText(t.narration) || "—"}</td>
          <td>
            <a href="receipt.html?id=${t.id}">
              <button type="button">🧾</button>
            </a>
          </td>
        </tr>
      `;
    }).join("");
  },
});

function getFilteredTx() {
  const q = (searchInput.value || "").trim().toLowerCase();
  const status = statusSelect.value;

  return ALL_TX.filter(t => {
    const typeOk = ACTIVE_TYPE === "all" ? true : t.tx_type === ACTIVE_TYPE;
    const statusOk = status === "all" ? true : t.status === status;
    if (!typeOk || !statusOk) return false;
    if (!q) return true;

    const hay = [
      t.narration, t.sender, t.receiver, t.reference,
      t.department, t.employee, t.service, t.customer_name,
      t.channel, t.tx_type, t.status
    ].map(safeText).join(" ").toLowerCase();

    return hay.includes(q);
  });
}

function renderTable() {
  txPaginator.setData(getFilteredTx());
}

async function loadTodayExpensesTotal() {
  try {
    const exps = await apiRequest("/api/expenses/", "GET");
    const today = getTodayKey();
    return (Array.isArray(exps) ? exps : [])
      .filter(e => safeText(e.expense_date) === today)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  } catch { return null; }
}

async function renderKPIs() {
  const today = getTodayKey();
  const todaySalesTotal = ALL_TX
    .filter(t => t.tx_type === "sale" && t.status === "successful")
    .filter(t => safeText(t.created_at).slice(0, 10) === today)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  kpiTodaySales.textContent = formatKES(todaySalesTotal);
  kpiTxCount.textContent = String(ALL_TX.length);

  const expensesTotal = await loadTodayExpensesTotal();
  if (expensesTotal === null) {
    kpiTodayExpenses.textContent = "—";
    kpiTodayNet.textContent = "—";
  } else {
    kpiTodayExpenses.textContent = formatKES(expensesTotal);
    kpiTodayNet.textContent = formatKES(todaySalesTotal - expensesTotal);
  }
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

function setActiveTab(type) {
  ACTIVE_TYPE = type;
  [...tabs.querySelectorAll(".tab")].forEach(btn => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });
  renderTable();
}

function startPolling() {
  stopPolling();
  POLL_TIMER = setInterval(() => {
    if (document.visibilityState === "visible") loadTransactions();
  }, 8000);
}

function stopPolling() {
  if (POLL_TIMER) clearInterval(POLL_TIMER);
  POLL_TIMER = null;
}

tabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  setActiveTab(btn.dataset.type);
});

searchInput.addEventListener("input", () => renderTable());
statusSelect.addEventListener("change", () => renderTable());
refreshBtn.addEventListener("click", () => loadTransactions());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") loadTransactions();
});

loadTransactions();
startPolling();

document.getElementById("downloadBtn").addEventListener("click", () => {
  downloadExcel(
    ALL_TX,
    "transactions",
    [
      { key: "created_at", label: "Date" },
      { key: "tx_type", label: "Type" },
      { key: "channel", label: "Channel" },
      { key: "status", label: "Status" },
      { key: "amount", label: "Amount (KES)" },
      { key: "sender", label: "Sender" },
      { key: "receiver", label: "Receiver" },
      { key: "department", label: "Department" },
      { key: "employee", label: "Employee" },
      { key: "service", label: "Service" },
      { key: "customer_name", label: "Customer" },
      { key: "narration", label: "Narration" },
      { key: "reference", label: "Reference" },
    ]
  );
});