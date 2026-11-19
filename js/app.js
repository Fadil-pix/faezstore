/* ==========================================================================
   FAEZ STORE — Minimalist Storefront v2 (Stuffsus UI + All New Features)
   ========================================================================== */

const CART_KEY = "faez_cart_v2";
const MY_ORDERS_KEY = "faez_my_orders_v2";
const PAGE_SIZE = 9;

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
    product: null, qty: 1, voucherCode: "", discount: 0,
    depositId: null, pollTimer: null, countdownTimer: null, expiresAt: null, qrisTotal: 0,
  },
  currentInvoice: null,
  selectedStars: 5,
};

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function openModal(id) { document.getElementById(id)?.classList.add("open"); }
function closeModal(id) { document.getElementById(id)?.classList.remove("open"); }

function getCategoryIcon(kat) {
  const k = String(kat || "").toLowerCase();
  if (k.includes("stream") || k.includes("film") || k.includes("video")) return "tv";
  if (k.includes("music") || k.includes("musik") || k.includes("spotify")) return "headphones";
  if (k.includes("vpn") || k.includes("keamanan")) return "shield";
  if (k.includes("game") || k.includes("top")) return "gamepad-2";
  if (k.includes("produk") || k.includes("ai") || k.includes("desain")) return "briefcase";
  return "box";
}

