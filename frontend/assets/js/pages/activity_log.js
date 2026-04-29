requireAuth();

const msg = document.getElementById("message");
const logBody = document.getElementById("logBody");
const logSearchEl = document.getElementById("logSearch");
const logRoleFilterEl = document.getElementById("logRoleFilter");
const logPaginationEl = document.getElementById("logPagination");
const refreshBtn = document.getElementById("refreshBtn");

let allLogs = [];

function safeText(v) {
  return (v === null || v === undefined) ? "" : String(v);
}

function roleBadge(role) {
  const colors = {
    admin: "type-deposit",
    manager: "type-transfer",
    staff: "type-sale"
  };
  return `<span class="badge ${colors[role] || ""}">${role || "—"}</span>`;
}

const logPaginator = createPaginator({
  containerEl: logPaginationEl,
  pageSize: 20,
  onPageChange(rows) {
    logBody.innerHTML = "";
    if (!rows.length) {
      logBody.innerHTML = `<tr><td colspan="6">No activity logs found.</td></tr>`;
      return;
    }
    rows.forEach(log => {
      const dt = log.created_at ? new Date(log.created_at).toLocaleString() : "—";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dt}</td>
        <td>${safeText(log.username)}</td>
        <td>${roleBadge(log.role)}</td>
        <td>${safeText(log.action)}</td>
        <td>${safeText(log.details) || "—"}</td>
        <td>${safeText(log.ip_address) || "—"}</td>
      `;
      logBody.appendChild(tr);
    });
  }
});

function getFilteredLogs() {
  const q = (logSearchEl.value || "").trim().toLowerCase();
  const role = logRoleFilterEl.value;

  return allLogs.filter(log => {
    const roleOk = role === "all" ? true : log.role === role;
    if (!roleOk) return false;
    if (!q) return true;
    const hay = [log.username, log.action, log.details, log.ip_address]
      .join(" ").toLowerCase();
    return hay.includes(q);
  });
}

logSearchEl.addEventListener("input", () => {
  logPaginator.setData(getFilteredLogs());
});

logRoleFilterEl.addEventListener("change", () => {
  logPaginator.setData(getFilteredLogs());
});

async function loadLogs() {
  try {
    showMessage(msg, "Loading activity log...", "success");
    const data = await apiRequest("/api/activity-log/", "GET");
    allLogs = Array.isArray(data) ? data : [];
    logPaginator.setData(getFilteredLogs());
    showMessage(msg, "", "success");
  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
    logBody.innerHTML = `<tr><td colspan="6">Failed to load.</td></tr>`;
  }
}

refreshBtn.addEventListener("click", loadLogs);
loadLogs();