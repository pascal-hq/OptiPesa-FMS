requireAuth();

console.log("✅ departments.js loaded");

const msg = document.getElementById("message");
const deptForm = document.getElementById("deptForm");

const nameEl = document.getElementById("name");
const descEl = document.getElementById("description");

const deptBody = document.getElementById("deptBody");

function safe(v) {
  return (v === null || v === undefined) ? "" : String(v);
}

function renderDepartments(rows) {
  deptBody.innerHTML = "";

  if (!rows || rows.length === 0) {
    deptBody.innerHTML = `<tr><td colspan="2">No departments yet.</td></tr>`;
    return;
  }

  rows.forEach((d) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${safe(d.name)}</td>
      <td>${safe(d.description)}</td>
    `;
    deptBody.appendChild(tr);
  });
}

async function loadDepartments() {
  const data = await apiRequest("/api/departments/", "GET");
  const rows = Array.isArray(data) ? data : (data.results || []);
  renderDepartments(rows);
}

deptForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    showMessage(msg, "Saving department...", "success");

    const payload = {
      name: nameEl.value.trim(),
      description: descEl.value.trim(),
    };

    if (!payload.name) throw new Error("Department name is required.");

    await apiRequest("/api/departments/", "POST", payload);

    showMessage(msg, "✅ Department saved.", "success");
    deptForm.reset();

    await loadDepartments();
  } catch (err) {
    console.error(err);
    showMessage(msg, "❌ " + err.message, "error");
  }
});

(async function init() {
  try {
    showMessage(msg, "Loading...", "success");
    await loadDepartments();
    showMessage(msg, "", "success");
  } catch (err) {
    console.error(err);
    showMessage(msg, "❌ " + err.message, "error");
  }
})();