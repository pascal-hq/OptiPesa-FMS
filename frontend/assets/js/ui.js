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