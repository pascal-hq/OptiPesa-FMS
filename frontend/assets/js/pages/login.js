const form = document.getElementById("loginForm");
const msg = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage(msg, "Logging in...", "success");

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    const data = await apiRequest("/api/token/", "POST", { username, password });
    saveTokens(data.access, data.refresh);

    // fetch current user (role info)
    const me = await apiRequest("/api/me/", "GET");
    setCurrentUser(me);

    showMessage(msg, "Login successful!", "success");

    // staff goes to Record Sale, admin/manager goes to dashboard
    const role = (me?.role || "").toLowerCase();
    if (me?.is_superuser || role === "admin" || role === "manager") {
      window.location.href = "dashboard.html";
    } else {
      window.location.href = "sales.html";
    }
  } catch (err) {
    showMessage(msg, err.message, "error");
  }
});