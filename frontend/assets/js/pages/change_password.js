requireAuth();

const msg = document.getElementById("message");
const form = document.getElementById("changePasswordForm");
const currentPasswordEl = document.getElementById("current_password");
const newPasswordEl = document.getElementById("new_password");
const confirmPasswordEl = document.getElementById("confirm_password");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const current_password = currentPasswordEl.value.trim();
  const new_password = newPasswordEl.value.trim();
  const confirm_password = confirmPasswordEl.value.trim();

  if (!current_password) {
    showMessage(msg, "❌ Current password is required.", "error");
    return;
  }
  if (!new_password) {
    showMessage(msg, "❌ New password is required.", "error");
    return;
  }
  if (new_password.length < 6) {
    showMessage(msg, "❌ New password must be at least 6 characters.", "error");
    return;
  }
  if (new_password !== confirm_password) {
    showMessage(msg, "❌ Passwords do not match.", "error");
    return;
  }

  try {
    showMessage(msg, "Changing password...", "success");

    await apiRequest("/api/change-password/", "POST", {
      current_password,
      new_password,
      confirm_password,
    });

    showMessage(
      msg,
      "✅ Password changed successfully! Logging you out in 2 seconds...",
      "success"
    );

    setTimeout(() => {
      logout();
    }, 2000);

  } catch (err) {
    showMessage(msg, "❌ " + err.message, "error");
  }
});