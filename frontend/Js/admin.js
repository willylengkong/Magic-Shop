// ─── GUARD: Pastikan user sudah login dan role admin ──────────────────────────
(function guardAdmin() {
  const raw = localStorage.getItem("user");
  if (!raw) return (window.location.href = "index.html");

  const user = JSON.parse(raw);
  // role_id 1 = admin
  // if (user.role_id !== 1) return (window.location.href = "home.html");

  // Tampilkan email admin di sidebar
  const emailEl = document.getElementById("adminEmail");
  if (emailEl) emailEl.textContent = user.email || "Admin";
})();

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Format angka ke format Rupiah
 * @param {number} amount
 * @returns {string}
 */
function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format tanggal ke format lokal Indonesia
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Tampilkan toast notifikasi
 * @param {string} message
 * @param {"success"|"error"} type
 */
function showToast(message, type = "error") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => (toast.className = "toast"), 3500);
}

/**
 * Set tombol ke state loading
 * @param {HTMLButtonElement} btn
 * @param {boolean} isLoading
 */
function setLoading(btn, isLoading) {
  if (isLoading) {
    btn.disabled = true;
    btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>Loading...</span>`;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
  }
}

/**
 * Tampilkan / sembunyikan error pada field modal
 * @param {string} fieldId
 * @param {string} message
 */
function showFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);
  if (input) input.setAttribute("aria-invalid", "true");
  if (errorEl) errorEl.textContent = message;
}

function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);
  if (input) input.removeAttribute("aria-invalid");
  if (errorEl) errorEl.textContent = "";
}

function clearFormErrors(...fieldIds) {
  fieldIds.forEach(clearFieldError);
}

// ─── API FETCHER ───────────────────────────────────────────────────────────────

/**
 * Generic fetch wrapper dengan error handling
 * @param {string} endpoint
 * @param {RequestInit} options
 * @returns {Promise<any>}
 */
async function apiFetch(endpoint, options = {}) {
  const response = await fetch(`${CONFIG.BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || `Error ${response.status}`);
  }

  return data;
}

// ─── SECTION NAVIGATION ───────────────────────────────────────────────────────

const SECTION_LABELS = {
  overview: "Overview",
  history: "History Penjualan",
  stock: "Stok Barang",
  members: "Member",
};

/**
 * Pindah ke section tertentu
 * @param {string} sectionId
 */
function navigateTo(sectionId) {
  // Sembunyikan semua section
  document.querySelectorAll(".dashboard-section").forEach((sec) => {
    sec.classList.remove("active");
    sec.hidden = true;
  });

  // Tampilkan section yang dipilih
  const target = document.getElementById(`section-${sectionId}`);
  if (target) {
    target.hidden = false;
    target.classList.add("active");
  }

  // Update nav item active state
  document.querySelectorAll(".nav-item").forEach((item) => {
    const isActive = item.dataset.section === sectionId;
    item.classList.toggle("active", isActive);
    item.setAttribute("aria-current", isActive ? "page" : "false");
  });

  // Update breadcrumb
  const breadcrumb = document.getElementById("breadcrumbLabel");
  if (breadcrumb)
    breadcrumb.textContent = SECTION_LABELS[sectionId] || sectionId;

  // Load data sesuai section
  if (sectionId === "overview") loadOverview();
  if (sectionId === "history") loadHistory();
  if (sectionId === "stock") loadStock();
  if (sectionId === "members") loadMembers();
}

// ─── SECTION: OVERVIEW ────────────────────────────────────────────────────────

async function loadOverview() {
  try {
    // GET /admin/dashboard → includes total_revenue, current_balance, total_stock, total_members
    const dashboard = await apiFetch("/admin/dashboard");

    document.getElementById("statBalance").textContent = formatRupiah(
      dashboard.current_balance ?? 0,
    );
    document.getElementById("statRevenue").textContent = formatRupiah(
      dashboard.total_revenue ?? 0,
    );
    document.getElementById("statStock").textContent = (
      dashboard.total_stock ?? 0
    ).toLocaleString("id-ID");
    document.getElementById("statMembers").textContent = (
      dashboard.total_members ?? 0
    ).toLocaleString("id-ID");
  } catch (err) {
    console.error("[Overview Error]", err);
    showToast("Gagal memuat data overview: " + err.message, "error");
  }
}

