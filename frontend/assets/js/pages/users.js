requireAuth();

const msg = document.getElementById("message");
const userForm = document.getElementById("userForm");
const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelBtn");
const usernameEl = document.getElementById("username");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const roleEl = document.getElementById("role");
const isActiveEl = document.getElementById("is_active");
const usersBody = document.getElementById("usersBody");
const userSearchEl = document.getElementById("userSearch");
const roleFilterEl = document.getElementById("roleFilter");
const usersPaginationEl = document.getElementById("usersPagination");

let editingId = null;
let allUsers = [];
let currentUserId = null;

function safe(v) {
  return (v === null || v === undefined) ? "" : String(v);
}

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString();
}

function roleBadge(role) {
  const colors = {
    admin: "type-deposit",
    manager: "type-transfer",
    staff: "type-sale"
  };
  return `<span class="badge ${colors[role] || ""}">${role}</span>`;
}

async function loadCurrentUser() {
  try {
    const me = await apiRequest("/api/me/", "GET");
    currentUserId = me.id;
  } catch (err) {
    console.error("Could not load current user:", err);
  }
}

function setEditMode(user) {
  editingId = user.id;
  usernameEl.value = user.username;
  emailEl.value = user.email || "";
  passwordEl.value = "";
  roleEl.value = user.role;
  isActiveEl.checked = user.is_active;
  passwordEl.placeholder = "Leave blank to keep current password";
  submitBtn.textContent = "Update User";
  cancelBtn.style.display = "inline-block";
  usernameEl.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  editingId = null;
  userForm.reset();
  isActiveEl.checked = true;
  passwordEl.placeholder = "Minimum 6 characters";
  submitBtn.textContent = "Save User";
  cancelBtn.style.display = "none";
}

function attachRowHandlers() {
  usersBody.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      const data = await apiRequest(`/api/users/${id}/`, "GET");
      setEditMode(data);
    });
  });

  usersBody.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      if (id === currentUserId) {
        showMessage(msg, "❌ You cannot delete your own account.", "error");
        return;
      }
      if (!confirm("Delete this user? This cannot be undone.")) return;
      try {
        await apiRequest(`/api/users/${id}/`, "DELETE");
        showMessage(msg, "✅ User deleted.", "success");
        await loadUsers();
      } catch (err) {
        showMessage(msg, "❌ " + err.message, "error");
      }
    });
  });
}

const usersPaginator = createPaginator({
  containerEl: usersPaginationEl,
  pageSize: 20,
  onPageChange(rows) {
    usersBody.innerHTML = "";
    if (!rows || rows.length === 0) {
      usersBody.innerHTML = `<tr><td colspan="7">No users found.</td></tr>`;
      return;
    }
    rows.forEach((u) => {
      const isCurrentUser = u.id === currentUserId;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          ${safe(u.username)}
          ${isCurrentUser
            ? '<span class="badge channel-internal" style="margin-left:6px;">You</span>'
            : ""}
        </td>
        <td>${safe(u.email) || "—"}</td>
        <td>${roleBadge(u.role)}</td>
        <td>${u.is_active ? "Active" : "Inactive"}</td>
        <td>${formatDate(u.date_joined)}</td>
        <td>
          <button class="btn-edit" data-id="${u.id}">Edit</button>
        </td>
        <td>
          ${isCurrentUser
            ? "—"
            : `<button class="btn-delete danger" data-id="${u.id}">Delete</button>`}
        </td>
      `;
      usersBody.appendChild(tr);
    });
    attachRowHandlers();
  },
});

function getFilteredUsers() {
  const q = (userSearchEl.value || "").trim().toLowerCase();
  const role = roleFilterEl.value;

  return allUsers.filter(u => {
    const roleOk = role === "all" ? true : u.role === role;
    if (!roleOk) return false;
    if (!q) return true;
    const hay = [u.username, u.email, u.role].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

userSearchEl.addEventListener("input", () => {
  usersPaginator.setData(getFilteredUsers());
});

roleFilterEl.addEventListener("change", () => {
  usersPaginator.setData(getFilteredUsers());
});

function renderUsers(rows) {
  allUsers = rows;
  usersPaginator.setData(getFilteredUsers());
}

async function loadUsers() {
  const data = await apiRequest("/api/users/", "GET");
  const rows = Array.isArray(data) ? data : [];
  renderUsers(rows);
}

userForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    username: usernameEl.value.trim(),
    email: emailEl.value.trim(),
    role: roleEl.value,
    is_active: !!isActiveEl.checked,
  };

  if (passwordEl.value.trim()) {
    payload.password = passwordEl.value.trim();
  }

  if (!payload.username) {
    showMessage(msg, "❌ Username is required.", "error");
    return;
  }

  if (!editingId && !payload.password) {
    showMessage(msg, "❌ Password is required for new users.", "error");
    return;
  }

  try {
    showMessage(msg, "Saving...", "success");

    if (editingId) {
      await apiRequest(`/api/users/${editingId}/`, "PATCH", payload);
      showMessage(msg, "✅ User updated successfully.", "success");
    } else {
      await apiRequest("/api/users/", "POST", payload);
      showMessage(msg, "✅ User created successfully.", "success");
    }

    resetForm();
    await loadUsers();
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
    await loadCurrentUser();
    await loadUsers();
    showMessage(msg, "", "success");
  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
  }
})();