function getEffectivePricing(p, qty = 1) {
  const flashActive = p.flash_active && p.flash_end_at && new Date(p.flash_end_at) > new Date();
  let unit = flashActive ? Number(p.flash_price) : Number(p.effective_price || p.harga);
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

function formatCountdownShort(endAt) {
  const diff = Math.max(0, new Date(endAt).getTime() - Date.now());
  if (diff <= 0) return "";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function loadStoreData() {
  try {
    const res = await fetch(`${FAEZ_CONFIG.apiBase}/api/store/catalog`, { headers: { Accept: "application/json" } });
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
  renderSidebar();
  renderGrid();
  renderRecommendations();
  if (window.lucide) lucide.createIcons();
}

function renderSidebar() {
  const el = document.getElementById("categorySidebar");
  if (!el) return;
  const counts = {};
  STORE.products.forEach((p) => { const k = p.kategori || "Lainnya"; counts[k] = (counts[k] || 0) + 1; });

  const discountCount = STORE.products.filter((p) => p.flash_active || (p.strike_price && p.strike_price > p.effective_price)).length;
  const discBadge = document.getElementById("discountCountBadge");
  if (discBadge) {
    discBadge.textContent = discountCount;
    discBadge.style.display = discountCount > 0 ? "inline-block" : "none";
  }

  const allActive = STORE.activeCategory === "ALL" && STORE.specialMode === "ALL";
  let html = `<button class="cat-item ${allActive ? "active" : ""}" onclick="selectCategory('ALL')"><span class="cat-left"><i data-lucide="shopping-bag" style="width:15px"></i> All Product</span><span class="cat-count">${STORE.products.length}</span></button>`;

  Object.keys(counts).forEach((kat) => {
    const active = STORE.activeCategory === kat && STORE.specialMode === "ALL";
    html += `<button class="cat-item sub ${active ? "active" : ""}" onclick="selectCategory('${esc(kat)}')"><span class="cat-left"><i data-lucide="${getCategoryIcon(kat)}" style="width:14px"></i> ${esc(kat)}</span><span class="cat-count soft">${counts[kat]}</span></button>`;
  });
  el.innerHTML = html;
}

function selectCategory(kat) {
  STORE.activeCategory = kat;
  STORE.specialMode = "ALL";
  STORE.page = 1;
  updateNavHighlights();
  renderSidebar();
  renderGrid();
  if (window.lucide) lucide.createIcons();
}

function setFilterMode(mode) {
  STORE.specialMode = mode;
  if (mode !== "ALL") STORE.activeCategory = "ALL";
  STORE.page = 1;
  updateNavHighlights();
  renderSidebar();
  renderGrid();
  document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  if (window.lucide) lucide.createIcons();
}

function updateNavHighlights() {
  document.querySelectorAll(".nav-links button[data-nav]").forEach((b) => b.classList.toggle("active", b.dataset.nav === STORE.specialMode));
  document.querySelectorAll(".sidebar button[data-special]").forEach((b) => b.classList.toggle("active", b.dataset.special === STORE.specialMode));
}

function handleSearch(val) {
  STORE.searchQuery = String(val || "").trim().toLowerCase();
  STORE.page = 1;
  renderGrid();
}

function resetFilters() {
  STORE.activeCategory = "ALL";
  STORE.specialMode = "ALL";
  STORE.searchQuery = "";
  STORE.page = 1;
  const inp = document.getElementById("searchInput");
  if (inp) inp.value = "";
  updateNavHighlights();
  renderSidebar();
  renderGrid();
}

function getFilteredProducts() {
  let list = [...STORE.products];
  if (STORE.activeCategory !== "ALL") list = list.filter((p) => (p.kategori || "Lainnya") === STORE.activeCategory);
  if (STORE.specialMode === "DISCOUNT") list = list.filter((p) => p.flash_active || (p.strike_price && p.strike_price > p.effective_price));
  else if (STORE.specialMode === "BEST_SELLER") list.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
  else if (STORE.specialMode === "NEW") list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

  if (STORE.searchQuery) {
    const q = STORE.searchQuery;
    list = list.filter((p) => p.nama.toLowerCase().includes(q) || p.kode.toLowerCase().includes(q) || (p.kategori || "").toLowerCase().includes(q) || (p.deskripsi || "").toLowerCase().includes(q));
  }
  return list;
}

function buildProductCardHtml(p) {
  const hasStock = Number(p.stok) > 0;
  const icon = getCategoryIcon(p.kategori);
  const price = Number(p.effective_price || p.harga);
  const strike = p.strike_price && p.strike_price > price ? p.strike_price : null;
  const revCount = Number(p.review_count || 0);
  const ratingText = revCount > 0 ? `(${revCount} Reviews)` : `(Baru)`;

  let promoBadge = "";
  if (p.flash_active && p.flash_end_at) promoBadge = `<span class="promo-pill-badge" data-flash-end="${esc(p.flash_end_at)}">⚡ ${formatCountdownShort(p.flash_end_at)}</span>`;
  else if (p.tiers && p.tiers.length) promoBadge = `<span class="promo-pill-badge grosir">Grosir</span>`;

  const visualHtml = p.image_url
    ? `<img src="${esc(p.image_url)}" alt="${esc(p.nama)}" loading="lazy" />`
    : `<div class="product-monogram"><i data-lucide="${icon}" style="width:26px;height:26px;stroke-width:1.7"></i><span class="mono">${esc(p.kode.slice(0, 8))}</span></div>`;

  const buttonsHtml = hasStock
    ? `<button class="btn-outline-pill" onclick="addToCart('${esc(p.kode)}')">Add to Cart</button><button class="btn-black" onclick="openCheckoutModal('${esc(p.kode)}')">Buy Now</button>`
    : `<button class="btn-outline-pill" disabled>Stok Habis</button><button class="btn-black" onclick="openAlertModal('${esc(p.kode)}')">Kabari Stok</button>`;

  return `
    <article class="product-card">
      <div class="card-thumb" onclick="openProductDetail('${esc(p.kode)}')">
        ${promoBadge}
        <span class="cat-pill-badge">${esc(p.kategori || "Digital")}</span>
        ${visualHtml}
        <span class="stock-chip ${hasStock ? "" : "empty"}">${hasStock ? `${p.stok} ready` : "Habis"}</span>
      </div>
      <h3 class="card-title" onclick="openProductDetail('${esc(p.kode)}')" title="${esc(p.nama)}">${esc(p.nama)}</h3>
      <div class="card-meta-row">
        <div class="card-rating"><span class="star">★</span><strong>${esc(p.avg_rating || "5.0")}</strong><span>${ratingText}</span></div>
        <div class="card-price-wrap">${strike ? `<span class="card-strike">${rp(strike)}</span>` : ""}<span class="card-price">${rp(price)}</span></div>
      </div>
      <div class="card-actions">${buttonsHtml}</div>
    </article>`;
}

function renderGrid() {
  const grid = document.getElementById("productGrid");
  const pag = document.getElementById("paginationBar");
  if (!grid) return;

  const list = getFilteredProducts();
  if (!list.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px 16px;background:var(--surface);border-radius:18px;"><div style="font-weight:700;margin-bottom:6px">Produk tidak ditemukan</div><div style="font-size:13px;color:var(--muted);margin-bottom:14px">Coba kata kunci lain atau lihat semua produk kami.</div><button class="btn-black" onclick="resetFilters()">Tampilkan Semua</button></div>`;
    if (pag) pag.innerHTML = "";
    return;
  }

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (STORE.page > totalPages) STORE.page = totalPages;
  const start = (STORE.page - 1) * PAGE_SIZE;
  grid.innerHTML = list.slice(start, start + PAGE_SIZE).map(buildProductCardHtml).join("");

  if (pag) {
    let nums = "";
    for (let i = 1; i <= totalPages; i++) nums += `<button class="page-btn ${i === STORE.page ? "active" : ""}" onclick="goPage(${i})">${i}</button>`;
    pag.innerHTML = `<button class="page-btn" ${STORE.page <= 1 ? "disabled" : ""} onclick="goPage(${STORE.page - 1})">← Previous</button><div class="page-nums">${nums}</div><button class="page-btn" ${STORE.page >= totalPages ? "disabled" : ""} onclick="goPage(${STORE.page + 1})">Next →</button>`;
  }
  if (window.lucide) lucide.createIcons();
}

function goPage(n) { STORE.page = n; renderGrid(); document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" }); }

function renderRecommendations() {
  const rail = document.getElementById("recRail");
  if (!rail) return;
  const best = [...STORE.products].sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0) || Number(b.avg_rating) - Number(a.avg_rating)).slice(0, 8);
  rail.innerHTML = best.map(buildProductCardHtml).join("");
  if (window.lucide) lucide.createIcons();
}

function scrollRec(dx) { document.getElementById("recRail")?.scrollBy({ left: dx, behavior: "smooth" }); }

setInterval(() => {
  document.querySelectorAll("[data-flash-end]").forEach((el) => {
    const t = formatCountdownShort(el.getAttribute("data-flash-end"));
    el.textContent = t ? `⚡ ${t}` : "Flash Berakhir";
  });
}, 1000);

function openProductDetail(kode) {
  const p = STORE.products.find((x) => x.kode === kode);
  if (!p) return;
  const prodReviews = STORE.reviews.filter((r) => r.kode_produk === p.kode);
  const price = Number(p.effective_price || p.harga);
  const hasStock = Number(p.stok) > 0;

  const tiersHtml = p.tiers?.length
    ? `<div class="summary-box"><div style="font-size:12px;font-weight:700;margin-bottom:6px">🏷 Harga Grosir Bertingkat (Otomatis saat Checkout)</div>${p.tiers.map((t) => `<div class="summary-row"><span>Beli minimal ${t.min_qty} pcs</span><strong class="mono" style="color:var(--ink)">${rp(t.harga_satuan)} / pcs</strong></div>`).join("")}</div>`
    : "";

  const reviewsHtml = prodReviews.length
    ? prodReviews.slice(0, 8).map((r) => `<div class="review-item"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px"><span style="color:var(--star);font-weight:700">${"★".repeat(Number(r.rating || 5))}</span><span style="font-size:11px;color:var(--dim)">${esc(r.buyer_masked || "Pembeli")} · ${esc(r.trx_masked || "")}</span></div><div style="font-size:13px;color:var(--ink-soft)">"${esc(r.review || "Pengiriman instan & berfungsi normal.")}"</div></div>`).join("")
    : `<div style="font-size:12.5px;color:var(--muted);padding:10px 0">Belum ada ulasan tertulis untuk produk ini. Jadilah pembeli pertama!</div>`;

  document.getElementById("detailModalBody").innerHTML = `
    <div class="modal-head">
      <div><span class="pill-tag">${esc(p.kategori)}</span> <span class="pill-tag ${hasStock ? "green" : "red"}">${hasStock ? `Stok Ready: ${p.stok}` : "Stok Habis"}</span></div>
      <button class="btn-outline-pill" onclick="closeModal('detailModal')">✕</button>
    </div>
    <h2 style="font-size:20px;font-weight:800;margin-bottom:6px">${esc(p.nama)}</h2>
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px">
      <div class="card-rating" style="font-size:13px"><span class="star">★</span><strong>${esc(p.avg_rating || "5.0")}</strong><span>(${p.review_count || 0} ulasan · ${p.sold_count || 0} terjual)</span></div>
      <div>${p.strike_price ? `<span style="font-size:13px;color:var(--dim);text-decoration:line-through;margin-right:6px">${rp(p.strike_price)}</span>` : ""}<strong style="font-size:20px">${rp(price)}</strong></div>
    </div>
    <p style="font-size:13px;color:var(--muted);margin-bottom:14px">${esc(p.deskripsi || "Pengiriman akun otomatis 24 jam setelah pembayaran QRIS terverifikasi.")}</p>
    ${tiersHtml}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 18px">
      ${hasStock
        ? `<button class="btn-outline-pill" onclick="addToCart('${esc(p.kode)}');closeModal('detailModal')">Add to Cart</button><button class="btn-black" onclick="closeModal('detailModal');openCheckoutModal('${esc(p.kode)}')">Buy Now</button>`
        : `<button class="btn-outline-pill" disabled>Stok Habis</button><button class="btn-black" onclick="closeModal('detailModal');openAlertModal('${esc(p.kode)}')">🔔 Kabari Saat Restock</button>`}
    </div>
    <div style="border-top:1px solid var(--border);padding-top:14px"><div style="font-size:14px;font-weight:700;margin-bottom:6px">Ulasan Pembeli Terverifikasi</div>${reviewsHtml}</div>`;
  openModal("detailModal");
}

function loadCart() {
  try { STORE.cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); if (!Array.isArray(STORE.cart)) STORE.cart = []; }
  catch (_) { STORE.cart = []; }
  updateCartBadge();
}
function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(STORE.cart)); } catch (_) {} updateCartBadge(); }
function updateCartBadge() { const badge = document.getElementById("cartCount"); if (badge) badge.textContent = STORE.cart.reduce((s, i) => s + Number(i.qty || 1), 0); }

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

