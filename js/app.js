/* ==========================================================================
   FaezStore — Storefront v3 (mobile-first)
   ========================================================================== */

const CART_KEY = "faez_cart_v2";
const MY_ORDERS_KEY = "faez_my_orders_v2";
const PAGE_SIZE = 12;

let STORE = {
  isLiveBackend: false,
  storeName: FAEZ_CONFIG.storeName,
  botUsername: FAEZ_CONFIG.botUsername,
  products: [],
  vouchers: [],
  reviews: [],
  activeCategory: "ALL",
  specialMode: "ALL",
  searchQuery: "",
  page: 1,
  cart: [],
  checkout: {
    product: null,
    qty: 1,
    voucherCode: "",
    discount: 0,
    depositId: null,
    pollTimer: null,
    countdownTimer: null,
    expiresAt: null,
    qrisTotal: 0,
  },
  currentInvoice: null,
  selectedStars: 5,
};

/* ---------- Util ---------- */
const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }
}

/* ---------- Ikon inline (tanpa library eksternal) ---------- */
const ICONS = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  receipt:
    '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  ticket:
    '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
  home: '<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  camera:
    '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  upload:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  trash:
    '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  image:
    '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  tv: '<rect width="20" height="15" x="2" y="7" rx="2"/><path d="m17 2-5 5-5-5"/>',
  headphones:
    '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
  gamepad:
    '<line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/>',
  briefcase:
    '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  shield:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
};

function ic(name, size = 20) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

function hydrateIcons(root = document) {
  root.querySelectorAll("[data-ic]").forEach((el) => {
    if (el.dataset.done) return;
    el.innerHTML = ic(el.dataset.ic, Number(el.dataset.size) || 20);
    el.dataset.done = "1";
  });
}

/* ---------- Modal ---------- */
function syncBodyLock() {
  document.body.classList.toggle(
    "modal-open",
    !!document.querySelector(".modal-bg.open"),
  );
}
function openModal(id) {
  document.getElementById(id)?.classList.add("open");
  syncBodyLock();
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove("open");
  syncBodyLock();
}

/* ---------- Data produk ---------- */
function getCategoryIcon(kat) {
  const k = String(kat || "").toLowerCase();
  if (k.includes("stream") || k.includes("film") || k.includes("video"))
    return "tv";
  if (k.includes("music") || k.includes("musik") || k.includes("spotify"))
    return "headphones";
  if (k.includes("vpn") || k.includes("keamanan")) return "shield";
  if (k.includes("game") || k.includes("top")) return "gamepad";
  if (k.includes("produk") || k.includes("ai") || k.includes("desain"))
    return "briefcase";
  return "box";
}

function getEffectivePricing(p, qty = 1) {
  const flashActive =
    p.flash_active && p.flash_end_at && new Date(p.flash_end_at) > new Date();
  let unit = flashActive
    ? Number(p.flash_price)
    : Number(p.effective_price || p.harga);
  let activeTier = null;
  if (Array.isArray(p.tiers)) {
    for (const t of p.tiers) {
      if (qty >= Number(t.min_qty) && Number(t.harga_satuan) < unit) {
        unit = Number(t.harga_satuan);
        activeTier = t;
      }
    }
  }
  return { unit, subtotal: unit * qty, activeTier, flashActive };
}

function isOnDiscount(p) {
  return (
    !!p.flash_active || (p.strike_price && p.strike_price > p.effective_price)
  );
}

