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
/* ---- Pagination Helper ---- */
function createPaginator(options) {
  /*
    options = {
      containerEl,   // element to render pagination controls into
      pageSize,      // records per page (default 20)
      onPageChange,  // callback(pageData) called with current page's slice
    }
  */
  let allData = [];
  let currentPage = 1;
  const pageSize = options.pageSize || 20;

  function totalPages() {
    return Math.max(1, Math.ceil(allData.length / pageSize));
  }

  function currentSlice() {
    const start = (currentPage - 1) * pageSize;
    return allData.slice(start, start + pageSize);
  }

  function render() {
    options.onPageChange(currentSlice());

    const total = totalPages();
    const container = options.containerEl;
    if (!container) return;

    if (total <= 1) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = `
      <div class="pagination">
        <button class="pg-prev" ${currentPage === 1 ? "disabled" : ""}>← Prev</button>
        <span class="pg-info">Page ${currentPage} of ${total} (${allData.length} records)</span>
        <button class="pg-next" ${currentPage === total ? "disabled" : ""}>Next →</button>
      </div>
    `;

    container.querySelector(".pg-prev").addEventListener("click", () => {
      if (currentPage > 1) { currentPage--; render(); }
    });

    container.querySelector(".pg-next").addEventListener("click", () => {
      if (currentPage < total) { currentPage++; render(); }
    });
  }

  return {
    setData(data) {
      allData = data || [];
      currentPage = 1;
      render();
    },
    refresh() {
      render();
    },
  };
}

/* ---- Search/Filter Helper ---- */
function createSearchFilter(options) {
  /*
    options = {
      inputEl,       // search input element
      getData,       // function that returns the full array
      filterFn,      // function(item, query) returns true/false
      onFilter,      // callback(filteredData) — usually paginator.setData
    }
  */
  function apply() {
    const q = (options.inputEl.value || "").trim().toLowerCase();
    const all = options.getData();
    const filtered = q ? all.filter(item => options.filterFn(item, q)) : all;
    options.onFilter(filtered);
  }

  options.inputEl.addEventListener("input", apply);

  return { apply };
}
/* ---- Dark Mode ---- */
function initDarkMode() {
  const saved = localStorage.getItem("darkMode");
  if (saved === "true") {
    document.body.classList.add("dark-mode");
  }
  // Update toggle button icon if it exists
  const btn = document.getElementById("darkToggle");
  if (btn) {
    btn.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
  }
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("darkMode", isDark);
  const btn = document.getElementById("darkToggle");
  if (btn) btn.textContent = isDark ? "☀️" : "🌙";
}

document.addEventListener("DOMContentLoaded", () => {
  initDarkMode();
});

/* ---- Excel Download Helper ---- */
function downloadExcel(data, filename, columns) {
  if (!data || data.length === 0) {
    alert("No data to download.");
    return;
  }
  const rows = data.map(item => {
    const row = {};
    columns.forEach(col => {
      row[col.label] = item[col.key] !== null && item[col.key] !== undefined
        ? item[col.key]
        : "";
    });
    return row;
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = columns.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, filename);
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ---- Business Settings Helpers ---- */
function getBusinessSettings() {
  const defaults = {
    name: "OptiPesa",
    tagline: "Financial Management System",
    address: "",
    phone: "",
    email: "",
    currency: "KES",
  };
  const saved = localStorage.getItem("businessSettings");
  return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
}

function saveBusinessSettings(settings) {
  localStorage.setItem("businessSettings", JSON.stringify(settings));
}

/* ---- Expense Alert Helper ---- */
function checkExpenseAlert(totalExpenses, threshold) {
  if (!threshold || threshold <= 0) return null;
  const pct = (totalExpenses / threshold) * 100;
  if (pct >= 100) {
    return { type: "danger", message: `⚠️ Expenses have exceeded your monthly budget of KES ${Number(threshold).toLocaleString()}!` };
  } else if (pct >= 80) {
    return { type: "warning", message: `⚠️ Expenses are at ${Math.round(pct)}% of your monthly budget of KES ${Number(threshold).toLocaleString()}.` };
  }
  return null;
}

/* ---- Mobile Sidebar Toggle ---- */
function initMobileSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const toggleBtn = document.getElementById("sidebarToggle");

  if (!sidebar || !toggleBtn) return;

  // Create overlay
  let overlay = document.getElementById("sidebarOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "sidebarOverlay";
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
  }

  // Open sidebar
  function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("active");
    toggleBtn.textContent = "✕";
  }

  // Close sidebar
  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
    toggleBtn.textContent = "☰";
  }

  // Toggle on button click
  toggleBtn.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  // Close when clicking overlay
  overlay.addEventListener("click", () => {
    closeSidebar();
  });

  // Close when clicking a sidebar link on mobile
  sidebar.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 860) {
        closeSidebar();
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMobileSidebar();
});