function openCartModal() {
  const body = document.getElementById("cartBody");
  if (!STORE.cart.length) {
    body.innerHTML = `<div style="text-align:center;padding:28px 10px;color:var(--muted)">Keranjang kamu masih kosong.</div>`;
    return openModal("cartModal");
  }
  body.innerHTML = STORE.cart
    .map((item) => {
      const p = STORE.products.find((x) => x.kode === item.kode);
      if (!p) return "";
      const pr = getEffectivePricing(p, item.qty);
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid var(--border-light)"><div><div style="font-weight:700;font-size:13.5px">${esc(p.nama)}</div><div style="font-size:12px;color:var(--muted)">${rp(pr.unit)} × ${item.qty} = <strong>${rp(pr.subtotal)}</strong></div></div><div style="display:flex;align-items:center;gap:6px"><button class="btn-outline-pill" style="padding:5px 10px" onclick="removeCartItem('${esc(p.kode)}')">✕</button><button class="btn-black" style="padding:6px 12px" onclick="closeModal('cartModal');openCheckoutModal('${esc(p.kode)}', ${item.qty})">Bayar</button></div></div>`;
    })
    .join("");
  openModal("cartModal");
}
function removeCartItem(kode) { STORE.cart = STORE.cart.filter((i) => i.kode !== kode); saveCart(); openCartModal(); }

