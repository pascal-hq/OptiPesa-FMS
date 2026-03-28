requireAuth();

const msg = document.getElementById("message");
const deptSelect = document.getElementById("department");
const form = document.getElementById("serviceForm");
const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelBtn");
const nameEl = document.getElementById("name");
const priceEl = document.getElementById("price");
const descEl = document.getElementById("description");
const isActiveEl = document.getElementById("is_active");
const servicesBody = document.getElementById("servicesBody");
const svcSearchEl = document.getElementById("svcSearch");
const svcStatusFilterEl = document.getElementById("svcStatusFilter");
const servicesPaginationEl = document.getElementById("servicesPagination");

let editingId = null;
let allServices = [];

function safe(v) {
  return (v === null || v === undefined) ? "" : String(v);
}

function setEditMode(svc) {
  editingId = svc.id;
  deptSelect.value = svc.department;
  nameEl.value = svc.name;
  priceEl.value = svc.price;
  descEl.value = svc.description || "";
  isActiveEl.checked = svc.is_active;
  submitBtn.textContent = "Update Service";
  cancelBtn.style.display = "inline-block";
  nameEl.focus();
}

function resetForm() {
  editingId = null;
  form.reset();
  isActiveEl.checked = true;
  submitBtn.textContent = "Save Service";
  cancelBtn.style.display = "none";
}

function renderDepartments(rows) {
  deptSelect.innerHTML = `<option value="">Select department...</option>`;
  if (!rows || rows.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No departments found (create one first)";
    deptSelect.appendChild(opt);
    return;
  }
  rows.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    deptSelect.appendChild(opt);
  });
}

function attachRowHandlers() {
  servicesBody.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      const data = await apiRequest(`/api/services/${id}/`, "GET");
      setEditMode(data);
    });
  });

  servicesBody.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      if (!confirm("Delete this service? If it has transactions, it will be marked Inactive instead.")) return;
      try {
        await apiRequest(`/api/services/${id}/`, "DELETE");
        showMessage(msg, "✅ Service deleted.", "success");
      } catch (err) {
        try {
          await apiRequest(`/api/services/${id}/`, "PATCH", { is_active: false });
          showMessage(msg, "⚠️ Service has transactions — marked as Inactive instead.", "success");
        } catch (err2) {
          showMessage(msg, "❌ " + err2.message, "error");
        }
      }
      await loadServices();
    });
  });
}

const servicesPaginator = createPaginator({
  containerEl: servicesPaginationEl,
  pageSize: 20,
  onPageChange(rows) {
    servicesBody.innerHTML = "";
    if (!rows || rows.length === 0) {
      servicesBody.innerHTML = `<tr><td colspan="7">No services yet.</td></tr>`;
      return;
    }
    rows.forEach((s) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${safe(s.name)}</td>
        <td>${safe(s.department_name || s.department)}</td>
        <td>${formatKES(s.price)}</td>
        <td>${s.is_active === false ? "Inactive" : "Active"}</td>
        <td>${safe(s.description)}</td>
        <td><button class="btn-edit" data-id="${s.id}">Edit</button></td>
        <td><button class="btn-delete danger" data-id="${s.id}">Delete</button></td>
      `;
      servicesBody.appendChild(tr);
    });
    attachRowHandlers();
  },
});

function getFilteredServices() {
  const q = (svcSearchEl.value || "").trim().toLowerCase();
  const status = svcStatusFilterEl.value;

  return allServices.filter(s => {
    const statusOk = status === "all"
      ? true
      : status === "active" ? s.is_active !== false : s.is_active === false;
    if (!statusOk) return false;
    if (!q) return true;
    const hay = [
      s.name,
      s.department_name || String(s.department),
      s.description,
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

svcSearchEl.addEventListener("input", () => {
  servicesPaginator.setData(getFilteredServices());
});

svcStatusFilterEl.addEventListener("change", () => {
  servicesPaginator.setData(getFilteredServices());
});

function renderServices(rows) {
  allServices = rows;
  servicesPaginator.setData(getFilteredServices());
}

async function loadDepartments() {
  const data = await apiRequest("/api/departments/", "GET");
  const rows = Array.isArray(data) ? data : (data.results || []);
  renderDepartments(rows);
}

async function loadServices() {
  const data = await apiRequest("/api/services/", "GET");
  const rows = Array.isArray(data) ? data : (data.results || []);
  renderServices(rows);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    department: Number(deptSelect.value),
    name: nameEl.value.trim(),
    price: Number(priceEl.value),
    description: descEl.value.trim(),
    is_active: !!isActiveEl.checked,
  };

  if (!payload.department) { showMessage(msg, "❌ Please select a department.", "error"); return; }
  if (!payload.name) { showMessage(msg, "❌ Service name is required.", "error"); return; }
  if (!payload.price || payload.price <= 0) { showMessage(msg, "❌ Price must be greater than 0.", "error"); return; }

  try {
    showMessage(msg, "Saving...", "success");
    if (editingId) {
      await apiRequest(`/api/services/${editingId}/`, "PATCH", payload);
      showMessage(msg, "✅ Service updated.", "success");
    } else {
      await apiRequest("/api/services/", "POST", payload);
      showMessage(msg, "✅ Service saved.", "success");
    }
    resetForm();
    await loadServices();
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
    await loadServices();
    showMessage(msg, "", "success");
  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
  }
})();