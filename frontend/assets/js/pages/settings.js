requireAuth();

const msg = document.getElementById("message");
const settingsForm = document.getElementById("settingsForm");
const businessNameEl = document.getElementById("businessName");
const businessTaglineEl = document.getElementById("businessTagline");
const businessAddressEl = document.getElementById("businessAddress");
const businessPhoneEl = document.getElementById("businessPhone");
const businessEmailEl = document.getElementById("businessEmail");
const businessCurrencyEl = document.getElementById("businessCurrency");
const expenseThresholdEl = document.getElementById("expenseThreshold");
const saveThresholdBtn = document.getElementById("saveThresholdBtn");

function loadSettings() {
  const settings = getBusinessSettings();
  businessNameEl.value = settings.name || "";
  businessTaglineEl.value = settings.tagline || "";
  businessAddressEl.value = settings.address || "";
  businessPhoneEl.value = settings.phone || "";
  businessEmailEl.value = settings.email || "";
  businessCurrencyEl.value = settings.currency || "KES";

  const threshold = localStorage.getItem("expenseThreshold") || "";
  expenseThresholdEl.value = threshold;
}

settingsForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const settings = {
    name: businessNameEl.value.trim() || "OptiPesa",
    tagline: businessTaglineEl.value.trim() || "Financial Management System",
    address: businessAddressEl.value.trim(),
    phone: businessPhoneEl.value.trim(),
    email: businessEmailEl.value.trim(),
    currency: businessCurrencyEl.value.trim() || "KES",
  };

  saveBusinessSettings(settings);

  // Update nav title immediately
  const navTitle = document.querySelector(".nav h2");
  if (navTitle) navTitle.textContent = settings.name;

  showMessage(msg, "✅ Settings saved successfully.", "success");
});

saveThresholdBtn.addEventListener("click", () => {
  const threshold = expenseThresholdEl.value.trim();
  if (threshold && Number(threshold) > 0) {
    localStorage.setItem("expenseThreshold", threshold);
    showMessage(msg, "✅ Expense threshold saved.", "success");
  } else {
    localStorage.removeItem("expenseThreshold");
    showMessage(msg, "✅ Expense threshold cleared.", "success");
  }
});

loadSettings();