// ─── SECTION: HISTORY PENJUALAN ───────────────────────────────────────────────

async function loadHistory(startDate = "", endDate = "") {
  const tbody = document.getElementById("historyTableBody");
  tbody.innerHTML = `
    <tr class="table-loading">
      <td colspan="6"><span class="skeleton"></span></td>
    </tr>`;

  try {
    // Bangun query string jika ada filter tanggal
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);

    const query = params.toString() ? `?${params}` : "";

    // GET /admin/orders?start_date=&end_date=
    const orders = await apiFetch(`/admin/orders${query}`);

    if (!orders || orders.length === 0) {
      tbody.innerHTML = `
        <tr class="table-empty">
          <td colspan="6">Tidak ada data history untuk periode ini</td>
        </tr>`;
      return;
    }

    tbody.innerHTML = orders
      .map(
        (order) => `
        <tr>
          <td>#${order.order_id}</td>
          <td>${formatDate(order.order_date || order.payment_time)}</td>
          <td>${order.email || order.user_email || "-"}</td>
          <td>${order.total_items ?? "-"}</td>
          <td>${order.total_amount ? formatRupiah(order.total_amount) : "-"}</td>
          <td>
            <span class="badge ${order.payment_id ? "badge-paid" : "badge-pending"}">
              ${order.payment_id ? "Lunas" : "Pending"}
            </span>
          </td>
        </tr>`,
      )
      .join("");
  } catch (err) {
    console.error("[History Error]", err);
    tbody.innerHTML = `
      <tr class="table-empty">
        <td colspan="6">Gagal memuat data: ${err.message}</td>
      </tr>`;
  }
}

// ─── SECTION: STOK BARANG ─────────────────────────────────────────────────────

// Simpan data items untuk dipakai di dropdown modal
let itemsData = [];

async function loadStock() {
  const tbody = document.getElementById("stockTableBody");
  tbody.innerHTML = `
    <tr class="table-loading">
      <td colspan="6"><span class="skeleton"></span></td>
    </tr>`;

  try {
    // GET /admin/items → semua item beserta info stok
    const items = await apiFetch("/admin/items");

    itemsData = items || [];

    if (itemsData.length === 0) {
      tbody.innerHTML = `
        <tr class="table-empty">
          <td colspan="6">Belum ada data barang</td>
        </tr>`;
      return;
    }

    renderStockTable(itemsData);

    // Isi dropdown di modal restock & manual stock
    populateItemDropdowns(itemsData);
  } catch (err) {
    console.error("[Stock Error]", err);
    tbody.innerHTML = `
      <tr class="table-empty">
        <td colspan="6">Gagal memuat data: ${err.message}</td>
      </tr>`;
  }
}

/**
 * Render baris tabel stok (bisa difilter)
 */
