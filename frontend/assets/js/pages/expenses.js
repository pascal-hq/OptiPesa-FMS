requireAuth();

console.log("✅ expenses.js loaded");

const msg = document.getElementById("message");
const deptSelect = document.getElementById("department");
const body = document.getElementById("expenseBody");
const form = document.getElementById("expenseForm");

function unwrapList(data) {
  // Supports: [] OR {results: []}
  return Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function setPlaceholder(selectEl, text) {
  selectEl.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = text;
  selectEl.appendChild(opt);
}

function fillDepartments(departments) {
  setPlaceholder(deptSelect, "Select department");
  departments.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    deptSelect.appendChild(opt);
  });
}

function renderExpenses(expenses) {
  body.innerHTML = "";

  if (!expenses.length) {
    body.innerHTML = `<tr><td colspan="5">No expenses recorded yet.</td></tr>`;
    return;
  }

  expenses.forEach((e) => {
    const deptName =
      e.department_name ||
      (e.department && e.department.name) ||
      e.department?.name ||
      e.department ||
      "";

    const recordedBy =
      e.recorded_by_username ||
      (e.recorded_by && e.recorded_by.username) ||
      e.recorded_by?.username ||
      e.recorded_by ||
      "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.expense_date || ""}</td>
      <td>${deptName}</td>
      <td>${formatKES(e.amount)}</td>
      <td>${e.description || ""}</td>
      <td>${recordedBy}</td>
    `;
    body.appendChild(tr);
  });
}

async function loadDepartments() {
  setPlaceholder(deptSelect, "Loading departments...");

  const data = await apiRequest("/api/departments/", "GET");
  const departments = unwrapList(data);

  console.log("Departments loaded:", departments);

  if (!departments.length) {
    setPlaceholder(deptSelect, "No departments found (create in admin)");
    return [];
  }

  fillDepartments(departments);
  return departments;
}

async function loadExpenses() {
  body.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;

  const data = await apiRequest("/api/expenses/", "GET");
  const expenses = unwrapList(data);

  console.log("Expenses loaded:", expenses);

  renderExpenses(expenses);
  return expenses;
}

async function init() {
  try {
    showMessage(msg, "Loading expenses...", "success");

    await loadDepartments();
    await loadExpenses();

    const dateEl = document.getElementById("expense_date");
    dateEl.value = todayISO();

    showMessage(msg, "", "success");
  } catch (err) {
    console.error(err);
    showMessage(msg, "❌ " + err.message, "error");
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    department: Number(deptSelect.value),
    expense_date: document.getElementById("expense_date").value,
    amount: Number(document.getElementById("amount").value),
    description: document.getElementById("description").value.trim(),
  };

  if (!payload.department) {
    showMessage(msg, "❌ Please select a department.", "error");
    return;
  }

  try {
    showMessage(msg, "Saving expense...", "success");

    await apiRequest("/api/expenses/", "POST", payload);

    showMessage(msg, "✅ Expense saved.", "success");
    form.reset();
    document.getElementById("expense_date").value = todayISO();

    await loadExpenses();
  } catch (err) {
    console.error(err);
    showMessage(msg, "❌ " + err.message, "error");
  }
});

init();