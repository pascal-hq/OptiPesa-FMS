requireAuth();

const deptSelect = document.getElementById("department");
const empSelect = document.getElementById("employee");
const svcSelect = document.getElementById("service");
const form = document.getElementById("saleForm");
const msg = document.getElementById("message");

let departments = [];
let employees = [];
let services = [];

function resetSelect(selectEl, placeholderText) {
  selectEl.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = placeholderText;
  selectEl.appendChild(opt);
}

function populateSelect(selectEl, items, valueKey, labelFn, placeholder) {
  resetSelect(selectEl, placeholder);
  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item[valueKey];
    opt.textContent = labelFn(item);
    selectEl.appendChild(opt);
  });
}

async function loadData() {
  try {
    showMessage(msg, "Loading data...", "success");

    departments = await apiRequest("/api/departments/", "GET");
    employees = await apiRequest("/api/employees/", "GET");
    services = await apiRequest("/api/services/", "GET");

    populateSelect(
      deptSelect,
      departments,
      "id",
      (d) => d.name,
      "Select department"
    );

    resetSelect(empSelect, "Select department first");
    resetSelect(svcSelect, "Select department first");

    showMessage(msg, "", "success");
  } catch (err) {
    showMessage(msg, "Failed to load data: " + err.message, "error");
  }
}

deptSelect.addEventListener("change", () => {
  const deptId = deptSelect.value ? Number(deptSelect.value) : null;

  if (!deptId) {
    resetSelect(empSelect, "Select department first");
    resetSelect(svcSelect, "Select department first");
    return;
  }

  const filteredEmps = employees.filter((e) => e.department === deptId);
  const filteredSvcs = services.filter((s) => s.department === deptId);

  populateSelect(
    empSelect,
    filteredEmps,
    "id",
    (e) => e.full_name,
    "Select employee (optional)"
  );

  populateSelect(
    svcSelect,
    filteredSvcs,
    "id",
    (s) => `${s.name}`,
    "Select service (optional)"
  );
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    department: deptSelect.value ? Number(deptSelect.value) : null,
    employee: empSelect.value ? Number(empSelect.value) : null,
    service: svcSelect.value ? Number(svcSelect.value) : null,
    customer_name: document.getElementById("customerName").value.trim(),
    amount: Number(document.getElementById("amount").value),
    channel: document.getElementById("channel").value,
    reference: document.getElementById("reference").value.trim(),
    narration: document.getElementById("narration").value.trim(),
  };

  // Remove empty optional fields to keep payload clean
  if (!payload.customer_name) delete payload.customer_name;
  if (!payload.reference) delete payload.reference;
  if (!payload.narration) delete payload.narration;
  if (!payload.department) delete payload.department;
  if (!payload.employee) delete payload.employee;
  if (!payload.service) delete payload.service;

  try {
    showMessage(msg, "Submitting sale...", "success");
    const res = await apiRequest("/api/transactions/sale/", "POST", payload);

    showMessage(
      msg,
      `✅ Sale recorded. Transaction ID: ${res.transaction_id} | Status: ${res.status}`,
      "success"
    );

    form.reset();
    resetSelect(empSelect, "Select department first");
    resetSelect(svcSelect, "Select department first");
  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
  }
});

loadData();