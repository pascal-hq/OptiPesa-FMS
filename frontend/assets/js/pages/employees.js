requireAuth();

console.log("✅ employees.js loaded");

const msg = document.getElementById("message");

const departmentSelect = document.getElementById("department");
const employeeForm = document.getElementById("employeeForm");

const fullNameEl = document.getElementById("full_name");
const phoneEl = document.getElementById("phone");
const emailEl = document.getElementById("email");
const hiredAtEl = document.getElementById("hired_at");
const isActiveEl = document.getElementById("is_active");

const employeesBody = document.getElementById("employeesBody");

function safe(v) {
  return (v === null || v === undefined) ? "" : String(v);
}

function renderDepartments(depts) {
  departmentSelect.innerHTML = `<option value="">Select department...</option>`;
  if (!depts || depts.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No departments found (create one first)";
    departmentSelect.appendChild(opt);
    return;
  }

  depts.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    departmentSelect.appendChild(opt);
  });
}

function renderEmployees(rows) {
  employeesBody.innerHTML = "";

  if (!rows || rows.length === 0) {
    employeesBody.innerHTML = `<tr><td colspan="6">No employees yet.</td></tr>`;
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
    `;
    employeesBody.appendChild(tr);
  });
}

async function loadDepartments() {
  const data = await apiRequest("/api/departments/", "GET");
  // handle both paginated and non-paginated
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

  try {
    showMessage(msg, "Saving employee...", "success");

    const payload = {
      department: Number(departmentSelect.value),
      full_name: fullNameEl.value.trim(),
      phone: phoneEl.value.trim(),
      email: emailEl.value.trim(),
      hired_at: hiredAtEl.value || null,
      is_active: !!isActiveEl.checked,
    };

    if (!payload.department) throw new Error("Please select a department.");
    if (!payload.full_name) throw new Error("Full name is required.");

    await apiRequest("/api/employees/", "POST", payload);

    showMessage(msg, "✅ Employee saved.", "success");
    employeeForm.reset();
    isActiveEl.checked = true;

    await loadEmployees();
  } catch (err) {
    console.error(err);
    showMessage(msg, "❌ " + err.message, "error");
  }
});

(async function init() {
  try {
    showMessage(msg, "Loading...", "success");
    await loadDepartments();
    await loadEmployees();
    showMessage(msg, "", "success");
  } catch (err) {
    console.error(err);
    showMessage(msg, "❌ " + err.message, "error");
  }
})();