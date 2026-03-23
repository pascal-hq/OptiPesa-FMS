function $(id) {
  return document.getElementById(id);
}

function showMessage(el, text, type = "error") {
  if (!el) return;
  el.textContent = text;
  el.className = type === "success" ? "msg success" : "msg error";
}

function formatKES(value) {
  const num = Number(value || 0);
  return `KES ${num.toLocaleString()}`;
}


/* ---- Role based sidebar control ---- */

async function applyRoleUI() {
  try {

    // Only run on pages with a sidebar
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    const me = await apiRequest("/api/me/", "GET");

    const role = String(me.role || "").toLowerCase();
    const isAdminManager = me.is_superuser || role === "admin" || role === "manager";

    if (!isAdminManager) {
      document.querySelectorAll(".admin-only").forEach((el) => {
        el.style.display = "none";
      });
    }

  } catch (err) {
    console.error("Role UI error:", err);
  }
}


/* run when page loads */

document.addEventListener("DOMContentLoaded", () => {
  applyRoleUI();
});

document.addEventListener("DOMContentLoaded", () => {
  const user = getCurrentUser();
  if (!user) return;

  if (user.role === "staff") {
    document.querySelectorAll(".admin-only").forEach(el => el.remove());
  }
});