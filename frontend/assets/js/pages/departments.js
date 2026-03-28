requireAuth();

const msg = document.getElementById("message");
const deptForm = document.getElementById("deptForm");
const nameEl = document.getElementById("name");
const descEl = document.getElementById("description");
const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelBtn");
const deptBody = document.getElementById("deptBody");
const deptSearchEl = document.getElementById("deptSearch");
const deptPaginationEl = document.getElementById("deptPagination");

let editingId = null;
let allDepartments = [];

function safe(v) {
  return (v === null || v === undefined) ? "" : String(v);
}

function setEditMode(dept) {
  editingId = dept.id;
  nameEl.value = dept.name;
  descEl.value = dept.description || "";
  submitBtn.textContent = "Update Department";
  cancelBtn.style.display = "inline-block";
  nameEl.focus();
}

function resetForm() {
  editingId = null;
  deptForm.reset();
  submitBtn.textContent = "Save Department";
  cancelBtn.style.display = "none";
}

function attachRowHandlers() {
  deptBody.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      const data = await apiRequest(`/api/departments/${id}/`, "GET");
      setEditMode(data);
    });
  });

  deptBody.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      if (!confirm("Delete this department? If it has transactions, it will be marked Inactive instead.")) return;
      try {
        await apiRequest(`/api/departments/${id}/`, "DELETE");
        showMessage(msg, "✅ Department deleted.", "success");
      } catch (err) {
        try {
          await apiRequest(`/api/departments/${id}/`, "PATCH", { is_active: false });
          showMessage(msg, "⚠️ Department has transactions — marked as Inactive instead.", "success");
        } catch (err2) {
          showMessage(msg, "❌ " + err2.message, "error");
        }
      }
      await loadDepartments();
    });
  });
}

const deptPaginator = createPaginator({
  containerEl: deptPaginationEl,
  pageSize: 20,
  onPageChange(rows) {
    deptBody.innerHTML = "";
    if (!rows || rows.length === 0) {
      deptBody.innerHTML = `<tr><td colspan="4">No departments yet.</td></tr>`;
      return;
    }
    rows.forEach((d) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${safe(d.name)}</td>
        <td>${safe(d.description)}</td>
        <td><button class="btn-edit" data-id="${d.id}">Edit</button></td>
        <td><button class="btn-delete danger" data-id="${d.id}">Delete</button></td>
      `;
      deptBody.appendChild(tr);
    });
    attachRowHandlers();
  },
});

function getFilteredDepartments() {
  const q = (deptSearchEl.value || "").trim().toLowerCase();
  return allDepartments.filter(d => {
    if (!q) return true;
    const hay = [d.name, d.description].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

deptSearchEl.addEventListener("input", () => {
  deptPaginator.setData(getFilteredDepartments());
});

function renderDepartments(rows) {
  allDepartments = rows;
  deptPaginator.setData(getFilteredDepartments());
}

async function loadDepartments() {
  const data = await apiRequest("/api/departments/", "GET");
  const rows = Array.isArray(data) ? data : (data.results || []);
  renderDepartments(rows);
}

deptForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    name: nameEl.value.trim(),
    description: descEl.value.trim(),
  };

  if (!payload.name) {
    showMessage(msg, "❌ Department name is required.", "error");
    return;
  }

  try {
    showMessage(msg, "Saving...", "success");
    if (editingId) {
      await apiRequest(`/api/departments/${editingId}/`, "PATCH", payload);
      showMessage(msg, "✅ Department updated.", "success");
    } else {
      await apiRequest("/api/departments/", "POST", payload);
      showMessage(msg, "✅ Department saved.", "success");
    }
    resetForm();
    await loadDepartments();
  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
  }
});

cancelBtn.addEventListener("click", () => {
  resetForm();
  showMessage(msg, "", "success");
});

(async function init() {
  try {
    showMessage(msg, "Loading...", "success");
    await loadDepartments();
    showMessage(msg, "", "success");
  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
  }
})();