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