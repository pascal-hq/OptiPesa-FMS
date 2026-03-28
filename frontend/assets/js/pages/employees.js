requireAuth();

const msg = document.getElementById("message");
const departmentSelect = document.getElementById("department");
const employeeForm = document.getElementById("employeeForm");
const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelBtn");
const fullNameEl = document.getElementById("full_name");
const phoneEl = document.getElementById("phone");
const emailEl = document.getElementById("email");
const hiredAtEl = document.getElementById("hired_at");
const isActiveEl = document.getElementById("is_active");
const employeesBody = document.getElementById("employeesBody");
const employeePaginationEl = document.getElementById("employeePagination");
const empSearchEl = document.getElementById("empSearch");
const empStatusFilterEl = document.getElementById("empStatusFilter");

let editingId = null;
let allEmployees = [];

function safe(v) {
  return (v === null || v === undefined) ? "" : String(v);
}

function setEditMode(emp) {
  editingId = emp.id;
  departmentSelect.value = emp.department;
  fullNameEl.value = emp.full_name;
  phoneEl.value = emp.phone || "";
  emailEl.value = emp.email || "";
  hiredAtEl.value = emp.hired_at || "";
  isActiveEl.checked = emp.is_active;
  submitBtn.textContent = "Update Employee";
  cancelBtn.style.display = "inline-block";
  fullNameEl.focus();
}

function resetForm() {
  editingId = null;
  employeeForm.reset();
  isActiveEl.checked = true;
  submitBtn.textContent = "Save Employee";
  cancelBtn.style.display = "none";
}

function renderDepartments(depts) {
  departmentSelect.innerHTML = `<option value="">Select department...</option>`;
  depts.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    departmentSelect.appendChild(opt);
  });
}

function attachRowHandlers() {
  employeesBody.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      const data = await apiRequest(`/api/employees/${id}/`, "GET");
      setEditMode(data);
    });
  });

  employeesBody.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      if (!confirm("Delete this employee? If they have transactions, they will be marked Inactive instead.")) return;
      try {
        await apiRequest(`/api/employees/${id}/`, "DELETE");
        showMessage(msg, "✅ Employee deleted.", "success");
      } catch (err) {
        try {
          await apiRequest(`/api/employees/${id}/`, "PATCH", { is_active: false });
          showMessage(msg, "⚠️ Employee has transactions — marked as Inactive instead.", "success");
        } catch (err2) {
          showMessage(msg, "❌ " + err2.message, "error");
        }
      }
      await loadEmployees();
    });
  });
}

const employeePaginator = createPaginator({
  containerEl: employeePaginationEl,
  pageSize: 20,
  onPageChange(rows) {
    employeesBody.innerHTML = "";
    if (!rows || rows.length === 0) {
      employeesBody.innerHTML = `<tr><td colspan="8">No employees yet.</td></tr>`;
      return;
    }
    rows.forEach((e) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${safe(e.full_name)}</td>
        <td>${safe(e.department_name || e.department)}</td>
        <td>${safe(e.phone)}</td>
        <td>${safe(e.email)}</td>
        <td>${e.is_active ? "Active" : "Inactive"}</td>
        <td>${safe(e.hired_at)}</td>
        <td><button class="btn-edit" data-id="${e.id}">Edit</button></td>
        <td><button class="btn-delete danger" data-id="${e.id}">Delete</button></td>
      `;
      employeesBody.appendChild(tr);
    });
    attachRowHandlers();
  },
});

function getFilteredEmployees() {
  const q = (empSearchEl.value || "").trim().toLowerCase();
  const status = empStatusFilterEl.value;

  return allEmployees.filter(e => {
    const statusOk = status === "all"
      ? true
      : status === "active" ? e.is_active : !e.is_active;
    if (!statusOk) return false;
    if (!q) return true;
    const hay = [
      e.full_name,
      e.department_name || String(e.department),
      e.phone,
      e.email,
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

empSearchEl.addEventListener("input", () => {
  employeePaginator.setData(getFilteredEmployees());
});

empStatusFilterEl.addEventListener("change", () => {
  employeePaginator.setData(getFilteredEmployees());
});

function renderEmployees(rows) {
  allEmployees = rows;
  employeePaginator.setData(getFilteredEmployees());
}

async function loadDepartments() {
  const data = await apiRequest("/api/departments/", "GET");
  const rows = Array.isArray(data) ? data : (data.results || []);
  renderDepartments(rows);
}

async function loadEmployees() {
  const data = await apiRequest("/api/employees/", "GET");
  const rows = Array.isArray(data) ? data : (data.results || []);
  renderEmployees(rows);
}

employeeForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    department: Number(departmentSelect.value),
    full_name: fullNameEl.value.trim(),
    phone: phoneEl.value.trim(),
    email: emailEl.value.trim(),
    hired_at: hiredAtEl.value || null,
    is_active: !!isActiveEl.checked,
  };

  if (!payload.department) { showMessage(msg, "❌ Please select a department.", "error"); return; }
  if (!payload.full_name) { showMessage(msg, "❌ Full name is required.", "error"); return; }

  try {
    showMessage(msg, "Saving...", "success");
    if (editingId) {
      await apiRequest(`/api/employees/${editingId}/`, "PATCH", payload);
      showMessage(msg, "✅ Employee updated.", "success");
    } else {
      await apiRequest("/api/employees/", "POST", payload);
      showMessage(msg, "✅ Employee saved.", "success");
    }
    resetForm();
    await loadEmployees();
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
    await loadEmployees();
    showMessage(msg, "", "success");
  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
  }
})();