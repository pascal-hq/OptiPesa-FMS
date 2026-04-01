requireAuth();

const deptSelect = document.getElementById("department");
const empSelect = document.getElementById("employee");
const svcSelect = document.getElementById("service");
const form = document.getElementById("saleForm");
const msg = document.getElementById("message");

const channelEl = document.getElementById("channel");
const mpesaPhoneDiv = document.getElementById("mpesaPhoneDiv");
const mpesaPhoneEl = document.getElementById("mpesaPhone");

let departments = [];
let employees = [];
let services = [];

function resetSelect(selectEl, placeholderText) {
  selectEl.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = placeholderText;
  selectEl.appendChild(opt);
}

function populateSelect(selectEl, items, valueKey, labelFn, placeholder) {
  resetSelect(selectEl, placeholder);
  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item[valueKey];
    opt.textContent = labelFn(item);
    selectEl.appendChild(opt);
  });
}

async function loadData() {
  try {
    showMessage(msg, "Loading data...", "success");

    departments = await apiRequest("/api/departments/", "GET");
    employees = await apiRequest("/api/employees/", "GET");
    services = await apiRequest("/api/services/", "GET");

    populateSelect(
      deptSelect,
      departments,
      "id",
      (d) => d.name,
      "Select department"
    );

    resetSelect(empSelect, "Select department first");
    resetSelect(svcSelect, "Select department first");

    showMessage(msg, "", "success");
  } catch (err) {
    showMessage(msg, "Failed to load data: " + err.message, "error");
  }
}

// Filter employees & services by department
deptSelect.addEventListener("change", () => {
  const deptId = deptSelect.value ? Number(deptSelect.value) : null;

  if (!deptId) {
    resetSelect(empSelect, "Select department first");
    resetSelect(svcSelect, "Select department first");
    return;
  }

  const filteredEmps = employees.filter((e) => e.department === deptId);
  const filteredSvcs = services.filter((s) => s.department === deptId);

  populateSelect(
    empSelect,
    filteredEmps,
    "id",
    (e) => e.full_name,
    "Select employee (optional)"
  );

  populateSelect(
    svcSelect,
    filteredSvcs,
    "id",
    (s) => `${s.name}`,
    "Select service (optional)"
  );
});

// Show/hide M-Pesa phone field
channelEl.addEventListener("change", () => {
  if (channelEl.value === "mpesa") {
    mpesaPhoneDiv.style.display = "block";
  } else {
    mpesaPhoneDiv.style.display = "none";
    mpesaPhoneEl.value = "";
  }
});

// Submit form
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const channel = channelEl.value;
  const phone = mpesaPhoneEl.value.trim();

  // Validate phone if M-Pesa
  let normalizedPhone = null;
  if (channel === "mpesa") {
    if (!phone) {
      showMessage(msg, "Please enter the customer M-Pesa phone number.", "error");
      return;
    }

    normalizedPhone = phone;
    if (phone.startsWith("0")) {
      normalizedPhone = "254" + phone.slice(1);
    } else if (phone.startsWith("+")) {
      normalizedPhone = phone.slice(1);
    }

    if (!/^2547\d{8}$/.test(normalizedPhone)) {
      showMessage(msg, "Invalid phone number. Use format 0712345678.", "error");
      return;
    }
  }

  const payload = {
    department: deptSelect.value ? Number(deptSelect.value) : null,
    employee: empSelect.value ? Number(empSelect.value) : null,
    service: svcSelect.value ? Number(svcSelect.value) : null,
    customer_name: document.getElementById("customerName").value.trim(),
    amount: Number(document.getElementById("amount").value),
    channel: channel,
    reference: document.getElementById("reference").value.trim(),
    narration: document.getElementById("narration").value.trim(),
  };

  // Validate amount
  if (!payload.amount || payload.amount <= 0) {
    showMessage(msg, " Amount must be greater than 0.", "error");
    return;
  }

  // Clean optional fields
  if (!payload.department) delete payload.department;
  if (!payload.employee) delete payload.employee;
  if (!payload.service) delete payload.service;
  if (!payload.customer_name) delete payload.customer_name;
  if (!payload.reference) delete payload.reference;
  if (!payload.narration) delete payload.narration;

  try {
    // Step 1: Record sale
    showMessage(msg, "Submitting sale...", "success");
    const res = await apiRequest("/api/transactions/sale/", "POST", payload);

    showMessage(
      msg,
      `✅ Sale recorded. <a href="receipt.html?id=${res.transaction_id}" target="_blank">View Receipt 🧾</a>`,
      "success"
    );

    // Step 2: Trigger STK push if M-Pesa
    if (channel === "mpesa") {
      showMessage(msg, "⏳ Sending M-Pesa payment request...", "success");

      try {
        await apiRequest("/api/mpesa/stk-push/", "POST", {
          phone_number: normalizedPhone,
          amount: payload.amount,
          account_reference: "OptiPesa",
          description: res.narration || "OptiPesa Payment",
        });

        showMessage(
          msg,
          `M-Pesa request sent to ${phone}. Ask customer to enter PIN.`,
          "success"
        );
      } catch (mpesaErr) {
        showMessage(
          msg,
          `Sale recorded (ID: ${res.transaction_id}) but M-Pesa failed: ${mpesaErr.message}`,
          "error"
        );
      }
    }

    form.reset();
    resetSelect(empSelect, "Select department first");
    resetSelect(svcSelect, "Select department first");
    mpesaPhoneDiv.style.display = "none";

  } catch (err) {
    showMessage(msg, + err.message, "error");
  }
});

loadData();