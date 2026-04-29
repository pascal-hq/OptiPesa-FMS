requireAuth();

const msg = document.getElementById("message");
const profileForm = document.getElementById("profileForm");
const profileUsernameEl = document.getElementById("profileUsername");
const profileEmailEl = document.getElementById("profileEmail");
const profileRoleEl = document.getElementById("profileRole");
const avatarCircle = document.getElementById("avatarCircle");

const statTotalSales = document.getElementById("statTotalSales");
const statSalesCount = document.getElementById("statSalesCount");
const statMonthSales = document.getElementById("statMonthSales");
const statTodaySales = document.getElementById("statTodaySales");
const myRecentSales = document.getElementById("myRecentSales");

let currentUserId = null;

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

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function monthPrefix() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

async function loadProfile() {
  try {
    const me = await apiRequest("/api/me/", "GET");
    currentUserId = me.id;

    profileUsernameEl.value = me.username || "";
    profileEmailEl.value = me.email || "";
    profileRoleEl.textContent = `Role: ${me.role}`;
    avatarCircle.textContent = (me.username || "U")[0].toUpperCase();
  } catch (err) {
    showMessage(msg, "❌ Failed to load profile.", "error");
  }
}

async function loadMyStats() {
  try {
    const data = await apiRequest("/api/transactions/", "GET");
    const all = Array.isArray(data) ? data : [];

    const mySales = all.filter(t =>
      t.tx_type === "sale" &&
      t.status === "successful"
    );

    const tKey = todayKey();
    const mKey = monthPrefix();

    const total = mySales.reduce((s, t) => s + Number(t.amount || 0), 0);
    const today = mySales
      .filter(t => safeText(t.created_at).slice(0, 10) === tKey)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const month = mySales
      .filter(t => safeText(t.created_at).slice(0, 7) === mKey)
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    statTotalSales.textContent = formatKES(total);
    statSalesCount.textContent = String(mySales.length);
    statTodaySales.textContent = formatKES(today);
    statMonthSales.textContent = formatKES(month);

    // Recent sales table
    const recent = mySales
      .slice()
      .sort((a, b) => safeText(b.created_at).localeCompare(safeText(a.created_at)))
      .slice(0, 10);

    if (!recent.length) {
      myRecentSales.innerHTML = `<tr><td colspan="7">No sales yet.</td></tr>`;
    } else {
      myRecentSales.innerHTML = recent.map(s => `
        <tr>
          <td>${s.created_at ? new Date(s.created_at).toLocaleString() : "—"}</td>
          <td>${safeText(s.department) || "—"}</td>
          <td>${safeText(s.employee) || "—"}</td>
          <td>${safeText(s.service) || "—"}</td>
          <td><strong>${formatKES(s.amount)}</strong></td>
          <td>${badgeHTML(s.channel || "—", `channel-${s.channel || "other"}`)}</td>
          <td>${badgeHTML(s.status || "—", `status-${s.status || "other"}`)}</td>
        </tr>
      `).join("");
    }
  } catch (err) {
    myRecentSales.innerHTML = `<tr><td colspan="7">Failed to load.</td></tr>`;
  }
}

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    username: profileUsernameEl.value.trim(),
    email: profileEmailEl.value.trim(),
  };

  if (!payload.username) {
    showMessage(msg, "❌ Username is required.", "error");
    return;
  }

  try {
    showMessage(msg, "Updating profile...", "success");
    await apiRequest(`/api/users/${currentUserId}/`, "PATCH", payload);
    showMessage(msg, "✅ Profile updated successfully.", "success");
    avatarCircle.textContent = (payload.username)[0].toUpperCase();

    // Update stored user
    const me = getCurrentUser();
    if (me) {
      me.username = payload.username;
      setCurrentUser(me);
    }
  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
  }
});

(async function init() {
  await loadProfile();
  await loadMyStats();
})();