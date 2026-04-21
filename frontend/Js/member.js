// ─── GUARD ─────────────────────────────────────────────────────────────────────
(function guardMember() {
  const raw = localStorage.getItem("user");
  if (!raw) return (window.location.href = "index.html");
})();

// ─── STATE ─────────────────────────────────────────────────────────────────────
const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

/** @type {Array<object>} */
let allProducts = [];

/**
 * Cart structure: { [item_id]: { item_id, item_name, price, quantity, element_name, type_name, rarity } }
 */
let cart = {};

let userBalance = 0;

// ─── ELEMENT VISUAL CONFIG ─────────────────────────────────────────────────────
const ELEMENT_CONFIG = {
  fire: {
    gradient: "linear-gradient(160deg, #7c2d12, #ea580c)",
    icon: "fa-fire",
    color: "#ea580c",
  },
  water: {
    gradient: "linear-gradient(160deg, #1e3a5f, #3b82f6)",
    icon: "fa-droplet",
    color: "#3b82f6",
  },
  earth: {
    gradient: "linear-gradient(160deg, #3d2b1f, #8b5e3c)",
    icon: "fa-mountain",
    color: "#c49a6c",
  },
  wind: {
    gradient: "linear-gradient(160deg, #064e3b, #34d399)",
    icon: "fa-wind",
    color: "#34d399",
  },
  lightning: {
    gradient: "linear-gradient(160deg, #4c1d95, #8b5cf6)",
    icon: "fa-bolt",
    color: "#8b5cf6",
  },
  ice: {
    gradient: "linear-gradient(160deg, #0c4a6e, #38bdf8)",
    icon: "fa-snowflake",
    color: "#38bdf8",
  },
  dark: {
    gradient: "linear-gradient(160deg, #1a1a2e, #6b4226)",
    icon: "fa-moon",
    color: "#9a8370",
  },
  light: {
    gradient: "linear-gradient(160deg, #78350f, #fbbf24)",
    icon: "fa-sun",
    color: "#fbbf24",
  },
  pyro: {
    gradient: "linear-gradient(160deg, #7c2d12, #ea580c)",
    icon: "fa-fire",
    color: "#ea580c",
  },
  hydro: {
    gradient: "linear-gradient(160deg, #1e3a5f, #3b82f6)",
    icon: "fa-droplet",
    color: "#3b82f6",
  },
  geo: {
    gradient: "linear-gradient(160deg, #78350f, #d97706)",
    icon: "fa-gem",
    color: "#d97706",
  },
  anemo: {
    gradient: "linear-gradient(160deg, #064e3b, #34d399)",
    icon: "fa-wind",
    color: "#34d399",
  },
  electro: {
    gradient: "linear-gradient(160deg, #4c1d95, #8b5cf6)",
    icon: "fa-bolt",
    color: "#8b5cf6",
  },
  cryo: {
    gradient: "linear-gradient(160deg, #0c4a6e, #38bdf8)",
    icon: "fa-snowflake",
    color: "#38bdf8",
  },
};

const RARITY_CONFIG = {
  common: { cls: "rarity-common", label: "Common" },
  uncommon: { cls: "rarity-uncommon", label: "Uncommon" },
  rare: { cls: "rarity-rare", label: "Rare" },
  epic: { cls: "rarity-epic", label: "Epic" },
  legendary: { cls: "rarity-legendary", label: "Legendary" },
};

function getElementCfg(name) {
  if (!name) return ELEMENT_CONFIG.earth;
  return ELEMENT_CONFIG[name.toLowerCase()] || ELEMENT_CONFIG.earth;
}