function openCheckoutModal(kode, initialQty = 1) {
  const prod = STORE.products.find((p) => p.kode === kode);
  if (!prod || prod.stok <= 0) return toast("Maaf, stok produk ini sedang habis.");
  stopCheckoutTimers();
  STORE.checkout = { product: prod, qty: Math.min(Math.max(1, initialQty), prod.stok), voucherCode: "", discount: 0, depositId: null, pollTimer: null, countdownTimer: null, expiresAt: null, qrisTotal: 0 };
  document.getElementById("chkVoucherInput").value = "";
  document.getElementById("chkVoucherStatus").textContent = "";
  showCheckoutStep("stepConfirm");
  updateCheckoutSummaryUI();
  openModal("checkoutModal");
}
function closeCheckoutModal() { stopCheckoutTimers(); closeModal("checkoutModal"); }
function stopCheckoutTimers() {
  if (STORE.checkout.pollTimer) clearInterval(STORE.checkout.pollTimer);
  if (STORE.checkout.countdownTimer) clearInterval(STORE.checkout.countdownTimer);
  STORE.checkout.pollTimer = null;
  STORE.checkout.countdownTimer = null;
}
function showCheckoutStep(stepId) {
  ["stepConfirm", "stepQris", "stepSuccess"].forEach((id) => { const el = document.getElementById(id); if (el) el.style.display = id === stepId ? "block" : "none"; });
}
function setCheckoutQty(nextQty) {
  const p = STORE.checkout.product;
  if (!p) return;
  STORE.checkout.qty = Math.min(Math.max(1, nextQty), p.stok);
  if (STORE.checkout.voucherCode) applyCheckoutVoucher(true);
  else updateCheckoutSummaryUI();
}
function changeCheckoutQty(delta) { setCheckoutQty(STORE.checkout.qty + delta); }

