requireAuth();

const msg = document.getElementById("message");
const container = document.getElementById("accountsContainer");
const refreshBtn = document.getElementById("refreshBtn");

function formatKES(value) {
  const num = Number(value || 0);
  return `KES ${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function safeText(v) {
  return (v === null || v === undefined) ? "" : String(v);
}

function badgeHTML(text, kind) {
  return `<span class="badge ${kind}">${safeText(text)}</span>`;
}

function roleBadge(role) {
  const colors = {
    admin: "type-deposit",
    manager: "type-transfer",
    staff: "type-sale"
  };
  return `<span class="badge ${colors[role] || ""}">${role}</span>`;
}

async function loadAccounts() {
  try {
    showMessage(msg, "Loading account activity...", "success");
    const data = await apiRequest("/api/accounts/activity/", "GET");

    if (!data || data.length === 0) {
      container.innerHTML = `<p>No accounts found.</p>`;
      showMessage(msg, "", "success");
      return;
    }

    container.innerHTML = data.map(acc => `
      <section class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="margin:0;">${safeText(acc.username)} ${roleBadge(acc.role)}</h3>
            <p class="muted" style="margin:4px 0 0;">
              Account: ${safeText(acc.account_number)}
            </p>
          </div>
          <div class="kpi" style="min-width:160px; text-align:right;">
            <div class="kpi-label">Balance</div>
            <div class="kpi-value">${formatKES(acc.balance)}</div>
          </div>
        </div>

        ${acc.recent_transactions.length > 0 ? `
          <div style="margin-top:16px;">
            <h4 style="margin-bottom:8px; font-size:13px; color:#6b7280; text-transform:uppercase; letter-spacing:.05em;">
              Recent Transactions
            </h4>
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Sender</th>
                  <th>Receiver</th>
                  <th>Narration</th>
                </tr>
              </thead>
              <tbody>
                ${acc.recent_transactions.map(t => `
                  <tr>
                    <td>${t.created_at ? new Date(t.created_at).toLocaleString() : "—"}</td>
                    <td>${badgeHTML(t.tx_type || "—", `type-${t.tx_type || "other"}`)}</td>
                    <td>${badgeHTML(t.channel || "—", `channel-${t.channel || "other"}`)}</td>
                    <td>${badgeHTML(t.status || "—", `status-${t.status || "other"}`)}</td>
                    <td><strong>${formatKES(t.amount)}</strong></td>
                    <td>${safeText(t.sender) || "—"}</td>
                    <td>${safeText(t.receiver) || "—"}</td>
                    <td>${safeText(t.narration) || "—"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : `
          <p class="muted" style="margin-top:12px; font-size:13px;">
            No transactions yet.
          </p>
        `}
      </section>
    `).join("");

    showMessage(msg, "", "success");
  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
    container.innerHTML = "";
  }
}

refreshBtn.addEventListener("click", loadAccounts);

loadAccounts();