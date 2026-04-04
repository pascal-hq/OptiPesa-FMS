requireAuth();

const msg = document.getElementById("message");
const tabs = document.getElementById("financeTabs");
const financeBody = document.getElementById("financeBody");
const financePaginationEl = document.getElementById("financePagination");

// Forms
const depositForm = document.getElementById("depositForm");
const withdrawForm = document.getElementById("withdrawForm");
const transferForm = document.getElementById("transferForm");

// Tab sections
const tabDeposit = document.getElementById("tabDeposit");
const tabWithdraw = document.getElementById("tabWithdraw");
const tabTransfer = document.getElementById("tabTransfer");

// Form fields
const depositUsernameEl = document.getElementById("depositUsername");
const depositAmountEl = document.getElementById("depositAmount");
const depositNarrationEl = document.getElementById("depositNarration");

const withdrawAmountEl = document.getElementById("withdrawAmount");
const withdrawNarrationEl = document.getElementById("withdrawNarration");

const transferUsernameEl = document.getElementById("transferUsername");
const transferAmountEl = document.getElementById("transferAmount");
const transferNarrationEl = document.getElementById("transferNarration");

let allFinanceTx = [];
let activeTab = "deposit";

function formatKES(value) {
  const num = Number(value || 0);
  return "KES " + num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function safeText(v) {
  return (v === null || v === undefined) ? "" : String(v);
}

function badgeHTML(text, kind) {
  return `<span class="badge ${kind}">${safeText(text)}</span>`;
}

// ---- Tab switching ----
function showTab(tabName) {
  activeTab = tabName;
  tabDeposit.style.display = tabName === "deposit" ? "" : "none";
  tabWithdraw.style.display = tabName === "withdraw" ? "" : "none";
  tabTransfer.style.display = tabName === "transfer" ? "" : "none";

  [...tabs.querySelectorAll(".tab")].forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
}

tabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  showTab(btn.dataset.tab);
});

// ---- Load users for dropdowns ----
async function loadUsersIntoDropdowns() {
  try {
    const users = await apiRequest("/api/users/", "GET");
    const opts = users.map(u =>
      `<option value="${u.username}">${u.username} (${u.role})</option>`
    ).join("");

    depositUsernameEl.innerHTML = `<option value="">Select user...</option>${opts}`;
    transferUsernameEl.innerHTML = `<option value="">Select user...</option>${opts}`;
  } catch (err) {
    depositUsernameEl.innerHTML = `<option value="">Failed to load users</option>`;
    transferUsernameEl.innerHTML = `<option value="">Failed to load users</option>`;
  }
}

// ---- Paginator ----
const financePaginator = createPaginator({
  containerEl: financePaginationEl,
  pageSize: 15,
  onPageChange(rows) {
    financeBody.innerHTML = "";
    if (!rows.length) {
      financeBody.innerHTML = `<tr><td colspan="7">No finance transactions yet.</td></tr>`;
      return;
    }
    rows.forEach(t => {
      const dt = t.created_at ? new Date(t.created_at).toLocaleString() : "—";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dt}</td>
        <td>${badgeHTML(t.tx_type || "—", `type-${t.tx_type || "other"}`)}</td>
        <td><strong>${formatKES(t.amount)}</strong></td>
        <td>${safeText(t.sender) || "—"}</td>
        <td>${safeText(t.receiver) || "—"}</td>
        <td>${safeText(t.narration) || "—"}</td>
        <td>${badgeHTML(t.status || "—", `status-${t.status || "other"}`)}</td>
      `;
      financeBody.appendChild(tr);
    });
  }
});

// ---- Load finance transactions ----
async function loadFinanceTransactions() {
  try {
    const data = await apiRequest("/api/transactions/", "GET");
    const all = Array.isArray(data) ? data : [];

    // Only show deposits, withdrawals and transfers
    allFinanceTx = all.filter(t =>
      ["deposit", "withdrawal", "transfer"].includes(t.tx_type)
    ).sort((a, b) => safeText(b.created_at).localeCompare(safeText(a.created_at)));

    financePaginator.setData(allFinanceTx);
  } catch (err) {
    financeBody.innerHTML = `<tr><td colspan="7">Failed to load transactions.</td></tr>`;
  }
}

// ---- Deposit ----
depositForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = depositUsernameEl.value.trim();
  const amount = Number(depositAmountEl.value);
  const narration = depositNarrationEl.value.trim();

  if (!username) {
    showMessage(msg, "❌ Please select a user.", "error");
    return;
  }
  if (!amount || amount <= 0) {
    showMessage(msg, "❌ Amount must be greater than 0.", "error");
    return;
  }

  try {
    showMessage(msg, "Processing deposit...", "success");
    const res = await apiRequest("/api/transactions/deposit/", "POST", {
      receiver_username: username,
      amount,
      narration,
    });
    showMessage(
      msg,
      `✅ Deposit of ${formatKES(res.amount)} to ${res.receiver} successful!`,
      "success"
    );
    depositForm.reset();
    await loadFinanceTransactions();
  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
  }
});

// ---- Withdraw ----
withdrawForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const amount = Number(withdrawAmountEl.value);
  const narration = withdrawNarrationEl.value.trim();

  if (!amount || amount <= 0) {
    showMessage(msg, "❌ Amount must be greater than 0.", "error");
    return;
  }

  try {
    showMessage(msg, "Processing withdrawal...", "success");
    const res = await apiRequest("/api/transactions/withdraw/", "POST", {
      amount,
      narration,
    });
    showMessage(
      msg,
      `✅ Withdrawal of ${formatKES(res.amount)} successful!`,
      "success"
    );
    withdrawForm.reset();
    await loadFinanceTransactions();
  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
  }
});

// ---- Transfer ----
transferForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = transferUsernameEl.value.trim();
  const amount = Number(transferAmountEl.value);
  const narration = transferNarrationEl.value.trim();

  if (!username) {
    showMessage(msg, "❌ Please select a recipient.", "error");
    return;
  }
  if (!amount || amount <= 0) {
    showMessage(msg, "❌ Amount must be greater than 0.", "error");
    return;
  }

  try {
    showMessage(msg, "Processing transfer...", "success");
    const res = await apiRequest("/api/transactions/transfer/", "POST", {
      receiver_username: username,
      amount,
      narration,
    });
    showMessage(
      msg,
      `✅ Transfer of ${formatKES(res.amount)} to ${res.receiver} successful!`,
      "success"
    );
    transferForm.reset();
    await loadFinanceTransactions();
  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
  }
});

// ---- Init ----
(async function init() {
  try {
    showMessage(msg, "Loading...", "success");
    await loadUsersIntoDropdowns();
    await loadFinanceTransactions();
    showMessage(msg, "", "success");
  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
  }
})();