function renderStockTable(items) {
  const tbody = document.getElementById("stockTableBody");
  if (!items || items.length === 0) {
    tbody.innerHTML = `
      <tr class="table-empty">
        <td colspan="6">Tidak ada barang yang cocok</td>
      </tr>`;
    return;
  }
  tbody.innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>${item.item_id}</td>
          <td>${item.item_name || item.name || "-"}</td>
          <td>${item.type_name || item.element_name || "-"}</td>
          <td>${item.price ? formatRupiah(item.price) : "-"}</td>
          <td>
            <span class="${(item.stock ?? item.quantity ?? 0) <= 5 ? "badge badge-low" : ""}">
              ${item.stock ?? item.quantity ?? 0}
            </span>
          </td>
          <td>
            <button
              class="btn-stock-add"
              onclick="openManualStockForItem(${item.item_id})"
              aria-label="Tambah stok ${item.item_name || item.name}"
            >
              <i class="fa-solid fa-plus" aria-hidden="true"></i> Stok
            </button>
          </td>
        </tr>`,
    )
    .join("");
}

/**
 * Isi dropdown pilih barang di kedua modal
 */
function populateItemDropdowns(items) {
  const selectors = ["restockItem", "manualItem"];
  selectors.forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    const options = items
      .map(
        (i) => `<option value="${i.item_id}">${i.item_name || i.name}</option>`,
      )
      .join("");
    select.innerHTML = `<option value="">-- Pilih barang --</option>${options}`;
  });
}

/**
 * Buka modal manual stock dan pre-select item tertentu
 * @param {number} itemId
 */
function openManualStockForItem(itemId) {
  openModal("modalManualStock");
  const select = document.getElementById("manualItem");
  if (select) select.value = itemId;
}

// ─── SECTION: MEMBER ──────────────────────────────────────────────────────────

async function loadMembers(search = "") {
  const tbody = document.getElementById("membersTableBody");
  tbody.innerHTML = `
    <tr class="table-loading">
      <td colspan="5"><span class="skeleton"></span></td>
    </tr>`;

  try {
    // GET /admin/members?search=
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const members = await apiFetch(`/admin/members${query}`);

    if (!members || members.length === 0) {
      tbody.innerHTML = `
        <tr class="table-empty">
          <td colspan="5">${search ? `Tidak ditemukan member dengan kata kunci "${search}"` : "Belum ada member"}</td>
        </tr>`;
      return;
    }

    tbody.innerHTML = members
      .map(
        (m) => `
        <tr>
          <td>${m.user_id}</td>
          <td>${m.name || "-"}</td>
          <td>${m.email || "-"}</td>
          <td>
            <span class="badge ${m.role_id === 1 ? "badge-pending" : "badge-paid"}">
              ${m.role_name || (m.role_id === 1 ? "Admin" : "Member")}
            </span>
          </td>
          <td>${m.total_orders ?? "-"}</td>
        </tr>`,
      )
      .join("");
  } catch (err) {
    console.error("[Members Error]", err);
    tbody.innerHTML = `
      <tr class="table-empty">
        <td colspan="5">Gagal memuat data: ${err.message}</td>
      </tr>`;
  }
}

// ─── MODAL HELPERS ────────────────────────────────────────────────────────────

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.showModal();
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.close();
    // Reset form di dalam modal
    const form = modal.querySelector("form");
    if (form) {
      form.reset();
      form
        .querySelectorAll("[aria-invalid]")
        .forEach((el) => el.removeAttribute("aria-invalid"));
      form.querySelectorAll(".error-msg").forEach((el) => {
        el.textContent = "";
      });
    }
    const summary = document.getElementById("restockSummary");
    if (summary) summary.textContent = "";
  }
}

// ─── FORM: RESTOCK ────────────────────────────────────────────────────────────

async function handleRestock(e) {
  e.preventDefault();
  clearFormErrors("restockItem", "restockQty", "restockPrice");

  const itemId = document.getElementById("restockItem").value;
  const qty = parseInt(document.getElementById("restockQty").value);
  const price = parseFloat(document.getElementById("restockPrice").value);
  const btn = document.getElementById("btnSubmitRestock");

  let isValid = true;

  if (!itemId) {
    showFieldError("restockItem", "Pilih barang terlebih dahulu");
    isValid = false;
  }
  if (!qty || qty < 1) {
    showFieldError("restockQty", "Jumlah harus minimal 1");
    isValid = false;
  }
  if (!price && price !== 0) {
    showFieldError("restockPrice", "Masukkan harga beli");
    isValid = false;
  }
  if (price < 0) {
    showFieldError("restockPrice", "Harga tidak boleh negatif");
    isValid = false;
  }

  if (!isValid) return;

  btn.dataset.originalHtml = btn.innerHTML;
  setLoading(btn, true);

  try {
    // POST /admin/restock → stok bertambah, saldo berkurang
    await apiFetch("/admin/restock", {
      method: "POST",
      body: JSON.stringify({
        item_id: parseInt(itemId),
        quantity: qty,
        unit_price: price,
      }),
    });

    showToast("Restock berhasil! Stok bertambah, saldo berkurang.", "success");
    closeModal("modalRestock");

    // Reload data yang terpengaruh
    const searchStock = document.getElementById("searchStock");
    if (searchStock) searchStock.value = "";
    loadStock();
    loadOverview();
  } catch (err) {
    showToast("Restock gagal: " + err.message, "error");
    console.error("[Restock Error]", err);
  } finally {
    setLoading(btn, false);
  }
}

// ─── FORM: MANUAL STOCK ───────────────────────────────────────────────────────

async function handleManualStock(e) {
  e.preventDefault();
  clearFormErrors("manualItem", "manualQty");

  const itemId = document.getElementById("manualItem").value;
  const qty = parseInt(document.getElementById("manualQty").value);
  const btn = document.getElementById("btnSubmitManual");

  let isValid = true;

  if (!itemId) {
    showFieldError("manualItem", "Pilih barang terlebih dahulu");
    isValid = false;
  }
  if (!qty || qty < 1) {
    showFieldError("manualQty", "Jumlah harus minimal 1");
    isValid = false;
  }

  if (!isValid) return;

  // Cari stok saat ini untuk item yang dipilih
  const currentItem = itemsData.find((i) => i.item_id == itemId);
  const currentStock = currentItem?.stock ?? currentItem?.quantity ?? 0;
  const newStock = currentStock + qty;

  btn.dataset.originalHtml = btn.innerHTML;
  setLoading(btn, true);

  try {
    // PUT /stocks/{item_id} → update quantity stok
    await apiFetch(`/stocks/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity: newStock }),
    });

    showToast(`Stok berhasil ditambahkan sebanyak ${qty} unit.`, "success");
    closeModal("modalManualStock");
    const searchStock = document.getElementById("searchStock");
    if (searchStock) searchStock.value = "";
    loadStock();
  } catch (err) {
    showToast("Tambah stok gagal: " + err.message, "error");
    console.error("[Manual Stock Error]", err);
  } finally {
    setLoading(btn, false);
  }
}

