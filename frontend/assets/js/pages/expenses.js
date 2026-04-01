requireAuth();

const msg = document.getElementById("message");
const deptSelect = document.getElementById("department");
const body = document.getElementById("expenseBody");
const form = document.getElementById("expenseForm");
const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelBtn");
const expensePaginationEl = document.getElementById("expensePagination");
const expSearchEl = document.getElementById("expSearch");
const expDeptFilterEl = document.getElementById("expDeptFilter");

let editingId = null;
let allExpenses = [];

function unwrapList(data) {
  return Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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
  expDeptFilterEl.innerHTML = `<option value="all">All Departments</option>`;

  departments.forEach((d) => {
    // Form select
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    deptSelect.appendChild(opt);

    // Filter select
    const fopt = document.createElement("option");
    fopt.value = d.id;
    fopt.textContent = d.name;
    expDeptFilterEl.appendChild(fopt);
  });
}

function setEditMode(exp) {
  editingId = exp.id;
  deptSelect.value = exp.department;
  document.getElementById("expense_date").value = exp.expense_date;
  document.getElementById("amount").value = exp.amount;
  document.getElementById("description").value = exp.description;
  submitBtn.textContent = "Update Expense";
  cancelBtn.style.display = "inline-block";
  document.getElementById("amount").focus();
}

function resetForm() {
  editingId = null;
  form.reset();
  document.getElementById("expense_date").value = todayISO();
  submitBtn.textContent = "Save Expense";
  cancelBtn.style.display = "none";
}

function getFilteredExpenses() {
  const q = (expSearchEl.value || "").trim().toLowerCase();
  const deptId = expDeptFilterEl.value;

  return allExpenses.filter(e => {
    const deptOk = deptId === "all" ? true : String(e.department) === deptId;
    if (!deptOk) return false;
    if (!q) return true;
    const hay = [
      e.description,
      e.department_name || String(e.department),
      e.recorded_by_username || String(e.recorded_by),
      e.expense_date,
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

function attachRowHandlers() {
  body.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      const data = await apiRequest(`/api/expenses/${id}/`, "GET");
      setEditMode(data);
    });
  });

  body.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      if (!confirm("Delete this expense? This cannot be undone.")) return;
      try {
        await apiRequest(`/api/expenses/${id}/`, "DELETE");
        showMessage(msg, "✅ Expense deleted.", "success");
        await loadExpenses();
      } catch (err) {
        showMessage(msg, "❌ " + err.message, "error");
      }
    });
  });
}

const expensePaginator = createPaginator({
  containerEl: expensePaginationEl,
  pageSize: 20,
  onPageChange(expenses) {
    body.innerHTML = "";
    if (!expenses.length) {
      body.innerHTML = `<tr><td colspan="7">No expenses recorded yet.</td></tr>`;
      return;
    }
    expenses.forEach((e) => {
      const deptName = e.department_name || e.department || "";
      const recordedBy = e.recorded_by_username || e.recorded_by || "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${e.expense_date || ""}</td>
        <td>${deptName}</td>
        <td>${formatKES(e.amount)}</td>
        <td>${e.description || ""}</td>
        <td>${recordedBy}</td>
        <td><button class="btn-edit" data-id="${e.id}">Edit</button></td>
        <td><button class="btn-delete danger" data-id="${e.id}">Delete</button></td>
      `;
      body.appendChild(tr);
    });
    attachRowHandlers();
  },
});

expSearchEl.addEventListener("input", () => {
  expensePaginator.setData(getFilteredExpenses());
});

expDeptFilterEl.addEventListener("change", () => {
  expensePaginator.setData(getFilteredExpenses());
});

async function loadDepartments() {
  setPlaceholder(deptSelect, "Loading departments...");
  const data = await apiRequest("/api/departments/", "GET");
  const departments = unwrapList(data);
  if (!departments.length) {
    setPlaceholder(deptSelect, "No departments found");
    return;
  }
  fillDepartments(departments);
}

async function loadExpenses() {
  body.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`;
  const data = await apiRequest("/api/expenses/", "GET");
  allExpenses = unwrapList(data);
  expensePaginator.setData(getFilteredExpenses());
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    department: Number(deptSelect.value),
    expense_date: document.getElementById("expense_date").value,
    amount: Number(document.getElementById("amount").value),
    description: document.getElementById("description").value.trim(),
  };

  if (!payload.department) { showMessage(msg, "❌ Please select a department.", "error"); return; }
  if (!payload.expense_date) { showMessage(msg, "❌ Please select a date.", "error"); return; }
  if (!payload.amount || payload.amount <= 0) { showMessage(msg, "❌ Amount must be greater than 0.", "error"); return; }
  if (!payload.description) { showMessage(msg, "❌ Description is required.", "error"); return; }

  try {
    showMessage(msg, "Saving...", "success");
    if (editingId) {
      await apiRequest(`/api/expenses/${editingId}/`, "PATCH", payload);
      showMessage(msg, "✅ Expense updated.", "success");
    } else {
      await apiRequest("/api/expenses/", "POST", payload);
      showMessage(msg, "✅ Expense saved.", "success");
    }
    resetForm();
    await loadExpenses();
  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
  }
});

cancelBtn.addEventListener("click", () => {
  resetForm();
  showMessage(msg, "", "success");
});

async function init() {
  try {
    showMessage(msg, "Loading expenses...", "success");
    await loadDepartments();
    await loadExpenses();
    document.getElementById("expense_date").value = todayISO();
    showMessage(msg, "", "success");
  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
  }
}

document.getElementById("downloadBtn").addEventListener("click", () => {
  downloadExcel(
    allExpenses,
    "expenses",
    [
      { key: "expense_date", label: "Date" },
      { key: "department_name", label: "Department" },
      { key: "amount", label: "Amount (KES)" },
      { key: "description", label: "Description" },
      { key: "recorded_by_username", label: "Recorded By" },
    ]
  );
});

init();
