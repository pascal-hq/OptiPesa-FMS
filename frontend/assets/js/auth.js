function isLoggedIn() {
  return !!localStorage.getItem("access_token");
}

function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("current_user");
  window.location.href = "login.html";
}

// Redirect if not logged in
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
  }
}

// Optional: store simple user info (we’ll use later)
function setCurrentUser(userObj) {
  localStorage.setItem("current_user", JSON.stringify(userObj));
}
function getCurrentUser() {
  const raw = localStorage.getItem("current_user");
  return raw ? JSON.parse(raw) : null;
}