// ─── FORM: SET SALDO ──────────────────────────────────────────────────────────

async function openSetBalanceModal() {
  openModal("modalSetBalance");

  // GET /admin/balance → tampilkan saldo saat ini
  const infoEl = document.getElementById("balanceCurrentInfo");
  try {
    const balance = await apiFetch("/admin/balance");
    if (infoEl) {
      infoEl.innerHTML = `
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        <span>Saldo saat ini: <strong>${formatRupiah(balance.current_balance ?? 0)}</strong></span>`;
    }
  } catch {
    if (infoEl) {
      infoEl.innerHTML = `
        <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
        <span>Saldo belum diinisialisasi</span>`;
    }
  }
}

async function handleSetBalance(e) {
  e.preventDefault();
  clearFormErrors("balanceAmount");

  const amount = parseFloat(document.getElementById("balanceAmount").value);
  const notes = document.getElementById("balanceNotes").value.trim();
  const btn = document.getElementById("btnSubmitBalance");

  if (isNaN(amount) || amount < 0) {
    showFieldError("balanceAmount", "Masukkan jumlah saldo yang valid");
    return;
  }

  setLoading(btn, true);

  try {
    // POST /admin/balance → update/set saldo kas
    await apiFetch("/admin/balance", {
      method: "POST",
      body: JSON.stringify({
        amount,
        notes: notes || null,
      }),
    });

    showToast(`Saldo berhasil diset ke ${formatRupiah(amount)}`, "success");
    closeModal("modalSetBalance");
    loadOverview();
  } catch (err) {
    showToast("Gagal set saldo: " + err.message, "error");
    console.error("[SetBalance Error]", err);
  } finally {
    setLoading(btn, false);
  }
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

async function handleLogout() {
  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;

  try {
    if (user?.user_id) {
      // POST /auth/logout/{user_id}
      await apiFetch(`/auth/logout/${user.user_id}`, { method: "POST" });
    }
  } catch (err) {
    // Tetap logout meski API gagal
    console.warn("[Logout API Error]", err);
  } finally {
    localStorage.removeItem("user");
    window.location.href = "index.html";
  }
}

// ─── INIT ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // ── Tanggal di topbar ──
  const dateEl = document.getElementById("topbarDate");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // ── Nav items ──
  document.querySelectorAll(".nav-item, .quick-card").forEach((btn) => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.section));
  });

  // ── Toggle sidebar ──
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        sidebar.classList.toggle("mobile-open");
      } else {
        sidebar.classList.toggle("collapsed");
      }
    });
  }

  // ── Logout ──
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

  // ── Modal open buttons ──
  document.getElementById("btnRestock")?.addEventListener("click", () => {
    // Pastikan dropdown sudah terisi
    if (itemsData.length === 0)
      loadStock().then(() => openModal("modalRestock"));
    else openModal("modalRestock");
  });

  document.getElementById("btnManualStock")?.addEventListener("click", () => {
    if (itemsData.length === 0)
      loadStock().then(() => openModal("modalManualStock"));
    else openModal("modalManualStock");
  });

  document
    .getElementById("btnSetBalance")
    ?.addEventListener("click", openSetBalanceModal);

  // ── Modal close buttons (data-close attribute) ──
  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
  });

  // ── Tutup modal klik backdrop ──
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) closeModal(dialog.id);
    });
  });

  // ── Form submit ──
  document
    .getElementById("formRestock")
    ?.addEventListener("submit", handleRestock);
  document
    .getElementById("formManualStock")
    ?.addEventListener("submit", handleManualStock);
  document
    .getElementById("formSetBalance")
    ?.addEventListener("submit", handleSetBalance);

  // ── Filter history ──
  document.getElementById("btnFilterHistory")?.addEventListener("click", () => {
    const start = document.getElementById("startDate").value;
    const end = document.getElementById("endDate").value;

    if (start && end && start > end) {
      showToast(
        "Tanggal awal tidak boleh lebih besar dari tanggal akhir",
        "error",
      );
      return;
    }

    loadHistory(start, end);
  });

  document.getElementById("btnResetHistory")?.addEventListener("click", () => {
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    loadHistory();
  });

  // ── Live search stok barang ──
  document.getElementById("searchStock")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = q
      ? itemsData.filter((item) =>
          (item.item_name || item.name || "").toLowerCase().includes(q),
        )
      : itemsData;
    renderStockTable(filtered);
  });

  // ── Live search member (debounce 400ms) ──
  let searchTimeout;
  document.getElementById("searchMember")?.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadMembers(e.target.value.trim()), 400);
  });

  // ── Restock summary (kalkulasi total harga beli) ──
  const calcSummary = () => {
    const qty = parseInt(document.getElementById("restockQty")?.value) || 0;
    const price =
      parseFloat(document.getElementById("restockPrice")?.value) || 0;
    const summary = document.getElementById("restockSummary");
    if (!summary) return;
    if (qty > 0 && price > 0) {
      const total = qty * price;
      summary.textContent = `Total pengeluaran: ${formatRupiah(total)} (${qty} unit × ${formatRupiah(price)})`;
    } else {
      summary.textContent = "";
    }
  };

  document.getElementById("restockQty")?.addEventListener("input", calcSummary);
  document
    .getElementById("restockPrice")
    ?.addEventListener("input", calcSummary);

  // ── Clear error on input ──
  document.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", () => clearFieldError(el.id));
    el.addEventListener("change", () => clearFieldError(el.id));
  });

  // ── Load halaman pertama ──
  navigateTo("overview");
});