function updateCheckoutSummaryUI() {
  const p = STORE.checkout.product;
  if (!p) return;
  const qty = STORE.checkout.qty;
  const pr = getEffectivePricing(p, qty);
  const discount = Math.min(STORE.checkout.discount || 0, Math.max(pr.subtotal - 1, 0));
  const total = pr.subtotal - discount;

  document.getElementById("chkProdCategory").textContent = p.kategori || "Digital";
  document.getElementById("chkProdName").textContent = p.nama;
  document.getElementById("chkProdDesc").textContent = p.deskripsi || "-";
  document.getElementById("chkProdStock").textContent = `${p.stok} ready`;
  document.getElementById("chkQtyVal").textContent = qty;
  document.getElementById("btnQtyMinus").disabled = qty <= 1;
  document.getElementById("btnQtyPlus").disabled = qty >= p.stok;

  const tierBox = document.getElementById("chkTierBox");
  const tierList = document.getElementById("chkTierList");
  if (p.tiers && p.tiers.length) {
    tierBox.style.display = "block";
    tierList.innerHTML = p.tiers.map((t) => `<button type="button" class="tier-chip ${pr.activeTier && pr.activeTier.min_qty === t.min_qty ? "active" : ""}" onclick="setCheckoutQty(${t.min_qty})">≥${t.min_qty}x · ${rp(t.harga_satuan)}/pcs</button>`).join("");
  } else tierBox.style.display = "none";

  document.getElementById("chkUnitPrice").textContent = rp(pr.unit) + (pr.activeTier ? " (Grosir)" : pr.flashActive ? " (Flash Sale)" : "");
  document.getElementById("chkSubtotal").textContent = rp(pr.subtotal);
  const discRow = document.getElementById("chkDiscountRow");
  if (discount > 0 && STORE.checkout.voucherCode) {
    discRow.style.display = "flex";
    document.getElementById("chkDiscountCode").textContent = STORE.checkout.voucherCode;
    document.getElementById("chkDiscountVal").textContent = `-${rp(discount)}`;
  } else discRow.style.display = "none";
  document.getElementById("chkTotalAkhir").textContent = rp(total);
}