/* ---- Toast Notifications ---- */
(function initToastContainer() {
  if (!document.getElementById("toastContainer")) {
    const container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
})();

function showToast(message, type = "success", title = null, duration = 3500) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️"
  };

  const titles = {
    success: title || "Success",
    error: title || "Error",
    warning: title || "Warning",
    info: title || "Info"
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || "ℹ️"}</span>
    <div class="toast-body">
      <div class="toast-title">${titles[type]}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.closest('.toast').remove()">✕</button>
  `;

  container.appendChild(toast);

  // Auto dismiss
  setTimeout(() => {
    toast.classList.add("hiding");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Override showMessage to also show toast
const _originalShowMessage = showMessage;
function showMessage(el, text, type = "error") {
  // Still update the inline message element
  if (el && text) {
    el.textContent = text;
    el.className = type === "success" ? "msg success" : "msg error";
  } else if (el) {
    el.textContent = "";
    el.className = "msg";
  }

  // Also show toast for non-empty messages
  if (text && text.trim()) {
    const toastType = type === "success" ? "success" : "error";
    showToast(text, toastType);
  }
}

/* ---- Session Timeout Warning ---- */
function initSessionTimeout() {
  // JWT tokens typically expire in 5 minutes (300 seconds)
  // Warn user 2 minutes before expiry
  const WARNING_BEFORE = 2 * 60 * 1000; // 2 minutes
  const CHECK_INTERVAL = 30 * 1000; // check every 30 seconds

  function getTokenExpiry() {
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  let warningShown = false;
  let warningToast = null;

  function checkSession() {
    const expiry = getTokenExpiry();
    if (!expiry) return;

    const now = Date.now();
    const timeLeft = expiry - now;

    if (timeLeft <= 0) {
      // Session expired
      showToast("Your session has expired. Please log in again.", "error", "Session Expired", 5000);
      setTimeout(() => {
        logout();
      }, 3000);
      return;
    }

    if (timeLeft <= WARNING_BEFORE && !warningShown) {
      warningShown = true;
      const minutes = Math.ceil(timeLeft / 60000);
      showToast(
        `Your session will expire in ${minutes} minute${minutes > 1 ? "s" : ""}. Save your work.`,
        "warning",
        "Session Expiring Soon",
        10000
      );
    }

    // Reset warning flag if session was refreshed
    if (timeLeft > WARNING_BEFORE) {
      warningShown = false;
    }
  }

  // Only run on authenticated pages
  if (localStorage.getItem("access_token")) {
    setInterval(checkSession, CHECK_INTERVAL);
    checkSession();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initSessionTimeout();
});

/* ---- Notifications Bell ---- */
let notifications = [];

function addNotification(icon, text, time = null) {
  notifications.unshift({
    icon,
    text,
    time: time || new Date().toLocaleTimeString(),
    id: Date.now()
  });

  // Keep max 20 notifications
  if (notifications.length > 20) notifications.pop();

  updateNotifBadge();
  renderNotifDropdown();
}

function updateNotifBadge() {
  const badge = document.getElementById("notifBadge");
  if (!badge) return;
  if (notifications.length > 0) {
    badge.textContent = notifications.length > 9 ? "9+" : notifications.length;
    badge.classList.add("visible");
  } else {
    badge.classList.remove("visible");
  }
}

function renderNotifDropdown() {
  const list = document.getElementById("notifList");
  if (!list) return;

  if (notifications.length === 0) {
    list.innerHTML = `<div class="notif-empty">🔔 No notifications yet</div>`;
    return;
  }

  list.innerHTML = notifications.map(n => `
    <div class="notif-item">
      <span class="notif-icon">${n.icon}</span>
      <div class="notif-text">
        ${n.text}
        <div class="notif-time">${n.time}</div>
      </div>
    </div>
  `).join("");
}

function initNotifBell() {
  const bell = document.getElementById("notifBell");
  const dropdown = document.getElementById("notifDropdown");
  const clearBtn = document.getElementById("notifClear");

  if (!bell || !dropdown) return;

  bell.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
    renderNotifDropdown();
  });

  document.addEventListener("click", () => {
    dropdown.classList.remove("open");
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      notifications = [];
      updateNotifBadge();
      renderNotifDropdown();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initNotifBell();
});