function getRarityCfg(rarity) {
  if (!rarity) return RARITY_CONFIG.common;
  return RARITY_CONFIG[rarity.toLowerCase()] || RARITY_CONFIG.common;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function showToast(message, type = "error") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  // Move toast into any open dialog so it renders in the top layer above the backdrop
  const openDialog = document.querySelector("dialog[open]");
  const toastParent = toast.parentElement;
  if (openDialog && toast.parentElement !== openDialog) {
    openDialog.appendChild(toast);
  } else if (!openDialog && toast.parentElement !== toastParent) {
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => {
    toast.className = "toast";
    // Return toast to body after hiding
    if (toast.parentElement !== document.body) {
      document.body.appendChild(toast);
    }
  }, 3500);
}

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

// ─── API FETCH ─────────────────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${CONFIG.BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

// ─── USER INFO ─────────────────────────────────────────────────────────────────
function renderUserInfo() {
  const nameEl = document.getElementById("userName");
  const emailEl = document.getElementById("userEmail");
  if (nameEl) nameEl.textContent = currentUser.name || "Member";
  if (emailEl) emailEl.textContent = currentUser.email || "";
}

// ─── BALANCE ──────────────────────────────────────────────────────────────────
async function loadBalance() {
  const el = document.getElementById("balanceDisplay");
  if (!el) return;
  try {
    const data = await apiFetch(`/member/balance/${currentUser.user_id}`);
    userBalance = parseFloat(data.balance) || 0;
    el.textContent = formatRupiah(userBalance);
    if (data.configured === false) {
      el.title = "Kolom balance belum dikonfigurasi di tabel users";
    }
  } catch (err) {
    userBalance = 0;
    el.textContent = formatRupiah(0);
    console.warn("[Balance]", err.message);
  }
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
async function loadProducts() {
  try {
    const items = await apiFetch("/member/items");
    allProducts = items || [];
    renderProducts(allProducts);
  } catch (err) {
    console.error("[Products]", err);
    const carousel = document.getElementById("productCarousel");
    if (carousel) {
      carousel.innerHTML = `
        <div class="product-empty">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>Gagal memuat produk: ${err.message}</p>
        </div>`;
    }
  }
}

function renderProducts(items) {
  const carousel = document.getElementById("productCarousel");
  if (!carousel) return;

  if (!items || items.length === 0) {
    carousel.innerHTML = `
      <div class="product-empty">
        <i class="fa-solid fa-box-open"></i>
        <p>Tidak ada produk yang tersedia</p>
      </div>`;
    return;
  }

  carousel.innerHTML = items
    .map((item) => {
      const cfg = getElementCfg(item.element_name);
      const rarity = getRarityCfg(item.rarity);
      const stock = item.quantity ?? item.stock ?? 0;
      const inCart = !!cart[item.item_id];

      return `
      <article class="product-card" role="listitem" aria-label="${item.item_name}">
        <div class="product-card-bg" style="background:${cfg.gradient}"></div>
        ${stock <= 3 ? `<span class="product-stock-badge low" aria-label="Stok menipis">Stok ${stock}</span>` : ""}

        <div class="product-card-body">
          <div class="product-card-icon"
            style="border-color:${cfg.color}44; background:${cfg.color}18">
            <i class="fa-solid ${cfg.icon}" style="color:${cfg.color}"></i>
          </div>
          <span class="product-card-rarity ${rarity.cls}">${rarity.label}</span>
        </div>

        <footer class="product-card-footer">
          <p class="product-card-name">${item.item_name}</p>
          <div class="product-card-meta">
            <span class="product-card-price">${formatRupiah(item.price)}</span>
            <span class="product-card-type">${item.type_name || ""}</span>
          </div>
          <button
            class="btn-add-cart${inCart ? " in-cart" : ""}"
            onclick="addToCart(${item.item_id})"
            aria-label="${inCart ? "Sudah di keranjang" : "Tambah ke keranjang"}: ${item.item_name}"
          >
            <i class="fa-solid ${inCart ? "fa-check" : "fa-cart-plus"}" aria-hidden="true"></i>
            <span>${inCart ? "Di Cart" : "Add to Cart"}</span>
          </button>
        </footer>
      </article>`;
    })
    .join("");
}

// ─── CART FUNCTIONS ───────────────────────────────────────────────────────────

/**
 * Add item to cart. If already exists, increment quantity.
 * @param {number} itemId
 */
function addToCart(itemId) {
  const item = allProducts.find((p) => p.item_id === itemId);
  if (!item) return;

  const maxStock = item.quantity ?? item.stock ?? 0;

  if (cart[itemId]) {
    if (cart[itemId].quantity >= maxStock) {
      showToast(`Stok ${item.item_name} hanya ${maxStock}`, "error");
      return;
    }
    cart[itemId].quantity += 1;
  } else {
    cart[itemId] = {
      item_id: item.item_id,
      item_name: item.item_name,
      price: parseFloat(item.price),
      element_name: item.element_name,
      type_name: item.type_name,
      rarity: item.rarity,
      quantity: 1,
    };
  }

  showToast(`${item.item_name} ditambahkan ke cart`, "success");
  renderCartBar();
  rerenderProducts();
}

/**
 * Remove item from cart entirely.
 * @param {number} itemId
 */
function removeFromCart(itemId) {
  delete cart[itemId];
  renderCartBar();
  renderCartModal();
  rerenderProducts();
}

/**
 * Update item quantity. Removes if qty <= 0.
 * @param {number} itemId
 * @param {number} qty
 */
function updateQuantity(itemId, qty) {
  if (qty <= 0) {
    removeFromCart(itemId);
    return;
  }
  if (cart[itemId]) {
    cart[itemId].quantity = qty;
    renderCartBar();
    renderCartModal();
  }
}

function getTotalPrice() {
  return Object.values(cart).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
}

function getTotalItems() {
  return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
}

/** Re-render the product carousel preserving search filter */
function rerenderProducts() {
  const q = (document.getElementById("productSearch")?.value || "")
    .trim()
    .toLowerCase();
  const filtered = q
    ? allProducts.filter((p) => p.item_name.toLowerCase().includes(q))
    : allProducts;
  renderProducts(filtered);
}

// ─── CART BAR ─────────────────────────────────────────────────────────────────
function renderCartBar() {
  const cartBar = document.getElementById("cartBar");
  if (!cartBar) return;

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  if (totalItems === 0) {
    cartBar.hidden = true;
    return;
  }

  cartBar.hidden = false;
  const badge = document.getElementById("cartBadge");
  const itemsEl = document.getElementById("cartBarItems");
  const totalEl = document.getElementById("cartBarTotal");
  if (badge) badge.textContent = totalItems;
  if (itemsEl) itemsEl.textContent = `${totalItems} item`;
  if (totalEl) totalEl.textContent = formatRupiah(totalPrice);
}

// ─── CART MODAL ───────────────────────────────────────────────────────────────
function renderCartModal() {
  const listEl = document.getElementById("cartItemsList");
  if (!listEl) return;

  const items = Object.values(cart);

  if (items.length === 0) {
    listEl.innerHTML = `
      <div class="product-empty">
        <i class="fa-solid fa-cart-shopping"></i>
        <p>Keranjang masih kosong</p>
      </div>`;
  } else {
    listEl.innerHTML = items
      .map((item) => {
        const cfg = getElementCfg(item.element_name);
        const subtotal = item.price * item.quantity;
        return `
        <div class="cart-item" role="listitem">
          <div class="cart-item-icon"
            style="background:${cfg.color}18; border:1px solid ${cfg.color}30">
            <i class="fa-solid ${cfg.icon}" style="color:${cfg.color}"></i>
          </div>
          <div class="cart-item-info">
            <p class="cart-item-name">${item.item_name}</p>
            <p class="cart-item-price">${formatRupiah(item.price)} / item</p>
            <p class="cart-item-subtotal">${formatRupiah(subtotal)}</p>
          </div>
          <div class="cart-item-controls">
            <button
              class="qty-btn"
              onclick="updateQuantity(${item.item_id}, ${item.quantity - 1})"
              aria-label="Kurangi ${item.item_name}">
              <i class="fa-solid fa-minus" aria-hidden="true"></i>
            </button>
            <span class="qty-value">${item.quantity}</span>
            <button
              class="qty-btn"
              onclick="updateQuantity(${item.item_id}, ${item.quantity + 1})"
              aria-label="Tambah ${item.item_name}">
              <i class="fa-solid fa-plus" aria-hidden="true"></i>
            </button>
            <button
              class="qty-btn remove-btn"
              onclick="removeFromCart(${item.item_id})"
              aria-label="Hapus ${item.item_name}">
              <i class="fa-solid fa-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>`;
      })
      .join("");
  }

  const total = getTotalPrice();
  const totalEl = document.getElementById("cartModalTotal");
  const balanceEl = document.getElementById("cartModalBalance");
  const balanceRow = document.getElementById("cartBalanceRow");

  if (totalEl) totalEl.textContent = formatRupiah(total);
  if (balanceEl) balanceEl.textContent = formatRupiah(userBalance);
  if (balanceRow) {
    balanceRow.classList.toggle(
      "insufficient",
      userBalance < total && total > 0,
    );
  }
}

// ─── CHECKOUT ─────────────────────────────────────────────────────────────────
async function handleCheckout() {
  const items = Object.values(cart);
  if (items.length === 0) {
    showToast("Keranjang masih kosong", "error");
    return;
  }

  const total = getTotalPrice();
  if (userBalance < total) {
    showToast("Saldo tidak cukup. Silakan Top Up terlebih dahulu.", "error");
    return;
  }

  const btn =
    document.getElementById("btnCheckoutModal") ||
    document.getElementById("btnCheckoutBar");
  if (btn) setLoading(btn, true);

  try {
    const payload = {
      user_id: currentUser.user_id,
      items: items.map((i) => ({ item_id: i.item_id, quantity: i.quantity })),
    };

    const result = await apiFetch("/member/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Clear cart
    cart = {};
    renderCartBar();
    closeModal("modalCart");

    showToast(
      `Checkout berhasil! Total: ${formatRupiah(result.total || total)}`,
      "success",
    );

    // Reload products and balance
    await Promise.all([loadProducts(), loadBalance()]);
  } catch (err) {
    showToast(err.message || "Checkout gagal", "error");
    console.error("[Checkout]", err);
  } finally {
    if (btn) setLoading(btn, false);
  }
}

// ─── ORDER HISTORY ─────────────────────────────────────────────────────────────
async function loadHistory() {
  const tbody = document.getElementById("historyTableBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="4"><span class="skeleton"></span></td></tr>`;

  try {
    const orders = await apiFetch(`/member/orders/${currentUser.user_id}`);
    if (!orders || orders.length === 0) {
      tbody.innerHTML = `<tr class="table-empty"><td colspan="4">Belum ada riwayat order</td></tr>`;
      return;
    }
    tbody.innerHTML = orders
      .map(
        (o) => `
      <tr>
        <td>#${o.order_id}</td>
        <td>${formatDate(o.order_time)}</td>
        <td>${formatRupiah(o.total_paid)}</td>
        <td><span class="badge badge-${o.status}">${o.status === "paid" ? "Lunas" : "Pending"}</span></td>
      </tr>`,
      )
      .join("");
  } catch (err) {
    tbody.innerHTML = `<tr class="table-empty"><td colspan="4">Gagal memuat: ${err.message}</td></tr>`;
  }
}

// ─── TOP UP ───────────────────────────────────────────────────────────────────
async function handleTopUp(e) {
  e.preventDefault();
  const amountInput = document.getElementById("topupAmount");
  const errEl = document.getElementById("topupAmount-error");
  const amount = parseFloat(amountInput?.value);

  if (errEl) errEl.textContent = "";

  if (!amount || amount < 1000) {
    if (errEl) errEl.textContent = "Minimal top up Rp 1.000";
    return;
  }

  const btn = document.getElementById("btnSubmitTopUp");
  if (btn) setLoading(btn, true);

  try {
    const result = await apiFetch(`/member/topup/${currentUser.user_id}`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    });

    userBalance = parseFloat(result.new_balance) || userBalance + amount;
    const displayEl = document.getElementById("balanceDisplay");
    if (displayEl) displayEl.textContent = formatRupiah(userBalance);

    showToast(`Top Up ${formatRupiah(amount)} berhasil!`, "success");
    closeModal("modalTopUp");
    document.getElementById("formTopUp")?.reset();
    document
      .querySelectorAll(".preset-btn")
      .forEach((b) => b.classList.remove("active"));
  } catch (err) {
    showToast(err.message || "Top Up gagal", "error");
  } finally {
    if (btn) setLoading(btn, false);
  }
}

// ─── MODAL HELPERS ─────────────────────────────────────────────────────────────
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.showModal();
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.close();
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
async function handleLogout() {
  try {
    await apiFetch(`/auth/logout/${currentUser.user_id}`, { method: "POST" });
  } catch (_) {
    /* ignore */
  }
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// ─── CAROUSEL NAV ─────────────────────────────────────────────────────────────
function setupCarouselNav() {
  const carousel = document.getElementById("productCarousel");
  document.getElementById("carouselPrev")?.addEventListener("click", () => {
    carousel?.scrollBy({ left: -600, behavior: "smooth" });
  });
  document.getElementById("carouselNext")?.addEventListener("click", () => {
    carousel?.scrollBy({ left: 600, behavior: "smooth" });
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  renderUserInfo();

  // Load products and balance in parallel
  await Promise.all([loadProducts(), loadBalance(), loadHistory()]);

  // Logout
  document.getElementById("logoutBtn")?.addEventListener("click", handleLogout);

  // Top Up
  document.getElementById("btnTopUp")?.addEventListener("click", () => {
    openModal("modalTopUp");
  });
  document.getElementById("formTopUp")?.addEventListener("submit", handleTopUp);

  // Top-up preset buttons
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".preset-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const amountInput = document.getElementById("topupAmount");
      if (amountInput) amountInput.value = btn.dataset.amount;
    });
  });

  // View cart (button + summary area click)
  const openCart = () => {
    renderCartModal();
    openModal("modalCart");
  };
  document.getElementById("btnViewCart")?.addEventListener("click", openCart);
  document
    .getElementById("cartBarSummary")
    ?.addEventListener("click", openCart);
  document
    .getElementById("cartBarSummary")
    ?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openCart();
      }
    });

  // Checkout (cart bar quick checkout)
  document
    .getElementById("btnCheckoutBar")
    ?.addEventListener("click", handleCheckout);

  // Checkout (inside cart modal)
  document
    .getElementById("btnCheckoutModal")
    ?.addEventListener("click", handleCheckout);

  // Modal close via data-close attribute
  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
  });

  // Close dialog by clicking backdrop
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  });

  // Product live search
  let searchTimeout;
  document.getElementById("productSearch")?.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const q = e.target.value.trim().toLowerCase();
      const filtered = q
        ? allProducts.filter((p) => p.item_name.toLowerCase().includes(q))
        : allProducts;
      renderProducts(filtered);
    }, 280);
  });

  // History toggle
  document
    .getElementById("btnToggleHistory")
    ?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const body = document.getElementById("historyBody");
      const expanded = btn.getAttribute("aria-expanded") === "true";

      btn.setAttribute("aria-expanded", String(!expanded));
      btn.querySelector("span").textContent = expanded
        ? "Tampilkan"
        : "Sembunyikan";
      body.hidden = expanded;

      if (!expanded) await loadHistory();
    });

  // Carousel navigation
  setupCarouselNav();
});
