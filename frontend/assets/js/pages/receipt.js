requireAuth();

const container = document.getElementById("receiptContainer");
const actionsEl = document.getElementById("receiptActions");

function formatKES(value) {
  const num = Number(value || 0);
  return `KES ${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString();
}

function row(label, value) {
  if (!value) return "";
  return `
    <div class="receipt-row">
      <span class="label">${label}</span>
      <span class="value">${value}</span>
    </div>
  `;
}

async function loadReceipt() {
  // Get transaction ID from URL params
  const params = new URLSearchParams(window.location.search);
  const txId = params.get("id");

  if (!txId) {
    container.innerHTML = `<p style="color:red;">No transaction ID provided.</p>`;
    return;
  }

  try {
    const settings = getBusinessSettings();
    const tx = await apiRequest(`/api/transactions/receipt/${txId}/`, "GET");

    container.innerHTML = `
      <div class="receipt">
        <h2>${settings.name}</h2>
        <p class="receipt-subtitle">${settings.tagline}</p>
        ${settings.address ? `<p class="receipt-subtitle">${settings.address}</p>` : ""}
        ${settings.phone ? `<p class="receipt-subtitle">Tel: ${settings.phone}</p>` : ""}

        <div style="border-top: 1px solid #eef2f7; margin: 12px 0;"></div>

        ${row("Receipt No.", `#${tx.id}`)}
        ${row("Date", formatDate(tx.created_at))}
        ${row("Type", tx.tx_type?.toUpperCase())}
        ${row("Channel", tx.channel?.toUpperCase())}
        ${row("Status", tx.status?.toUpperCase())}
        ${row("Department", tx.department)}
        ${row("Employee", tx.employee)}
        ${row("Service", tx.service)}
        ${row("Customer", tx.customer_name)}
        ${row("Reference", tx.reference)}
        ${row("Narration", tx.narration)}

        <div class="receipt-total">
          <span>Total</span>
          <span>${formatKES(tx.amount)}</span>
        </div>

        <p style="text-align:center; font-size:12px; color:#6b7280; margin-top:12px;">
          Thank you for your business!
        </p>
      </div>
    `;

    actionsEl.style.display = "flex";
  } catch (err) {
    container.innerHTML = `<p style="color:red;">❌ ${err.message}</p>`;
  }
}

loadReceipt();