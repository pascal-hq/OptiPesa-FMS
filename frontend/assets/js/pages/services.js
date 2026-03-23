requireAuth();

console.log("✅ services.js loaded");

const msg = document.getElementById("message");

const deptSelect = document.getElementById("department");
const form = document.getElementById("serviceForm");

const nameEl = document.getElementById("name");
const priceEl = document.getElementById("price");
const descEl = document.getElementById("description");
const isActiveEl = document.getElementById("is_active");

const servicesBody = document.getElementById("servicesBody");

function safe(v) {
  return (v === null || v === undefined) ? "" : String(v);
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

function renderServices(rows) {
  servicesBody.innerHTML = "";

  if (!rows || rows.length === 0) {
    servicesBody.innerHTML = `<tr><td colspan="5">No services yet.</td></tr>`;
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
    `;
    servicesBody.appendChild(tr);
  });
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

  try {
    showMessage(msg, "Saving service...", "success");

    const payload = {
      department: Number(deptSelect.value),
      name: nameEl.value.trim(),
      price: Number(priceEl.value),
      description: descEl.value.trim(),
      is_active: !!isActiveEl.checked,
    };

    if (!payload.department) throw new Error("Please select a department.");
    if (!payload.name) throw new Error("Service name is required.");
    if (!payload.price || payload.price <= 0) throw new Error("Price must be greater than 0.");

    await apiRequest("/api/services/", "POST", payload);

    showMessage(msg, "✅ Service saved.", "success");
    form.reset();
    isActiveEl.checked = true;

    await loadServices();
  } catch (err) {
    console.error(err);
    showMessage(msg, "❌ " + err.message, "error");
  }
});

(async function init() {
  try {
    showMessage(msg, "Loading...", "success");
    await loadDepartments();
    await loadServices();
    showMessage(msg, "", "success");
  } catch (err) {
    console.error(err);
    showMessage(msg, "❌ " + err.message, "error");
  }
})();