async function applyCheckoutVoucher(silent = false) {
  const raw = document.getElementById("chkVoucherInput").value.trim().toUpperCase();
  const statusEl = document.getElementById("chkVoucherStatus");
  const p = STORE.checkout.product;
  if (!p) return;
  if (!raw) { STORE.checkout.voucherCode = ""; STORE.checkout.discount = 0; statusEl.textContent = ""; return updateCheckoutSummaryUI(); }
  const pr = getEffectivePricing(p, STORE.checkout.qty);
  try {
    const res = await fetch(`${FAEZ_CONFIG.apiBase}/api/store/voucher/check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kode: raw, subtotal: pr.subtotal }) });
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
    statusEl.textContent = err.message;
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
      body: JSON.stringify({ kode: p.kode, qty: STORE.checkout.qty, voucher_code: STORE.checkout.voucherCode || null, telegram_id: document.getElementById("chkBuyerNote").value.trim() }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Gagal membuat QRIS");

    STORE.checkout.depositId = data.deposit_id;
    STORE.checkout.expiresAt = Date.now() + (data.expire_minutes || 15) * 60 * 1000;
    STORE.checkout.qrisTotal = data.total_bayar;

    document.getElementById("qrisImg").src = getQrImageUrl(data.qris, 360);
    document.getElementById("qrisNominalAsli").textContent = rp(data.nominal_asli);
    document.getElementById("qrisKodeUnik").textContent = "+" + rp(data.kode_unik);
    document.getElementById("qrisTotalBayar").textContent = rp(data.total_bayar);

    showCheckoutStep("stepQris");
    startQrisTimers();
  } catch (err) { toast(err.message); }
  finally { btn.disabled = false; btn.textContent = "Bayar via QRIS Dinamis"; }
}

function startQrisTimers() {
  stopCheckoutTimers();
  const updateClock = () => {
    const rem = Math.max(0, STORE.checkout.expiresAt - Date.now());
    const m = Math.floor(rem / 60000);
    const s = Math.floor((rem % 60000) / 1000);
    document.getElementById("qrisCountdown").textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    if (rem <= 0) { stopCheckoutTimers(); toast("Tagihan QRIS kedaluwarsa."); closeCheckoutModal(); }
  };
  updateClock();
  STORE.checkout.countdownTimer = setInterval(updateClock, 1000);
  STORE.checkout.pollTimer = setInterval(() => checkPaymentStatus(true), 4000);
}

async function checkPaymentStatus(silent = false) {
  const depId = STORE.checkout.depositId;
  if (!depId) return;
  try {
    const res = await fetch(`${FAEZ_CONFIG.apiBase}/api/store/deposit/${depId}`);
    const data = await res.json();
    if (data.ok && data.status === "PAID" && data.transaction) { stopCheckoutTimers(); handleOrderPaidSuccess(data.transaction); }
    else if (!silent) toast("Pembayaran belum masuk. Pastikan nominal sesuai kode unik.");
  } catch (_) { if (!silent) toast("Gagal mengecek status pembayaran."); }
}

function handleOrderPaidSuccess(trx) {
  saveOrderLocal(trx, (document.getElementById("chkBuyerNote")?.value || "").trim());
  STORE.cart = STORE.cart.filter((i) => i.kode !== trx.kode_produk);
  saveCart();
  STORE.currentInvoice = trx;

  document.getElementById("succTrxId").textContent = trx.trx_id;
  document.getElementById("succProdName").textContent = `${trx.nama_produk || trx.kode_produk} ×${trx.qty || 1}`;
  document.getElementById("succTotalPaid").textContent = rp(trx.harga);
  document.getElementById("succAccountsList").textContent = (trx.accounts || []).map((a, i) => `${i + 1}. ${a}`).join("\n");

  showCheckoutStep("stepSuccess");
  toast("Pembayaran lunas! Akun berhasil dikirim.");
  loadStoreData();
}

function copyTotalNominal() { if (STORE.checkout.qrisTotal) { navigator.clipboard.writeText(String(STORE.checkout.qrisTotal)); toast(`Nominal ${STORE.checkout.qrisTotal} disalin`); } }
function copyDeliveredAccounts(elId) { const t = document.getElementById(elId)?.textContent || ""; if (t) { navigator.clipboard.writeText(t); toast("Data akun disalin"); } }

function downloadInvoiceTxt(trx = STORE.currentInvoice) {
  if (!trx) return;
  const lines = [
    `BUKTI PEMBELIAN — ${STORE.storeName}`, `Invoice : ${trx.trx_id}`,
    `Produk  : ${trx.nama_produk || trx.kode_produk} (${trx.qty || 1}x)`, `Total   : ${rp(trx.harga)}`,
    `Garansi : ${trx.warranty_active ? "AKTIF" : "BELUM AKTIF"}`, "----------------------------------------",
    ...(trx.accounts || []).map((a, i) => `${i + 1}. ${a}`),
  ];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
  a.download = `Invoice_${trx.trx_id}.txt`;
  a.click();
}

function openProductInTelegram() {
  const p = STORE.checkout.product;
  window.open(p ? `https://t.me/${STORE.botUsername}?start=buy_${p.kode}` : `https://t.me/${STORE.botUsername}`, "_blank", "noopener");
}

function getLocalOrders() {
  try { const arr = JSON.parse(localStorage.getItem(MY_ORDERS_KEY) || "[]"); return Array.isArray(arr) ? arr : []; }
  catch (_) { return []; }
}

function saveOrderLocal(trx, verifier = "") {
  const prevList = getLocalOrders();
  const prev = prevList.find((i) => i.trx_id === trx.trx_id) || {};
  const list = prevList.filter((i) => i.trx_id !== trx.trx_id);
  list.unshift({ trx_id: trx.trx_id, nama_produk: trx.nama_produk || trx.kode_produk, harga: trx.harga, access_token: trx.access_token || prev.access_token || "", verifier: verifier || prev.verifier || "" });
  try { localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(list.slice(0, 12))); } catch (_) {}
}

function openInvoiceModal(prefillId = "") {
  renderRecentOrdersChips();
  if (prefillId) { document.getElementById("invoiceSearchInput").value = prefillId; lookupInvoiceById(prefillId); }
  openModal("invoiceModal");
}
function quickTrackInvoice() { openInvoiceModal(document.getElementById("quickInvoiceInput").value.trim().toUpperCase()); }
function jumpToInvoiceWarranty() { if (!STORE.currentInvoice) return; const id = STORE.currentInvoice.trx_id; closeCheckoutModal(); openInvoiceModal(id); }

function renderRecentOrdersChips() {
  const wrap = document.getElementById("recentInvoicesWrap");
  const orders = getLocalOrders();
  if (!orders.length) { wrap.innerHTML = `<div style="font-size:12px;color:var(--dim)">Belum ada riwayat transaksi di perangkat ini.</div>`; return; }
  wrap.innerHTML = `<div style="font-size:12px;font-weight:700;margin-bottom:6px">Riwayat Pesanan di Perangkat Ini:</div><div style="display:flex;flex-wrap:wrap;gap:6px">${orders.map((o) => `<button class="btn-outline-pill" style="padding:5px 11px;font-size:11.5px" onclick="lookupInvoiceById('${esc(o.trx_id)}')"><span class="mono">${esc(o.trx_id)}</span> · ${esc(o.nama_produk)}</button>`).join("")}</div>`;
}

async function lookupInvoiceById(forcedId) {
  const trxId = (forcedId || document.getElementById("invoiceSearchInput").value || "").trim().toUpperCase();
  if (!trxId) return toast("Masukkan nomor invoice");
  document.getElementById("invoiceSearchInput").value = trxId;
  const saved = getLocalOrders().find((o) => o.trx_id === trxId);
  const verifier = document.getElementById("invoiceVerifierInput").value.trim() || saved?.verifier || "";
  const token = saved?.access_token || STORE.currentInvoice?.access_token || "";
  const panel = document.getElementById("invoiceDetailPanel");
  try {
    const qs = new URLSearchParams();
    if (token) qs.set("token", token);
    if (verifier) qs.set("verifier", verifier);
    const res = await fetch(`${FAEZ_CONFIG.apiBase}/api/store/invoice/${encodeURIComponent(trxId)}?${qs.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.ok) { panel.innerHTML = `<div class="summary-box" style="text-align:center;color:var(--danger)">${esc(data.error || "Invoice tidak ditemukan")}</div>`; return; }
    STORE.currentInvoice = data.invoice;
    STORE.selectedStars = data.invoice.rating || 5;
    saveOrderLocal(data.invoice, verifier);
    renderRecentOrdersChips();
    renderInvoiceDetail(data.invoice);
  } catch (_) { toast("Gagal menghubungi server."); }
}

function renderInvoiceDetail(inv) {
  const panel = document.getElementById("invoiceDetailPanel");
  const accText = (inv.accounts || []).map((a, i) => `${i + 1}. ${esc(a)}`).join("\n") || "Data akun tidak tersedia.";
  const claimsHtml = (inv.claims || []).length
    ? `<div style="margin-top:10px;font-size:12px"><strong>Status Klaim Garansi:</strong> ${inv.claims.map((c) => `<span class="pill-tag ${c.status === "REPLACED" ? "green" : ""}">#${c.id}: ${c.status}</span>`).join(" ")}</div>`
    : "";

  panel.innerHTML = `
    <div class="summary-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong class="mono">${esc(inv.trx_id)}</strong>
        <span class="pill-tag ${inv.warranty_active ? "green" : "red"}">${inv.warranty_active ? `Garansi Aktif (★ ${inv.rating || 5}/5)` : "Garansi Belum Aktif"}</span>
      </div>
      <div class="summary-row"><span>Produk</span><strong>${esc(inv.nama_produk || inv.kode_produk)} ×${inv.qty || 1}</strong></div>
      <div class="summary-row"><span>Total</span><strong class="mono">${rp(inv.harga)}</strong></div>
      ${claimsHtml}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0 4px">
      <span style="font-size:12px;font-weight:700">Data Akun / Pengganti</span>
      <div style="display:flex;gap:6px">
        <button class="btn-outline-pill" style="padding:4px 10px;font-size:11px" onclick="copyDeliveredAccounts('invAccBox')">Salin</button>
        <button class="btn-outline-pill" style="padding:4px 10px;font-size:11px" onclick="downloadInvoiceTxt()">Unduh .TXT</button>
      </div>
    </div>
    <pre id="invAccBox" class="account-box mono">${accText}</pre>
    ${!inv.warranty_active
      ? `<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px"><div style="font-weight:700;font-size:13px;margin-bottom:6px">Beri Rating Bintang &amp; Aktifkan Garansi</div><div class="star-picker" id="starPicker" style="margin-bottom:10px">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star-btn ${n === STORE.selectedStars ? "active" : ""}" onclick="pickStar(${n})">★ ${n}</button>`).join("")}</div><div class="field"><input id="warrantyReviewInput" placeholder="Tulis ulasan singkat kamu (opsional)..." /></div><button class="btn-black" onclick="submitWarrantyRating('${esc(inv.trx_id)}')">Aktifkan Garansi Resmi</button></div>`
      : `<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div style="font-size:12.5px;color:var(--green)">✓ Garansi aktif — Ulasan: "${esc(inv.review || "-")}"</div><button class="btn-outline-pill" style="color:var(--danger);border-color:#fecaca" onclick="submitWarrantyComplaint('${esc(inv.trx_id)}')">🆘 Lapor Masalah</button></div>`}`;
}

function pickStar(n) { STORE.selectedStars = n; document.querySelectorAll("#starPicker .star-btn").forEach((b, i) => b.classList.toggle("active", i + 1 === n)); }

async function submitWarrantyRating(trxId) {
  const saved = getLocalOrders().find((o) => o.trx_id === trxId);
  const verifier = document.getElementById("invoiceVerifierInput").value.trim() || saved?.verifier || "";
  const token = saved?.access_token || STORE.currentInvoice?.access_token || "";
  const review = document.getElementById("warrantyReviewInput")?.value.trim() || "";
  try {
    const res = await fetch(`${FAEZ_CONFIG.apiBase}/api/store/invoice/${encodeURIComponent(trxId)}/rate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: STORE.selectedStars, review, token, verifier }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Gagal menyimpan rating");
    toast("Garansi resmi berhasil diaktifkan!");
    loadStoreData();
    lookupInvoiceById(trxId);
  } catch (e) { toast(e.message); }
}

async function submitWarrantyComplaint(trxId) {
  const msg = prompt(`Jelaskan kendala akun untuk invoice ${trxId}:`);
  if (!msg) return;
  const saved = getLocalOrders().find((o) => o.trx_id === trxId);
  const verifier = document.getElementById("invoiceVerifierInput").value.trim() || saved?.verifier || "";
  const token = saved?.access_token || STORE.currentInvoice?.access_token || "";
  try {
    const res = await fetch(`${FAEZ_CONFIG.apiBase}/api/store/invoice/${encodeURIComponent(trxId)}/complain`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, token, verifier }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Gagal mengirim laporan");
    toast(`Laporan garansi #${data.claim_id} terkirim ke admin!`);
    lookupInvoiceById(trxId);
  } catch (e) { toast(e.message); }
}

function openVoucherModal() {
  const body = document.getElementById("voucherListBody");
  if (!STORE.vouchers.length) body.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted)">Belum ada voucher aktif saat ini.</div>`;
  else {
    body.innerHTML = STORE.vouchers
      .map((v) => {
        const pot = v.tipe === "PERSEN" ? `Diskon ${v.nilai}%` : `Potongan ${rp(v.nilai)}`;
        const sisa = Math.max(0, v.kuota - v.terpakai);
        return `<div class="summary-box" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><code class="mono" style="font-size:14px;font-weight:700">${esc(v.kode)}</code><div style="font-size:13px;font-weight:700;margin-top:2px">${pot}</div><div style="font-size:11.5px;color:var(--muted)">Min. belanja ${rp(v.min_belanja)} · Sisa ${sisa} kuota</div></div><button class="btn-black" onclick="navigator.clipboard.writeText('${esc(v.kode)}');toast('Kode ${esc(v.kode)} disalin!')">Salin</button></div>`;
      })
      .join("");
  }
  openModal("voucherModal");
}

function openAlertModal(kode) {
  const p = STORE.products.find((x) => x.kode === kode);
  if (!p) return;
  document.getElementById("alertProdKode").value = p.kode;
  document.getElementById("alertProdTitle").textContent = `Stok "${p.nama}" sedang habis. Masukkan ID Telegram agar bot langsung mengabari kamu otomatis begitu stok tersedia kembali.`;
  openModal("alertModal");
}

async function submitStockAlert() {
  const kode = document.getElementById("alertProdKode").value;
  const contact = document.getElementById("alertContactInput").value.trim();
  if (!contact) return toast("Masukkan ID Telegram atau kontak kamu");
  try {
    const res = await fetch(`${FAEZ_CONFIG.apiBase}/api/store/stock-alert`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kode, contact }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Gagal menyimpan notifikasi");
    closeModal("alertModal");
    document.getElementById("alertContactInput").value = "";
    toast("Siap! Kamu akan dikabari otomatis saat stok datang.");
  } catch (e) { toast(e.message); }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    ["detailModal", "cartModal", "checkoutModal", "invoiceModal", "voucherModal", "alertModal"].forEach(closeModal);
  }
});

document.addEventListener("DOMContentLoaded", () => { loadStoreData(); });
