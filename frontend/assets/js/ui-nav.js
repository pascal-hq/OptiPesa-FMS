function isAdminLike(user) {
  if (!user) return false;
  const role = (user.role || "").toLowerCase();
  return user.is_superuser || role === "admin" || role === "manager";
}

function isAdmin(user) {
  if (!user) return false;
  const role = (user.role || "").toLowerCase();
  return user.is_superuser || role === "admin";
}

function applyRoleNav() {
  const user = getCurrentUser();
  const adminLike = isAdminLike(user);
  const admin = isAdmin(user);

  // Hide admin+manager links from staff
  const adminManagerSelectors = [
    'a[href="dashboard.html"]',
    'a[href="employees.html"]',
    'a[href="expenses.html"]',
    'a[href="analytics.html"]',
  ];

  adminManagerSelectors.forEach((sel) => {
    const link = document.querySelector(sel);
    if (link && !adminLike) {
      const li = link.closest("li");
      if (li) li.style.display = "none";
      else link.style.display = "none";
    }
  });

  // Hide admin-only links from managers and staff
  const adminOnlySelectors = [
    'a[href="departments.html"]',
    'a[href="services.html"]',
    'a[href="users.html"]',
    'a[href="settings.html"]',
    'a[href="accounts.html"]',
  ];

  adminOnlySelectors.forEach((sel) => {
    const link = document.querySelector(sel);
    if (link && !admin) {
      const li = link.closest("li");
      if (li) li.style.display = "none";
      else link.style.display = "none";
    }
  });
}

function guardPage() {
  requireAuth();
  const user = getCurrentUser();
  const adminLike = isAdminLike(user);
  const admin = isAdmin(user);
  const path = (window.location.pathname || "").toLowerCase();

  // Pages only admin+manager can access
  const adminManagerPages = [
    "dashboard.html",
    "employees.html",
    "expenses.html",
    "analytics.html",
  ];

  // Pages only admin can access
  const adminOnlyPages = [
    "departments.html",
    "services.html",
    "users.html",
    "settings.html",
    "accounts.html",
  ];

  const isAdminManagerPage = adminManagerPages.some((p) => path.endsWith(p));
  const isAdminOnlyPage = adminOnlyPages.some((p) => path.endsWith(p));

  if (isAdminManagerPage && !adminLike) {
    window.location.href = "sales.html";
  }

  if (isAdminOnlyPage && !admin) {
    window.location.href = "sales.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyRoleNav();
  guardPage();
});