function formatCountdownShort(endAt) {
  const diff = Math.max(0, new Date(endAt).getTime() - Date.now());
  if (diff <= 0) return "";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function loadStoreData() {
  await loadImageOverrides();
  try {
    const res = await fetch(`${FAEZ_CONFIG.apiBase}/api/store/catalog`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("Fallback local");
    const data = await res.json();
    if (!data.ok) throw new Error("Invalid catalog");

    STORE.isLiveBackend = true;
    STORE.storeName = data.storeName || FAEZ_CONFIG.storeName;
    STORE.botUsername = data.botUsername || FAEZ_CONFIG.botUsername;
    STORE.products = data.products || [];
    STORE.vouchers = data.vouchers || [];
    STORE.reviews = data.reviews || [];
    document.getElementById("connDot").style.background = "#059669";
  } catch (_) {
    STORE.isLiveBackend = false;
    const local = getLocalStoreData();
    STORE.storeName = local.storeName || FAEZ_CONFIG.storeName;
    STORE.products = local.products || [];
    STORE.vouchers = local.vouchers || [];
    STORE.reviews = local.reviews || [];
    document.getElementById("connDot").style.background = "#a1a1aa";
  }

  document.getElementById("storeTitle").textContent = STORE.storeName;
  const botUrl = `https://t.me/${STORE.botUsername}`;
  const b1 = document.getElementById("botTopLink");
  const b2 = document.getElementById("botFooterLink");
  if (b1) b1.href = botUrl;
  if (b2) b2.href = botUrl;

  loadCart();
  applyBanner();
  renderGrid();
}

/* ---------- Filter, kategori & pencarian ---------- */
function renderChips() {
  const el = document.getElementById("chipRow");
  if (!el) return;
  const counts = {};
  STORE.products.forEach((p) => {
    const k = p.kategori || "Lainnya";
    counts[k] = (counts[k] || 0) + 1;
  });
  const discountCount = STORE.products.filter(isOnDiscount).length;
  const allActive =
    STORE.activeCategory === "ALL" && STORE.specialMode === "ALL";

  const modeChip = (mode, label, extra = "") =>
    `<button type="button" class="chip ${STORE.activeCategory === "ALL" && STORE.specialMode === mode ? "active" : ""}" data-act="mode" data-mode="${mode}">${label}${extra}</button>`;

  let html = `<button type="button" class="chip ${allActive ? "active" : ""}" data-act="mode" data-mode="ALL">Semua<span class="chip-count">${STORE.products.length}</span></button>`;
  html += modeChip(
    "DISCOUNT",
    `${ic("zap", 14)} Flash Sale`,
    discountCount ? `<span class="chip-count hot">${discountCount}</span>` : "",
  );
  html += modeChip("BEST_SELLER", "Terlaris");
  html += modeChip("NEW", "Terbaru");

  const cats = Object.keys(counts);
  if (cats.length) html += `<span class="chip-sep" aria-hidden="true"></span>`;
  cats.forEach((kat) => {
    html += `<button type="button" class="chip ${STORE.activeCategory === kat ? "active" : ""}" data-act="cat" data-cat="${esc(kat)}">${ic(getCategoryIcon(kat), 14)} ${esc(kat)}<span class="chip-count">${counts[kat]}</span></button>`;
  });
  el.innerHTML = html;
}

function selectCategory(kat) {
  STORE.activeCategory = kat;
  STORE.specialMode = "ALL";
  STORE.page = 1;
  renderGrid();
}

function setFilterMode(mode) {
  STORE.specialMode = mode;
  STORE.activeCategory = "ALL";
  STORE.page = 1;
  renderGrid();
  scrollToShop();
}

function scrollToShop() {
  document
    .getElementById("shop")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function goShop() {
  resetFilters();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleSearch(val) {
  STORE.searchQuery = String(val || "")
    .trim()
    .toLowerCase();
  STORE.page = 1;
  renderGrid();
}

function clearSearch() {
  const inp = document.getElementById("searchInput");
  if (inp) {
    inp.value = "";
    inp.focus();
  }
  handleSearch("");
}

function resetFilters() {
  STORE.activeCategory = "ALL";
  STORE.specialMode = "ALL";
  STORE.searchQuery = "";
  STORE.page = 1;
  const inp = document.getElementById("searchInput");
  if (inp) inp.value = "";
  renderGrid();
}

function getFilteredProducts() {
  let list = [...STORE.products];
  if (STORE.activeCategory !== "ALL")
    list = list.filter(
      (p) => (p.kategori || "Lainnya") === STORE.activeCategory,
    );
  if (STORE.specialMode === "DISCOUNT") list = list.filter(isOnDiscount);
  else if (STORE.specialMode === "BEST_SELLER")
    list.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
  else if (STORE.specialMode === "NEW")
    list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

  if (STORE.searchQuery) {
    const q = STORE.searchQuery;
    list = list.filter(
      (p) =>
        String(p.nama || "")
          .toLowerCase()
          .includes(q) ||
        String(p.kode || "")
          .toLowerCase()
          .includes(q) ||
        String(p.kategori || "")
          .toLowerCase()
          .includes(q) ||
        String(p.deskripsi || "")
          .toLowerCase()
          .includes(q),
    );
  }
  return list;
}

/* ---------- Kartu produk ---------- */
function photoHtml(p, imgClass = "thumb-img") {
  const src = getProductImage(p);
  const mono = `<div class="product-monogram">${ic(getCategoryIcon(p.kategori), 24)}<span class="mono">${esc(String(p.kode || "").slice(0, 8))}</span></div>`;
  return (
    mono +
    (src
      ? `<img class="${imgClass}" src="${esc(src)}" alt="${esc(p.nama)}" loading="lazy" decoding="async" />`
      : "")
  );
}

function buildProductCardHtml(p) {
  const hasStock = Number(p.stok) > 0;
  const price = Number(p.effective_price || p.harga);
  const strike =
    p.strike_price && p.strike_price > price ? p.strike_price : null;
  const revCount = Number(p.review_count || 0);
  const ratingText = revCount > 0 ? `(${revCount})` : "(Baru)";
  const k = esc(p.kode);

  let promoBadge = "";
  if (p.flash_active && p.flash_end_at)
    promoBadge = `<span class="promo-pill-badge" data-flash-end="${esc(p.flash_end_at)}">⚡ ${formatCountdownShort(p.flash_end_at)}</span>`;
  else if (p.tiers && p.tiers.length)
    promoBadge = `<span class="promo-pill-badge grosir">Grosir</span>`;

  const actions = hasStock
    ? `<button type="button" class="btn-outline btn-icon" data-act="cart" data-kode="${k}" aria-label="Tambah ke keranjang">${ic("cart", 18)}</button><button type="button" class="btn" data-act="buy" data-kode="${k}">Beli</button>`
    : `<button type="button" class="btn-outline" style="flex:1" data-act="alert" data-kode="${k}">${ic("bell", 16)} Kabari stok</button>`;

  return `
    <article class="product-card">
      <div class="card-thumb" data-act="detail" data-kode="${k}" role="button" tabindex="0" aria-label="Lihat ${esc(p.nama)}">
        ${photoHtml(p)}
        ${promoBadge}
        <span class="stock-chip ${hasStock ? "" : "empty"}">${hasStock ? `${esc(p.stok)} ready` : "Habis"}</span>
        <button type="button" class="edit-img-btn" data-act="editimg" data-kode="${k}" aria-label="Ganti foto ${esc(p.nama)}">${ic("camera", 18)}</button>
      </div>
      <div class="card-body">
        <span class="card-cat">${esc(p.kategori || "Digital")}</span>
        <h3 class="card-title" data-act="detail" data-kode="${k}">${esc(p.nama)}</h3>
        <div class="card-rating"><span class="star">★</span><strong>${esc(p.avg_rating || "5.0")}</strong><span>${ratingText}</span></div>
        <div class="card-price-wrap"><span class="card-price">${rp(price)}</span>${strike ? `<span class="card-strike">${rp(strike)}</span>` : ""}</div>
        <div class="card-actions">${actions}</div>
      </div>
    </article>`;
}

function renderGrid() {
  renderChips();
  const grid = document.getElementById("productGrid");
  const pag = document.getElementById("paginationBar");
  const info = document.getElementById("resultInfo");
  const clearBtn = document.getElementById("searchClear");
  if (clearBtn) clearBtn.hidden = !STORE.searchQuery;
  if (!grid) return;

  const list = getFilteredProducts();
  const filtered =
    STORE.searchQuery ||
    STORE.activeCategory !== "ALL" ||
    STORE.specialMode !== "ALL";
  if (info) {
    info.innerHTML = `<span>${list.length} produk${STORE.searchQuery ? ` untuk “${esc(STORE.searchQuery)}”` : ""}</span>${filtered ? `<button type="button" class="link-btn" data-act="reset">Reset filter</button>` : ""}`;
  }

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><strong>Produk tidak ditemukan</strong><p>Coba kata kunci lain atau lihat semua produk kami.</p><button type="button" class="btn" data-act="reset">Tampilkan semua</button></div>`;
    if (pag) pag.innerHTML = "";
    return;
  }

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (STORE.page > totalPages) STORE.page = totalPages;
  const start = (STORE.page - 1) * PAGE_SIZE;
  grid.innerHTML = list
    .slice(start, start + PAGE_SIZE)
    .map(buildProductCardHtml)
    .join("");

  if (pag) {
    pag.innerHTML =
      totalPages > 1
        ? `<button type="button" class="btn-outline btn-sm" ${STORE.page <= 1 ? "disabled" : ""} data-act="page" data-page="${STORE.page - 1}">← Sebelumnya</button><span class="page-info">${STORE.page} / ${totalPages}</span><button type="button" class="btn-outline btn-sm" ${STORE.page >= totalPages ? "disabled" : ""} data-act="page" data-page="${STORE.page + 1}">Berikutnya →</button>`
        : "";
  }
}

function goPage(n) {
  STORE.page = n;
  renderGrid();
  scrollToShop();
}

setInterval(() => {
  document.querySelectorAll("[data-flash-end]").forEach((el) => {
    const t = formatCountdownShort(el.getAttribute("data-flash-end"));
    el.textContent = t ? `⚡ ${t}` : "Flash berakhir";
  });
}, 1000);

/* ---------- Detail produk ---------- */
function openProductDetail(kode) {
  const p = STORE.products.find((x) => x.kode === kode);
  if (!p) return;
  const prodReviews = STORE.reviews.filter((r) => r.kode_produk === p.kode);
  const price = Number(p.effective_price || p.harga);
  const hasStock = Number(p.stok) > 0;
  const k = esc(p.kode);

  const tiersHtml = p.tiers?.length
    ? `<div class="summary-box"><div class="mini-label" style="color:var(--ink)">Harga grosir (otomatis saat checkout)</div>${p.tiers.map((t) => `<div class="summary-row"><span>Beli min. ${esc(t.min_qty)} pcs</span><strong class="mono">${rp(t.harga_satuan)} / pcs</strong></div>`).join("")}</div>`
    : "";

  const reviewsHtml = prodReviews.length
    ? prodReviews
        .slice(0, 8)
        .map(
          (r) =>
            `<div class="review-item"><div class="rv-top"><span class="rv-stars">${"★".repeat(Math.min(5, Math.max(1, Number(r.rating || 5))))}</span><span class="rv-who">${esc(r.buyer_masked || "Pembeli")} · ${esc(r.trx_masked || "")}</span></div><div class="rv-text">“${esc(r.review || "Pengiriman instan & berfungsi normal.")}”</div></div>`,
        )
        .join("")
    : `<div class="muted-text" style="padding:10px 0">Belum ada ulasan tertulis. Jadilah pembeli pertama!</div>`;

  document.getElementById("detailModalBody").innerHTML = `
    <div class="modal-head">
      <div class="row-gap"><span class="pill-tag">${esc(p.kategori || "Digital")}</span><span class="pill-tag ${hasStock ? "green" : "red"}">${hasStock ? `Stok: ${esc(p.stok)}` : "Stok habis"}</span></div>
      <button type="button" class="close-btn" onclick="closeModal('detailModal')" aria-label="Tutup">${ic("x", 18)}</button>
    </div>
    <div class="detail-photo">
      ${photoHtml(p)}
      <button type="button" class="edit-img-btn" data-act="editimg" data-kode="${k}" aria-label="Ganti foto">${ic("camera", 18)}</button>
    </div>
    <h2 class="detail-title">${esc(p.nama)}</h2>
    <div class="detail-meta">
      <div class="card-rating" style="font-size:13px"><span class="star">★</span><strong>${esc(p.avg_rating || "5.0")}</strong><span>${esc(p.review_count || 0)} ulasan · ${esc(p.sold_count || 0)} terjual</span></div>
      <div class="detail-price">${p.strike_price && p.strike_price > price ? `<s>${rp(p.strike_price)}</s>` : ""}<strong>${rp(price)}</strong></div>
    </div>
    <p class="detail-desc">${esc(p.deskripsi || "Pengiriman akun otomatis 24 jam setelah pembayaran QRIS terverifikasi.")}</p>
    ${tiersHtml}
    <div class="detail-actions">
      ${
        hasStock
          ? `<button type="button" class="btn-outline" data-act="cart" data-kode="${k}">${ic("cart", 18)} Keranjang</button><button type="button" class="btn" data-act="buy" data-kode="${k}">Beli sekarang</button>`
          : `<button type="button" class="btn-outline" disabled>Stok habis</button><button type="button" class="btn" data-act="alert" data-kode="${k}">${ic("bell", 16)} Kabari stok</button>`
      }
    </div>
    <div style="border-top:1px solid var(--border);padding-top:14px"><div style="font-size:14px;font-weight:700;margin-bottom:6px">Ulasan pembeli terverifikasi</div>${reviewsHtml}</div>`;
  openModal("detailModal");
}

/* ---------- Keranjang ---------- */
function loadCart() {
  try {
    STORE.cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(STORE.cart)) STORE.cart = [];
  } catch (_) {
    STORE.cart = [];
  }
  updateCartBadge();
}
function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(STORE.cart));
  } catch (_) {}
  updateCartBadge();
}
function updateCartBadge() {
  const total = STORE.cart.reduce((s, i) => s + Number(i.qty || 1), 0);
  document.querySelectorAll(".cart-badge").forEach((b) => {
    b.textContent = total;
    b.hidden = total <= 0;
  });
}

function addToCart(kode) {
  const p = STORE.products.find((x) => x.kode === kode);
  if (!p || p.stok <= 0) return toast("Stok produk sedang habis");
  const idx = STORE.cart.findIndex((i) => i.kode === kode);
  if (idx !== -1) {
    if (STORE.cart[idx].qty < p.stok) STORE.cart[idx].qty += 1;
    else return toast(`Maksimal sesuai stok ready (${p.stok})`);
  } else STORE.cart.push({ kode, qty: 1 });
  saveCart();
  toast(`${p.nama} ditambahkan ke keranjang`);
}

function changeCartQty(kode, delta) {
  const item = STORE.cart.find((i) => i.kode === kode);
  const p = STORE.products.find((x) => x.kode === kode);
  if (!item || !p) return;
  const next = item.qty + delta;
  if (next < 1) return;
  if (next > p.stok) return toast(`Maksimal sesuai stok ready (${p.stok})`);
  item.qty = next;
  saveCart();
  openCartModal();
}

function openCartModal() {
  const body = document.getElementById("cartBody");
  const items = STORE.cart.filter((i) =>
    STORE.products.some((p) => p.kode === i.kode),
  );
  if (!items.length) {
    body.innerHTML = `<div style="text-align:center;padding:30px 10px;color:var(--muted)"><div style="margin-bottom:10px">Keranjang kamu masih kosong.</div><button type="button" class="btn" onclick="closeModal('cartModal');scrollToShop()">Lihat produk</button></div>`;
    return openModal("cartModal");
  }
  body.innerHTML = items
    .map((item) => {
      const p = STORE.products.find((x) => x.kode === item.kode);
      const pr = getEffectivePricing(p, item.qty);
      const k = esc(p.kode);
      return `<div class="cart-item">
      <div class="cart-thumb">${photoHtml(p)}</div>
      <div class="cart-info">
        <div class="cart-name">${esc(p.nama)}</div>
        <div class="cart-sub">${rp(pr.unit)} × ${item.qty} = <strong style="color:var(--ink)">${rp(pr.subtotal)}</strong></div>
        <div class="cart-controls">
          <div class="qty-control small"><button type="button" class="qty-btn" data-act="cartqty" data-kode="${k}" data-delta="-1" aria-label="Kurangi">−</button><span class="qty-val mono">${item.qty}</span><button type="button" class="qty-btn" data-act="cartqty" data-kode="${k}" data-delta="1" aria-label="Tambah">+</button></div>
          <button type="button" class="btn" data-act="cartpay" data-kode="${k}" data-qty="${item.qty}">Bayar</button>
          <button type="button" class="cart-remove" data-act="cartremove" data-kode="${k}">Hapus</button>
        </div>
      </div>
    </div>`;
    })
    .join("");
  openModal("cartModal");
}
function removeCartItem(kode) {
  STORE.cart = STORE.cart.filter((i) => i.kode !== kode);
  saveCart();
  openCartModal();
}

/* ---------- Checkout ---------- */
function openCheckoutModal(kode, initialQty = 1) {
  const prod = STORE.products.find((p) => p.kode === kode);
  if (!prod || prod.stok <= 0)
    return toast("Maaf, stok produk ini sedang habis.");
  stopCheckoutTimers();
  STORE.checkout = {
    product: prod,
    qty: Math.min(Math.max(1, initialQty), prod.stok),
    voucherCode: "",
    discount: 0,
    depositId: null,
    pollTimer: null,
    countdownTimer: null,
    expiresAt: null,
    qrisTotal: 0,
  };
  document.getElementById("chkVoucherInput").value = "";
  document.getElementById("chkVoucherStatus").textContent = "";
  showCheckoutStep("stepConfirm");
  updateCheckoutSummaryUI();
  openModal("checkoutModal");
}
function closeCheckoutModal() {
  stopCheckoutTimers();
  closeModal("checkoutModal");
}
function stopCheckoutTimers() {
  if (STORE.checkout.pollTimer) clearInterval(STORE.checkout.pollTimer);
  if (STORE.checkout.countdownTimer)
    clearInterval(STORE.checkout.countdownTimer);
  STORE.checkout.pollTimer = null;
  STORE.checkout.countdownTimer = null;
}
function showCheckoutStep(stepId) {
  ["stepConfirm", "stepQris", "stepSuccess"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = id !== stepId;
  });
  const box = document.querySelector("#checkoutModal .modal-box");
  if (box) box.scrollTop = 0;
}
function setCheckoutQty(nextQty) {
  const p = STORE.checkout.product;
  if (!p) return;
  STORE.checkout.qty = Math.min(Math.max(1, nextQty), p.stok);
  if (STORE.checkout.voucherCode) applyCheckoutVoucher(true);
  else updateCheckoutSummaryUI();
}
function changeCheckoutQty(delta) {
  setCheckoutQty(STORE.checkout.qty + delta);
}

function updateCheckoutSummaryUI() {
  const p = STORE.checkout.product;
  if (!p) return;
  const qty = STORE.checkout.qty;
  const pr = getEffectivePricing(p, qty);
  const discount = Math.min(
    STORE.checkout.discount || 0,
    Math.max(pr.subtotal - 1, 0),
  );
  const total = pr.subtotal - discount;

  document.getElementById("chkProdCategory").textContent =
    p.kategori || "Digital";
  document.getElementById("chkProdName").textContent = p.nama;
  document.getElementById("chkProdDesc").textContent = p.deskripsi || "-";
  document.getElementById("chkProdStock").textContent = `${p.stok} ready`;
  document.getElementById("chkQtyVal").textContent = qty;
  document.getElementById("btnQtyMinus").disabled = qty <= 1;
  document.getElementById("btnQtyPlus").disabled = qty >= p.stok;

  const tierBox = document.getElementById("chkTierBox");
  const tierList = document.getElementById("chkTierList");
  if (p.tiers && p.tiers.length) {
    tierBox.hidden = false;
    tierList.innerHTML = p.tiers
      .map(
        (t) =>
          `<button type="button" class="tier-chip ${pr.activeTier && pr.activeTier.min_qty === t.min_qty ? "active" : ""}" data-act="tier" data-qty="${esc(t.min_qty)}">≥${esc(t.min_qty)}x · ${rp(t.harga_satuan)}/pcs</button>`,
      )
      .join("");
  } else tierBox.hidden = true;

  document.getElementById("chkUnitPrice").textContent =
    rp(pr.unit) +
    (pr.activeTier ? " (Grosir)" : pr.flashActive ? " (Flash Sale)" : "");
  document.getElementById("chkSubtotal").textContent = rp(pr.subtotal);
  const discRow = document.getElementById("chkDiscountRow");
  if (discount > 0 && STORE.checkout.voucherCode) {
    discRow.hidden = false;
    document.getElementById("chkDiscountCode").textContent =
      STORE.checkout.voucherCode;
    document.getElementById("chkDiscountVal").textContent = `-${rp(discount)}`;
  } else discRow.hidden = true;
  document.getElementById("chkTotalAkhir").textContent = rp(total);
}

async function applyCheckoutVoucher(silent = false) {
  const raw = document
    .getElementById("chkVoucherInput")
    .value.trim()
    .toUpperCase();
  const statusEl = document.getElementById("chkVoucherStatus");
  const p = STORE.checkout.product;
  if (!p) return;
  if (!raw) {
    STORE.checkout.voucherCode = "";
    STORE.checkout.discount = 0;
    statusEl.textContent = "";
    return updateCheckoutSummaryUI();
  }
  const pr = getEffectivePricing(p, STORE.checkout.qty);
  try {
    const res = await fetch(`${FAEZ_CONFIG.apiBase}/api/store/voucher/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kode: raw, subtotal: pr.subtotal }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Voucher tidak valid");
    STORE.checkout.voucherCode = data.kode;
    STORE.checkout.discount = data.diskon;
    statusEl.style.color = "var(--green)";
    statusEl.textContent = `Voucher ${data.kode} aktif (-${rp(data.diskon)})`;
    if (!silent) toast("Voucher diterapkan!");
  } catch (err) {
    STORE.checkout.voucherCode = "";
    STORE.checkout.discount = 0;
    statusEl.style.color = "var(--danger)";
    statusEl.textContent =
      err.message === "Failed to fetch"
        ? "Tidak bisa terhubung ke server."
        : err.message;
  }
  updateCheckoutSummaryUI();
}

async function createQrisOrder() {
  const p = STORE.checkout.product;
  if (!p) return;
  const btn = document.getElementById("btnCreateQris");
  btn.disabled = true;
  btn.textContent = "Membuat QRIS...";
  try {
    const res = await fetch(`${FAEZ_CONFIG.apiBase}/api/store/checkout-qris`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kode: p.kode,
        qty: STORE.checkout.qty,
        voucher_code: STORE.checkout.voucherCode || null,
        telegram_id: document.getElementById("chkBuyerNote").value.trim(),
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Gagal membuat QRIS");

    STORE.checkout.depositId = data.deposit_id;
    STORE.checkout.expiresAt =
      Date.now() + (data.expire_minutes || 15) * 60 * 1000;
    STORE.checkout.qrisTotal = data.total_bayar;

    document.getElementById("qrisImg").src = getQrImageUrl(data.qris, 360);
    document.getElementById("qrisNominalAsli").textContent = rp(
      data.nominal_asli,
    );
    document.getElementById("qrisKodeUnik").textContent =
      "+" + rp(data.kode_unik);
    document.getElementById("qrisTotalBayar").textContent = rp(
      data.total_bayar,
    );

    showCheckoutStep("stepQris");
    startQrisTimers();
  } catch (err) {
    toast(
      err.message === "Failed to fetch"
        ? "Tidak bisa terhubung ke server. Coba lagi."
        : err.message,
    );
  } finally {
    btn.disabled = false;
    btn.textContent = "Bayar via QRIS";
  }
}

function startQrisTimers() {
  stopCheckoutTimers();
  const updateClock = () => {
    const rem = Math.max(0, STORE.checkout.expiresAt - Date.now());
    const m = Math.floor(rem / 60000);
    const s = Math.floor((rem % 60000) / 1000);
    document.getElementById("qrisCountdown").textContent =
      `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    if (rem <= 0) {
      stopCheckoutTimers();
      toast("Tagihan QRIS kedaluwarsa.");
      closeCheckoutModal();
    }
  };
  updateClock();
  STORE.checkout.countdownTimer = setInterval(updateClock, 1000);
  STORE.checkout.pollTimer = setInterval(() => checkPaymentStatus(true), 4000);
}

async function checkPaymentStatus(silent = false) {
  const depId = STORE.checkout.depositId;
  if (!depId) return;
  try {
    const res = await fetch(
      `${FAEZ_CONFIG.apiBase}/api/store/deposit/${depId}`,
    );
    const data = await res.json();
    if (data.ok && data.status === "PAID" && data.transaction) {
      stopCheckoutTimers();
      handleOrderPaidSuccess(data.transaction);
    } else if (!silent)
      toast("Pembayaran belum masuk. Pastikan nominal sesuai kode unik.");
  } catch (_) {
    if (!silent) toast("Gagal mengecek status pembayaran.");
  }
}

function handleOrderPaidSuccess(trx) {
  saveOrderLocal(
    trx,
    (document.getElementById("chkBuyerNote")?.value || "").trim(),
  );
  STORE.cart = STORE.cart.filter((i) => i.kode !== trx.kode_produk);
  saveCart();
  STORE.currentInvoice = trx;

  document.getElementById("succTrxId").textContent = trx.trx_id;
  document.getElementById("succProdName").textContent =
    `${trx.nama_produk || trx.kode_produk} ×${trx.qty || 1}`;
  document.getElementById("succTotalPaid").textContent = rp(trx.harga);
  document.getElementById("succAccountsList").textContent = (trx.accounts || [])
    .map((a, i) => `${i + 1}. ${a}`)
    .join("\n");

  showCheckoutStep("stepSuccess");
  toast("Pembayaran lunas! Akun berhasil dikirim.");
  loadStoreData();
}

async function copyTotalNominal() {
  if (!STORE.checkout.qrisTotal) return;
  const ok = await copyText(String(STORE.checkout.qrisTotal));
  toast(
    ok
      ? `Nominal ${STORE.checkout.qrisTotal} disalin`
      : "Gagal menyalin. Salin manual ya.",
  );
}
async function copyDeliveredAccounts(elId) {
  const t = document.getElementById(elId)?.textContent || "";
  if (!t) return;
  const ok = await copyText(t);
  toast(
    ok
      ? "Data akun disalin"
      : "Gagal menyalin. Tekan lama teks untuk menyalin.",
  );
}

function downloadInvoiceTxt(trx = STORE.currentInvoice) {
  if (!trx) return;
  const lines = [
    `BUKTI PEMBELIAN — ${STORE.storeName}`,
    `Invoice : ${trx.trx_id}`,
    `Produk  : ${trx.nama_produk || trx.kode_produk} (${trx.qty || 1}x)`,
    `Total   : ${rp(trx.harga)}`,
    `Garansi : ${trx.warranty_active ? "AKTIF" : "BELUM AKTIF"}`,
    "----------------------------------------",
    ...(trx.accounts || []).map((a, i) => `${i + 1}. ${a}`),
  ];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }),
  );
  a.download = `Invoice_${trx.trx_id}.txt`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

function openProductInTelegram() {
  const p = STORE.checkout.product;
  window.open(
    p
      ? `https://t.me/${STORE.botUsername}?start=buy_${encodeURIComponent(p.kode)}`
      : `https://t.me/${STORE.botUsername}`,
    "_blank",
    "noopener",
  );
}

/* ---------- Pesanan & garansi ---------- */
function getLocalOrders() {
  try {
    const arr = JSON.parse(localStorage.getItem(MY_ORDERS_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

function saveOrderLocal(trx, verifier = "") {
  const prevList = getLocalOrders();
  const prev = prevList.find((i) => i.trx_id === trx.trx_id) || {};
  const list = prevList.filter((i) => i.trx_id !== trx.trx_id);
  list.unshift({
    trx_id: trx.trx_id,
    nama_produk: trx.nama_produk || trx.kode_produk,
    harga: trx.harga,
    access_token: trx.access_token || prev.access_token || "",
    verifier: verifier || prev.verifier || "",
  });
  try {
    localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(list.slice(0, 12)));
  } catch (_) {}
}

function openInvoiceModal(prefillId = "") {
  renderRecentOrdersChips();
  if (prefillId) {
    document.getElementById("invoiceSearchInput").value = prefillId;
    lookupInvoiceById(prefillId);
  }
  openModal("invoiceModal");
}
function quickTrackInvoice() {
  const v = document
    .getElementById("quickInvoiceInput")
    .value.trim()
    .toUpperCase();
  if (!v) return toast("Masukkan nomor invoice dulu");
  openInvoiceModal(v);
}
function jumpToInvoiceWarranty() {
  if (!STORE.currentInvoice) return;
  const id = STORE.currentInvoice.trx_id;
  closeCheckoutModal();
  openInvoiceModal(id);
}

function renderRecentOrdersChips() {
  const wrap = document.getElementById("recentInvoicesWrap");
  const orders = getLocalOrders();
  if (!orders.length) {
    wrap.innerHTML = `<div class="field-hint" style="margin:0">Belum ada riwayat pesanan di perangkat ini.</div>`;
    return;
  }
  wrap.innerHTML = `<div class="mini-label">Riwayat pesanan di perangkat ini:</div><div style="display:flex;flex-wrap:wrap;gap:8px">${orders.map((o) => `<button type="button" class="btn-outline btn-sm" data-act="invoice" data-trx="${esc(o.trx_id)}"><span class="mono">${esc(o.trx_id)}</span> · ${esc(o.nama_produk)}</button>`).join("")}</div>`;
}

async function lookupInvoiceById(forcedId) {
  const trxId = (
    typeof forcedId === "string" && forcedId
      ? forcedId
      : document.getElementById("invoiceSearchInput").value || ""
  )
    .trim()
    .toUpperCase();
  if (!trxId) return toast("Masukkan nomor invoice");
  document.getElementById("invoiceSearchInput").value = trxId;
  const saved = getLocalOrders().find((o) => o.trx_id === trxId);
  const verifier =
    document.getElementById("invoiceVerifierInput").value.trim() ||
    saved?.verifier ||
    "";
  const token = saved?.access_token || STORE.currentInvoice?.access_token || "";
  const panel = document.getElementById("invoiceDetailPanel");
  panel.innerHTML = `<div class="summary-box" style="text-align:center">Memeriksa pesanan...</div>`;
  try {
    const qs = new URLSearchParams();
    if (token) qs.set("token", token);
    if (verifier) qs.set("verifier", verifier);
    const res = await fetch(
      `${FAEZ_CONFIG.apiBase}/api/store/invoice/${encodeURIComponent(trxId)}?${qs.toString()}`,
    );
    const data = await res.json();
    if (!res.ok || !data.ok) {
      panel.innerHTML = `<div class="summary-box" style="text-align:center;color:var(--danger)">${esc(data.error || "Invoice tidak ditemukan")}</div>`;
      return;
    }
    STORE.currentInvoice = data.invoice;
    STORE.selectedStars = data.invoice.rating || 5;
    saveOrderLocal(data.invoice, verifier);
    renderRecentOrdersChips();
    renderInvoiceDetail(data.invoice);
  } catch (_) {
    panel.innerHTML = "";
    toast("Gagal menghubungi server.");
  }
}

function renderInvoiceDetail(inv) {
  const panel = document.getElementById("invoiceDetailPanel");
  const accText =
    (inv.accounts || []).map((a, i) => `${i + 1}. ${esc(a)}`).join("\n") ||
    "Data akun tidak tersedia.";
  const claimsHtml = (inv.claims || []).length
    ? `<div style="margin-top:10px;font-size:12px"><strong>Status klaim garansi:</strong> <span class="row-gap" style="margin-top:4px">${inv.claims.map((c) => `<span class="pill-tag ${c.status === "REPLACED" ? "green" : ""}">#${esc(c.id)}: ${esc(c.status)}</span>`).join("")}</span></div>`
    : "";

  panel.innerHTML = `
    <div class="summary-box">
      <div class="row-between" style="margin-bottom:8px">
        <strong class="mono" style="overflow-wrap:anywhere">${esc(inv.trx_id)}</strong>
        <span class="pill-tag ${inv.warranty_active ? "green" : "red"}">${inv.warranty_active ? `Garansi aktif (★ ${esc(inv.rating || 5)}/5)` : "Garansi belum aktif"}</span>
      </div>
      <div class="summary-row"><span>Produk</span><strong>${esc(inv.nama_produk || inv.kode_produk)} ×${esc(inv.qty || 1)}</strong></div>
      <div class="summary-row"><span>Total</span><strong class="mono">${rp(inv.harga)}</strong></div>
      ${claimsHtml}
    </div>
    <div class="row-between mb4">
      <span class="mini-label nm">Data akun / pengganti</span>
      <div class="row-gap">
        <button type="button" class="btn-outline btn-sm" onclick="copyDeliveredAccounts('invAccBox')">Salin</button>
        <button type="button" class="btn-outline btn-sm" onclick="downloadInvoiceTxt()">Unduh .TXT</button>
      </div>
    </div>
    <pre id="invAccBox" class="account-box mono">${accText}</pre>
    ${
      !inv.warranty_active
        ? `<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px">
          <div style="font-weight:700;font-size:14px;margin-bottom:8px">Beri rating & aktifkan garansi</div>
          <div class="star-picker" id="starPicker" style="margin-bottom:10px">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star-btn ${n === STORE.selectedStars ? "active" : ""}" data-act="star" data-n="${n}">★ ${n}</button>`).join("")}</div>
          <div class="field"><input id="warrantyReviewInput" placeholder="Tulis ulasan singkat (opsional)" /></div>
          <button type="button" class="btn btn-block" data-act="rate" data-trx="${esc(inv.trx_id)}">Aktifkan garansi resmi</button>
        </div>`
        : `<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px">
          <div style="font-size:13px;color:var(--green);margin-bottom:10px">✓ Garansi aktif — ulasan: “${esc(inv.review || "-")}”</div>
          <button type="button" class="btn-outline btn-block danger" data-act="complainbox">Lapor masalah akun</button>
          <div id="complaintBox" hidden style="margin-top:10px">
            <div class="field"><label for="complaintInput">Jelaskan kendalanya</label><textarea id="complaintInput" placeholder="Contoh: akun tidak bisa login sejak tadi pagi"></textarea></div>
            <button type="button" class="btn btn-block" data-act="complain" data-trx="${esc(inv.trx_id)}">Kirim laporan</button>
          </div>
        </div>`
    }`;
}

function pickStar(n) {
  STORE.selectedStars = n;
  document
    .querySelectorAll("#starPicker .star-btn")
    .forEach((b, i) => b.classList.toggle("active", i + 1 === n));
}

function invoiceAuth(trxId) {
  const saved = getLocalOrders().find((o) => o.trx_id === trxId);
  return {
    verifier:
      document.getElementById("invoiceVerifierInput").value.trim() ||
      saved?.verifier ||
      "",
    token: saved?.access_token || STORE.currentInvoice?.access_token || "",
  };
}

async function submitWarrantyRating(trxId) {
  const { verifier, token } = invoiceAuth(trxId);
  const review =
    document.getElementById("warrantyReviewInput")?.value.trim() || "";
  try {
    const res = await fetch(
      `${FAEZ_CONFIG.apiBase}/api/store/invoice/${encodeURIComponent(trxId)}/rate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: STORE.selectedStars,
          review,
          token,
          verifier,
        }),
      },
    );
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Gagal menyimpan rating");
    toast("Garansi resmi berhasil diaktifkan!");
    loadStoreData();
    lookupInvoiceById(trxId);
  } catch (e) {
    toast(
      e.message === "Failed to fetch" ? "Gagal menghubungi server." : e.message,
    );
  }
}

async function submitWarrantyComplaint(trxId) {
  const msg = document.getElementById("complaintInput")?.value.trim();
  if (!msg) return toast("Tulis dulu kendala akunnya");
  const { verifier, token } = invoiceAuth(trxId);
  try {
    const res = await fetch(
      `${FAEZ_CONFIG.apiBase}/api/store/invoice/${encodeURIComponent(trxId)}/complain`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, token, verifier }),
      },
    );
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Gagal mengirim laporan");
    toast(`Laporan garansi #${data.claim_id} terkirim ke admin!`);
    lookupInvoiceById(trxId);
  } catch (e) {
    toast(
      e.message === "Failed to fetch" ? "Gagal menghubungi server." : e.message,
    );
  }
}

/* ---------- Voucher & restock ---------- */
function openVoucherModal() {
  const body = document.getElementById("voucherListBody");
  if (!STORE.vouchers.length)
    body.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted)">Belum ada voucher aktif saat ini.</div>`;
  else {
    body.innerHTML = STORE.vouchers
      .map((v) => {
        const pot =
          v.tipe === "PERSEN"
            ? `Diskon ${esc(v.nilai)}%`
            : `Potongan ${rp(v.nilai)}`;
        const sisa = Math.max(0, v.kuota - v.terpakai);
        return `<div class="summary-box voucher-card"><div style="min-width:0"><code class="mono voucher-code">${esc(v.kode)}</code><div class="voucher-title">${pot}</div><div class="voucher-sub">Min. belanja ${rp(v.min_belanja)} · Sisa ${sisa} kuota</div></div><button type="button" class="btn btn-sm" data-act="copyvoucher" data-code="${esc(v.kode)}">Salin</button></div>`;
      })
      .join("");
  }
  openModal("voucherModal");
}

function openAlertModal(kode) {
  const p = STORE.products.find((x) => x.kode === kode);
  if (!p) return;
  document.getElementById("alertProdKode").value = p.kode;
  document.getElementById("alertProdTitle").textContent =
    `Stok "${p.nama}" sedang habis. Masukkan ID Telegram agar bot mengabari kamu otomatis begitu stok tersedia lagi.`;
  openModal("alertModal");
}

async function submitStockAlert() {
  const kode = document.getElementById("alertProdKode").value;
  const contact = document.getElementById("alertContactInput").value.trim();
  if (!contact) return toast("Masukkan ID Telegram atau kontak kamu");
  try {
    const res = await fetch(`${FAEZ_CONFIG.apiBase}/api/store/stock-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kode, contact }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Gagal menyimpan notifikasi");
    closeModal("alertModal");
    document.getElementById("alertContactInput").value = "";
    toast("Siap! Kamu akan dikabari saat stok datang.");
  } catch (e) {
    toast(
      e.message === "Failed to fetch" ? "Gagal menghubungi server." : e.message,
    );
  }
}

/* ---------- Event delegation (aman dari bug tanda kutip) ---------- */
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const { act, kode } = el.dataset;
  const inDetail = !!el.closest("#detailModal");

  switch (act) {
    case "home":
      e.preventDefault();
      goShop();
      break;
    case "mode":
      STORE.page = 1;
      el.dataset.mode === "ALL"
        ? resetFiltersKeepSearch()
        : setFilterMode(el.dataset.mode);
      break;
    case "cat":
      selectCategory(el.dataset.cat);
      break;
    case "reset":
      resetFilters();
      break;
    case "page":
      goPage(Number(el.dataset.page));
      break;
    case "detail":
      openProductDetail(kode);
      break;
    case "cart":
      addToCart(kode);
      if (inDetail) closeModal("detailModal");
      break;
    case "buy":
      if (inDetail) closeModal("detailModal");
      openCheckoutModal(kode);
      break;
    case "alert":
      if (inDetail) closeModal("detailModal");
      openAlertModal(kode);
      break;
    case "editimg":
      e.stopPropagation();
      if (inDetail) closeModal("detailModal");
      openImageEditor(kode);
      break;
    case "cartqty":
      changeCartQty(kode, Number(el.dataset.delta));
      break;
    case "cartremove":
      removeCartItem(kode);
      break;
    case "cartpay":
      closeModal("cartModal");
      openCheckoutModal(kode, Number(el.dataset.qty) || 1);
      break;
    case "tier":
      setCheckoutQty(Number(el.dataset.qty));
      break;
    case "invoice":
      lookupInvoiceById(el.dataset.trx);
      break;
    case "star":
      pickStar(Number(el.dataset.n));
      break;
    case "rate":
      submitWarrantyRating(el.dataset.trx);
      break;
    case "complainbox": {
      const b = document.getElementById("complaintBox");
      if (b) {
        b.hidden = !b.hidden;
        if (!b.hidden) document.getElementById("complaintInput")?.focus();
      }
      break;
    }
    case "complain":
      submitWarrantyComplaint(el.dataset.trx);
      break;
    case "copyvoucher":
      copyText(el.dataset.code).then((ok) =>
        toast(ok ? `Kode ${el.dataset.code} disalin!` : "Gagal menyalin kode"),
      );
      break;
  }
});

function resetFiltersKeepSearch() {
  STORE.activeCategory = "ALL";
  STORE.specialMode = "ALL";
  STORE.page = 1;
  renderGrid();
}

// Enter / Space pada kartu (aksesibilitas keyboard)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    [
      "detailModal",
      "cartModal",
      "checkoutModal",
      "invoiceModal",
      "voucherModal",
      "alertModal",
      "pinModal",
      "imgModal",
      "exportModal",
    ].forEach((id) => {
      if (id === "checkoutModal") closeCheckoutModal();
      else closeModal(id);
    });
    return;
  }
  if (
    (e.key === "Enter" || e.key === " ") &&
    e.target.matches?.(".card-thumb[data-act='detail']")
  ) {
    e.preventDefault();
    openProductDetail(e.target.dataset.kode);
  }
});

// Gambar yang gagal dimuat → otomatis jatuh ke ikon produk
document.addEventListener(
  "error",
  (e) => {
    const t = e.target;
    if (t && t.tagName === "IMG" && t.classList.contains("thumb-img"))
      t.remove();
  },
  true,
);

function syncTopbarHeight() {
  const tb = document.querySelector(".topbar");
  if (tb)
    document.documentElement.style.setProperty(
      "--topbar-h",
      tb.offsetHeight + "px",
    );
}
window.addEventListener("resize", syncTopbarHeight);

document.addEventListener("DOMContentLoaded", () => {
  hydrateIcons();
  syncTopbarHeight();
  loadStoreData();
});
