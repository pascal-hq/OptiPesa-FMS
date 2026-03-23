function isAdminLike(user) {
  if (!user) return false;
  const role = (user.role || "").toLowerCase();
  return user.is_superuser || role === "admin" || role === "manager";
}

function applyRoleNav() {
  const user = getCurrentUser();
  const adminLike = isAdminLike(user);

  // Hide admin-only links for staff
  const adminOnlySelectors = [
    'a[href="dashboard.html"]',
    'a[href="departments.html"]',
    'a[href="employees.html"]',
    'a[href="services.html"]',
    'a[href="expenses.html"]',
    'a[href="analytics.html"]',
  ];

  adminOnlySelectors.forEach((sel) => {
    const link = document.querySelector(sel);
    if (link && !adminLike) {
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

  const path = (window.location.pathname || "").toLowerCase();

  // pages staff should not access
  const adminPages = [
    "dashboard.html",
    "departments.html",
    "employees.html",
    "services.html",
    "expenses.html",
    "analytics.html",
  ];

  const isAdminPage = adminPages.some((p) => path.endsWith(p));

  if (isAdminPage && !adminLike) {
    window.location.href = "sales.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // apply nav + guard only on pages that have sidebar
  applyRoleNav();
  guardPage();
});