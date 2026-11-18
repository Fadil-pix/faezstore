/* ==========================================================================
   FAEZ STORE — Storefront Application Logic
   ========================================================================== */

let STORE = {
  isLiveBackend: false,
  storeName: FAEZ_CONFIG.storeName,
  botUsername: FAEZ_CONFIG.botUsername,
  products: [],
  vouchers: [],
  reviews: [],
  stats: {
    totalProduk: 0,
    stokReady: 0,
    avgRating: "5.0",
    totalRatings: 0,
    trxAll: 0,
  },
  activeCategory: "ALL",
  onlyReady: false,
  sortBy: "default",
  searchQuery: "",
  checkout: {
    product: null,
    qty: 1,
    voucherCode: "",
    discount: 0,
    depositId: null,
    pollTimer: null,
    countdownTimer: null,
    expiresAt: null,
  },
  currentInvoice: null,
  selectedStars: 5,
};

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

// Theme Handling
function initTheme() {
  const saved = localStorage.getItem("faez_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeButton(saved);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("faez_theme", next);
  updateThemeButton(next);
}

function updateThemeButton(theme) {
  const btn = document.getElementById("themeBtn");
  if (!btn) return;
  btn.innerHTML =
    theme === "dark"
      ? '<i data-lucide="sun" style="width:13px;"></i> Light'
      : '<i data-lucide="moon" style="width:13px;"></i> Dark';
  if (window.lucide) lucide.createIcons();
}

// Section Navigation
function switchSection(secId, btnEl) {
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  const target = document.getElementById(secId);
  if (target) target.classList.add("active");
  if (btnEl) {
    btnEl.classList.add("active");
  } else {
    const match = document.querySelector(`.tab-btn[data-target="${secId}"]`);
    if (match) match.classList.add("active");
  }
}

// Load Storefront Data (API first, fallback to Local Seed DB)
async function loadStoreData() {
  try {
    const res = await fetch(`${FAEZ_CONFIG.apiBase}/api/store/catalog`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("Fallback local");
    const data = await res.json();
    if (!data.ok) throw new Error("Invalid response");

    STORE.isLiveBackend = true;
    STORE.storeName = data.storeName || FAEZ_CONFIG.storeName;
    STORE.botUsername = data.botUsername || FAEZ_CONFIG.botUsername;
    STORE.products = data.products || [];
    STORE.vouchers = data.vouchers || [];
    STORE.reviews = data.reviews || [];
    STORE.stats = data.stats || STORE.stats;
    setConnectionBadge(true);
  } catch (err) {
    STORE.isLiveBackend = false;
    const local = getLocalStoreData();
    // Recompute live stock counts from local.stocks
    const products = local.products.map((p) => {
      const readyCount = local.stocks.filter(
        (s) => s.kode_produk === p.kode && !s.is_sold,
      ).length;
      return { ...p, stok: readyCount };
    });
    const rated = local.transactions.filter((t) => t.rating);
    const avg = rated.length
      ? (
          rated.reduce((a, b) => a + Number(b.rating), 0) / rated.length
        ).toFixed(1)
      : "5.0";

    STORE.storeName = local.storeName || FAEZ_CONFIG.storeName;
    STORE.products = products;
    STORE.vouchers = local.vouchers || [];
    STORE.reviews = local.transactions.filter((t) => t.rating);
    STORE.stats = {
      totalProduk: products.length,
      stokReady: products.reduce((a, b) => a + b.stok, 0),
      avgRating: avg,
      totalRatings: rated.length,
      trxAll: local.transactions.length,
    };
    setConnectionBadge(false);
  }

  renderHeaderAndMetrics();
  renderCategoryPills();
  renderCatalogGrid();
  renderVouchersSection();
  renderReviewsSection();
  renderRecentInvoicesList();
  if (window.lucide) lucide.createIcons();
}

function setConnectionBadge(isLive) {
  const badge = document.getElementById("connBadge");
  if (!badge) return;
  if (isLive) {
    badge.className = "pill pill-green";
    badge.innerHTML = '<span class="status-dot"></span> Server Live';
  } else {
    badge.className = "pill pill-neutral";
    badge.innerHTML = '<span class="status-dot"></span> Mode Katalog';
  }
}

function renderHeaderAndMetrics() {
  document.getElementById("storeTitle").textContent = STORE.storeName;
  const kats = new Set(STORE.products.map((p) => p.kategori || "Lainnya"));

  document.getElementById("mTotalProduk").textContent =
    `${STORE.stats.totalProduk} Produk`;
  document.getElementById("mTotalKategori").textContent =
    `${kats.size} kategori aktif`;

  document.getElementById("mStokReady").textContent =
    `${STORE.stats.stokReady} Akun`;
  document.getElementById("mStokSub").textContent = "Pengiriman otomatis 24/7";

  document.getElementById("mRating").textContent =
    `${STORE.stats.avgRating} / 5.0`;
  document.getElementById("mRatingSub").textContent =
    `${STORE.stats.totalRatings} ulasan terverifikasi`;

  document.getElementById("mTrxAll").textContent = "QRIS Dinamis";
  document.getElementById("mTrxSub").textContent =
    `${STORE.stats.trxAll}+ pesanan diproses`;
}

function renderCategoryPills() {
  const container = document.getElementById("categoryPills");
  if (!container) return;

  const counts = { ALL: STORE.products.length };
  STORE.products.forEach((p) => {
    const k = p.kategori || "Lainnya";
    counts[k] = (counts[k] || 0) + 1;
  });

  const categories = ["ALL", ...Object.keys(counts).filter((k) => k !== "ALL")];
  container.innerHTML = categories
    .map((kat) => {
      const label = kat === "ALL" ? "Semua" : kat;
      const isActive = STORE.activeCategory === kat ? "active" : "";
      return `
        <button class="cat-btn ${isActive}" onclick="selectCategory('${esc(kat)}')">
          <span>${esc(label)}</span>
          <span class="cat-count mono">${counts[kat]}</span>
        </button>
      `;
    })
    .join("");
}

function selectCategory(kat) {
  STORE.activeCategory = kat;
  renderCategoryPills();
  renderCatalogGrid();
}

function toggleReadyFilter() {
  STORE.onlyReady = !STORE.onlyReady;
  const btn = document.getElementById("btnReadyFilter");
  if (btn) {
    btn.className = STORE.onlyReady
      ? "btn btn-sm btn-success"
      : "btn btn-sm btn-outline";
  }
  renderCatalogGrid();
}

function handleSortChange(val) {
  STORE.sortBy = val;
  renderCatalogGrid();
}

function handleSearchInput(val) {
  STORE.searchQuery = val.trim().toLowerCase();
  renderCatalogGrid();
}

function renderCatalogGrid() {
  const grid = document.getElementById("catalogGrid");
  if (!grid) return;

  let list = [...STORE.products];

  if (STORE.activeCategory !== "ALL") {
    list = list.filter(
      (p) => (p.kategori || "Lainnya") === STORE.activeCategory,
    );
  }

  if (STORE.onlyReady) {
    list = list.filter((p) => p.stok > 0);
  }

  if (STORE.searchQuery) {
    const q = STORE.searchQuery;
    list = list.filter(
      (p) =>
        p.kode.toLowerCase().includes(q) ||
        p.nama.toLowerCase().includes(q) ||
        (p.kategori || "").toLowerCase().includes(q) ||
        (p.deskripsi || "").toLowerCase().includes(q),
    );
  }

  if (STORE.sortBy === "price_asc") {
    list.sort((a, b) => a.harga - b.harga);
  } else if (STORE.sortBy === "price_desc") {
    list.sort((a, b) => b.harga - a.harga);
  } else if (STORE.sortBy === "stock_desc") {
    list.sort((a, b) => b.stok - a.stok);
  }

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="panel" style="grid-column: 1 / -1; text-align: center; padding: 36px 20px;">
        <div style="color: var(--muted); font-weight: 500; margin-bottom: 6px;">Tidak ada produk yang cocok</div>
        <div style="color: var(--dim); font-size: 12px; margin-bottom: 14px;">Coba kata kunci lain atau tampilkan semua kategori.</div>
        <button class="btn btn-outline btn-sm" onclick="resetCatalogFilters()">Reset Filter</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = list
    .map((p) => {
      const hasStock = p.stok > 0;
      const stockPill = !hasStock
        ? '<span class="pill pill-red">Habis</span>'
        : p.stok <= 2
          ? `<span class="pill pill-amber">Sisa ${p.stok} stok</span>`
          : `<span class="pill pill-green">Ready · ${p.stok}</span>`;

      return `
        <article class="product-card ${hasStock ? "" : "out-of-stock"}">
          <div>
            <div class="card-top">
              <div class="card-meta">
                <span class="pill pill-neutral">${esc(p.kategori || "Lainnya")}</span>
                <code class="card-code mono">${esc(p.kode)}</code>
              </div>
              ${stockPill}
            </div>
            <h3 class="card-title">${esc(p.nama)}</h3>
            <p class="card-desc">${esc(p.deskripsi || "Pengiriman akun otomatis setelah pembayaran terverifikasi.")}</p>
          </div>
          <div class="card-foot">
            <div>
              <span class="price-label">Harga Satuan</span>
              <span class="price-val mono">${rp(p.harga)}</span>
            </div>
            <div style="display:flex;gap:6px;">
              <button
                class="btn btn-sm"
                ${hasStock ? "" : "disabled"}
                onclick="openCheckoutModal('${esc(p.kode)}')"
              >
                ${hasStock ? "Beli Instan" : "Stok Habis"}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function resetCatalogFilters() {
  STORE.activeCategory = "ALL";
  STORE.onlyReady = false;
  STORE.sortBy = "default";
  STORE.searchQuery = "";
  const searchInput = document.getElementById("searchCatalog");
  if (searchInput) searchInput.value = "";
  const btnReady = document.getElementById("btnReadyFilter");
  if (btnReady) btnReady.className = "btn btn-sm btn-outline";
  renderCategoryPills();
  renderCatalogGrid();
}

// ==========================================================================
// CHECKOUT & DYNAMIC QRIS FLOW
// ==========================================================================

function openCheckoutModal(kode) {
  const prod = STORE.products.find((p) => p.kode === kode);
  if (!prod || prod.stok <= 0)
    return toast("Maaf, stok produk ini sedang habis.");

  stopCheckoutTimers();
  STORE.checkout = {
    product: prod,
    qty: 1,
    voucherCode: "",
    discount: 0,
    depositId: null,
    pollTimer: null,
    countdownTimer: null,
    expiresAt: null,
  };

  document.getElementById("chkVoucherInput").value = "";
  document.getElementById("chkVoucherStatus").textContent = "";
  showCheckoutStep("stepConfirm");
  updateCheckoutSummaryUI();
  document.getElementById("checkoutModal").classList.add("open");
}

function closeCheckoutModal() {
  stopCheckoutTimers();
  document.getElementById("checkoutModal").classList.remove("open");
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
    if (el) el.style.display = id === stepId ? "block" : "none";
  });
}

function changeCheckoutQty(delta) {
  const p = STORE.checkout.product;
  if (!p) return;
  let next = STORE.checkout.qty + delta;
  if (next < 1) next = 1;
  if (next > p.stok) {
    toast(`Maksimal pembelian sesuai stok ready (${p.stok})`);
    next = p.stok;
  }
  STORE.checkout.qty = next;
  if (STORE.checkout.voucherCode) {
    applyCheckoutVoucher(true);
  } else {
    updateCheckoutSummaryUI();
  }
}

function updateCheckoutSummaryUI() {
  const p = STORE.checkout.product;
  if (!p) return;
  const qty = STORE.checkout.qty;
  const subtotal = p.harga * qty;
  const discount = Math.min(
    STORE.checkout.discount || 0,
    Math.max(subtotal - 1, 0),
  );
  const total = subtotal - discount;

  document.getElementById("chkProdCategory").textContent =
    p.kategori || "Lainnya";
  document.getElementById("chkProdCode").textContent = p.kode;
  document.getElementById("chkProdName").textContent = p.nama;
  document.getElementById("chkProdDesc").textContent = p.deskripsi || "-";
  document.getElementById("chkProdStock").textContent = `${p.stok} tersedia`;

  document.getElementById("chkQtyVal").textContent = qty;
  document.getElementById("btnQtyMinus").disabled = qty <= 1;
  document.getElementById("btnQtyPlus").disabled = qty >= p.stok;

  document.getElementById("chkSubtotal").textContent =
    `${rp(p.harga)} × ${qty} = ${rp(subtotal)}`;
  const discRow = document.getElementById("chkDiscountRow");
  if (discount > 0 && STORE.checkout.voucherCode) {
    discRow.style.display = "flex";
    document.getElementById("chkDiscountCode").textContent =
      STORE.checkout.voucherCode;
    document.getElementById("chkDiscountVal").textContent = `-${rp(discount)}`;
  } else {
    discRow.style.display = "none";
  }
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
    updateCheckoutSummaryUI();
    return;
  }

  const subtotal = p.harga * STORE.checkout.qty;

  if (STORE.isLiveBackend) {
    try {
      const res = await fetch(
        `${FAEZ_CONFIG.apiBase}/api/store/voucher/check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kode: raw, subtotal }),
        },
      );
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Voucher tidak valid");
      STORE.checkout.voucherCode = data.kode;
      STORE.checkout.discount = data.diskon;
      statusEl.style.color = "var(--green)";
      statusEl.textContent = `Voucher ${data.kode} diterapkan (-${rp(data.diskon)})`;
      if (!silent) toast("Voucher berhasil diterapkan");
    } catch (err) {
      STORE.checkout.voucherCode = "";
      STORE.checkout.discount = 0;
      statusEl.style.color = "var(--red)";
      statusEl.textContent = err.message;
    }
  } else {
    // Local voucher validation
    const v = STORE.vouchers.find((item) => item.kode.toUpperCase() === raw);
    if (!v) {
      STORE.checkout.voucherCode = "";
      STORE.checkout.discount = 0;
      statusEl.style.color = "var(--red)";
      statusEl.textContent = "Kode voucher tidak ditemukan.";
    } else if (v.terpakai >= v.kuota) {
      STORE.checkout.voucherCode = "";
      STORE.checkout.discount = 0;
      statusEl.style.color = "var(--red)";
      statusEl.textContent = "Kuota voucher sudah habis.";
    } else if (subtotal < v.min_belanja) {
      STORE.checkout.voucherCode = "";
      STORE.checkout.discount = 0;
      statusEl.style.color = "var(--red)";
      statusEl.textContent = `Minimal belanja ${rp(v.min_belanja)}.`;
    } else {
      let disk =
        v.tipe === "PERSEN" ? Math.floor((subtotal * v.nilai) / 100) : v.nilai;
      if (disk >= subtotal) disk = Math.max(subtotal - 1, 0);
      STORE.checkout.voucherCode = v.kode;
      STORE.checkout.discount = disk;
      statusEl.style.color = "var(--green)";
      statusEl.textContent = `Voucher ${v.kode} aktif (-${rp(disk)})`;
      if (!silent) toast("Voucher berhasil diterapkan");
    }
  }
  updateCheckoutSummaryUI();
}

async function createQrisOrder() {
  const p = STORE.checkout.product;
  if (!p) return;
  const qty = STORE.checkout.qty;
  const voucherCode = STORE.checkout.voucherCode;
  const buyerContact = document.getElementById("chkBuyerNote").value.trim();

  const btn = document.getElementById("btnCreateQris");
  btn.disabled = true;
  btn.textContent = "Membuat QRIS...";

  try {
    if (STORE.isLiveBackend) {
      const res = await fetch(
        `${FAEZ_CONFIG.apiBase}/api/store/checkout-qris`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kode: p.kode,
            qty,
            voucher_code: voucherCode || null,
            telegram_id: buyerContact,
          }),
        },
      );
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Gagal membuat tagihan QRIS");

      renderQrisPaymentStep({
        depositId: data.deposit_id,
        qrisString: data.qris,
        nominalAsli: data.nominal_asli,
        kodeUnik: data.kode_unik,
        totalBayar: data.total_bayar,
        expiresAt: Date.now() + (data.expire_minutes || 15) * 60 * 1000,
        isDemo: false,
      });
    } else {
      // Standalone/Local Dynamic QRIS Generation using real EMVCo CRC16
      const subtotal = p.harga * qty;
      const discount = Math.min(
        STORE.checkout.discount || 0,
        Math.max(subtotal - 1, 0),
      );
      const nominalAsli = subtotal - discount;
      const kodeUnik = Math.floor(Math.random() * 299) + 101;
      const totalBayar = nominalAsli + kodeUnik;
      const qrisString = buatQrisDinamis(FAEZ_CONFIG.qrisStatic, totalBayar);

      renderQrisPaymentStep({
        depositId: "DEP-" + Date.now(),
        qrisString,
        nominalAsli,
        kodeUnik,
        totalBayar,
        expiresAt: Date.now() + FAEZ_CONFIG.expireMinutes * 60 * 1000,
        isDemo: true,
      });
    }
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Bayar via QRIS Dinamis";
  }
}

function renderQrisPaymentStep(info) {
  STORE.checkout.depositId = info.depositId;
  STORE.checkout.expiresAt = info.expiresAt;
  STORE.checkout.qrisTotal = info.totalBayar;
  STORE.checkout.qrisString = info.qrisString;

  document.getElementById("qrisImg").src = getQrImageUrl(info.qrisString, 360);
  document.getElementById("qrisNominalAsli").textContent = rp(info.nominalAsli);
  document.getElementById("qrisKodeUnik").textContent = "+" + rp(info.kodeUnik);
  document.getElementById("qrisTotalBayar").textContent = rp(info.totalBayar);
  document.getElementById("qrisRawString").value = info.qrisString;

  const simBtn = document.getElementById("btnSimulatePay");
  if (simBtn) {
    simBtn.style.display = info.isDemo ? "inline-flex" : "none";
  }

  showCheckoutStep("stepQris");
  startQrisTimers(info.isDemo);
}

function startQrisTimers(isDemo) {
  stopCheckoutTimers();

  const updateClock = () => {
    const rem = Math.max(0, STORE.checkout.expiresAt - Date.now());
    const mins = Math.floor(rem / 60000);
    const secs = Math.floor((rem % 60000) / 1000);
    const el = document.getElementById("qrisCountdown");
    if (el)
      el.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    if (rem <= 0) {
      stopCheckoutTimers();
      toast("Waktu pembayaran QRIS telah habis.");
      closeCheckoutModal();
    }
  };
  updateClock();
  STORE.checkout.countdownTimer = setInterval(updateClock, 1000);

  if (!isDemo) {
    STORE.checkout.pollTimer = setInterval(
      () => checkPaymentStatus(true),
      4000,
    );
  }
}

async function checkPaymentStatus(silent = false) {
  const depId = STORE.checkout.depositId;
  if (!depId) return;

  if (STORE.isLiveBackend) {
    try {
      const res = await fetch(`${FAEZ_CONFIG.apiBase}/api/store/deposit/${depId}`);
      const data = await res.json();
      if (data.ok && data.status === "PAID" && data.transaction) {
        stopCheckoutTimers();
        handleOrderPaidSuccess(data.transaction);
      } else if (!silent) {
        toast(
          "Pembayaran belum terdeteksi. Pastikan nominal sesuai kode unik.",
        );
      }
    } catch (e) {
      if (!silent) toast("Gagal memeriksa status pembayaran.");
    }
  } else if (!silent) {
    toast(
      "Gunakan tombol 'Simulasikan Bayar Lunas' untuk menguji pengiriman akun otomatis.",
    );
  }
}

function simulateDemoPayment() {
  const p = STORE.checkout.product;
  if (!p) return;
  const qty = STORE.checkout.qty;
  const local = getLocalStoreData();
  const avail = local.stocks.filter(
    (s) => s.kode_produk === p.kode && !s.is_sold,
  );

  if (avail.length < qty) {
    return toast("Stok di database lokal tidak mencukupi.");
  }

  const taken = avail.slice(0, qty);
  const trxId = `TRX-${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;

  taken.forEach((item) => {
    const idx = local.stocks.findIndex((s) => s.id === item.id);
    if (idx !== -1) {
      local.stocks[idx].is_sold = true;
      local.stocks[idx].trx_id = trxId;
    }
  });

  if (STORE.checkout.voucherCode) {
    const vIdx = local.vouchers.findIndex(
      (v) => v.kode === STORE.checkout.voucherCode,
    );
    if (vIdx !== -1) local.vouchers[vIdx].terpakai += 1;
  }

  const subtotal = p.harga * qty;
  const discount = Math.min(
    STORE.checkout.discount || 0,
    Math.max(subtotal - 1, 0),
  );
  const finalPrice = subtotal - discount;

  const newTrx = {
    trx_id: trxId,
    telegram_id:
      document.getElementById("chkBuyerNote").value.trim() || "WEB-BUYER",
    username:
      document.getElementById("chkBuyerNote").value.trim() || "web_customer",
    kode_produk: p.kode,
    nama_produk: p.nama,
    harga: finalPrice,
    qty,
    voucher_code: STORE.checkout.voucherCode || null,
    rating: null,
    review: null,
    warranty_active: 0,
    created_at: new Date().toISOString(),
    accounts: taken.map((s) => s.data_akun),
  };

  local.transactions.unshift(newTrx);
  saveLocalStoreData(local);
  stopCheckoutTimers();
  loadStoreData();
  handleOrderPaidSuccess(newTrx);
}

function handleOrderPaidSuccess(trx) {
  saveRecentInvoiceToBrowser(trx);
  renderRecentInvoicesList();

  document.getElementById("succTrxId").textContent = trx.trx_id;
  document.getElementById("succProdName").textContent =
    `${trx.nama_produk || trx.kode_produk} ×${trx.qty || 1}`;
  document.getElementById("succTotalPaid").textContent = rp(trx.harga);
  document.getElementById("succAccountsList").textContent = (trx.accounts || [])
    .map((acc, i) => `${i + 1}. ${acc}`)
    .join("\n");

  STORE.currentInvoice = trx;
  showCheckoutStep("stepSuccess");
  toast("Pembayaran lunas! Data akun berhasil dikirim.");
}

function copyTotalNominal() {
  const num = STORE.checkout.qrisTotal;
  if (!num) return;
  navigator.clipboard.writeText(String(num));
  toast(`Nominal ${num} disalin ke clipboard`);
}

function copyDeliveredAccounts(elementId = "succAccountsList") {
  const txt = document.getElementById(elementId)?.textContent || "";
  if (!txt) return;
  navigator.clipboard.writeText(txt);
  toast("Data akun disalin ke clipboard");
}

function downloadInvoiceTxt(trx = STORE.currentInvoice) {
  if (!trx) return;
  const lines = [
    "==========================================",
    `BUKTI PEMBELIAN RESMI — ${STORE.storeName}`,
    "==========================================",
    `No. Invoice   : ${trx.trx_id}`,
    `Produk        : ${trx.nama_produk || trx.kode_produk} (${trx.kode_produk})`,
    `Jumlah        : ${trx.qty || 1}x`,
    `Total Bayar   : ${rp(trx.harga)}`,
    `Waktu         : ${new Date(trx.created_at).toLocaleString("id-ID")}`,
    `Status Garansi: ${trx.warranty_active ? "AKTIF" : "BELUM AKTIF (Wajib Rating)"}`,
    "------------------------------------------",
    "DATA AKUN / VOUCHER:",
    ...(trx.accounts || []).map((a, i) => `${i + 1}. ${a}`),
    "==========================================",
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/plain;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Invoice_${trx.trx_id}.txt`;
  a.click();
}

function openProductInTelegram() {
  const p = STORE.checkout.product;
  const botUser = STORE.botUsername || "faezstoresbot";
  const url = p
    ? `https://t.me/${botUser}?start=buy_${p.kode}`
    : `https://t.me/${botUser}`;
  window.open(url, "_blank", "noopener");
}

// ==========================================================================
// INVOICE LOOKUP, WARRANTY ACTIVATION & COMPLAINT
// ==========================================================================

function getRecentInvoicesFromBrowser() {
  try {
    return JSON.parse(localStorage.getItem("faez_recent_invoices") || "[]");
  } catch (e) {
    return [];
  }
}

function saveRecentInvoiceToBrowser(trx) {
  const list = getRecentInvoicesFromBrowser().filter(
    (i) => i.trx_id !== trx.trx_id,
  );
  list.unshift({
    trx_id: trx.trx_id,
    nama_produk: trx.nama_produk || trx.kode_produk,
    harga: trx.harga,
    created_at: trx.created_at,
  });
  localStorage.setItem(
    "faez_recent_invoices",
    JSON.stringify(list.slice(0, 10)),
  );
}

function renderRecentInvoicesList() {
  const box = document.getElementById("recentInvoicesList");
  if (!box) return;
  const recent = getRecentInvoicesFromBrowser();
  const fallbackList = recent.length
    ? recent
    : STORE.reviews.slice(0, 3).map((t) => ({
        trx_id: t.trx_id,
        nama_produk: t.nama_produk || t.kode_produk,
        harga: t.harga,
        created_at: t.created_at,
      }));

  if (fallbackList.length === 0) {
    box.innerHTML = `<div style="color:var(--dim);font-size:12px;">Belum ada riwayat invoice di perangkat ini.</div>`;
    return;
  }

  box.innerHTML = fallbackList
    .map(
      (item) => `
      <div
        style="display:flex;align-items:center;justify-content:space-between;padding:9px 11px;background:var(--bg);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;cursor:pointer;"
        onclick="lookupInvoiceById('${esc(item.trx_id)}')"
      >
        <div>
          <div class="mono" style="font-size:12px;font-weight:600;color:var(--accent);">${esc(item.trx_id)}</div>
          <div style="font-size:11px;color:var(--muted);">${esc(item.nama_produk)} · ${rp(item.harga)}</div>
        </div>
        <span class="btn btn-outline btn-sm">Buka</span>
      </div>
    `,
    )
    .join("");
}

function jumpToInvoiceWarranty() {
  if (!STORE.currentInvoice) return;
  const trxId = STORE.currentInvoice.trx_id;
  closeCheckoutModal();
  switchSection("secInvoice");
  lookupInvoiceById(trxId);
}

async function lookupInvoiceById(forcedId) {
  const inputEl = document.getElementById("invoiceSearchInput");
  const trxId = (forcedId || inputEl.value || "").trim().toUpperCase();
  if (!trxId) return toast("Masukkan nomor invoice (contoh: TRX-...)");
  if (inputEl) inputEl.value = trxId;

  let found = null;
  if (STORE.isLiveBackend) {
    try {
      const res = await fetch(
        `${FAEZ_CONFIG.apiBase}/api/store/invoice/${encodeURIComponent(trxId)}`,
      );
      const data = await res.json();
      if (data.ok && data.invoice) found = data.invoice;
    } catch (e) {}
  }

  if (!found) {
    const local = getLocalStoreData();
    found = local.transactions.find((t) => t.trx_id.toUpperCase() === trxId);
  }

  const container = document.getElementById("invoiceDetailPanel");
  if (!found) {
    container.innerHTML = `
      <div style="text-align:center;padding:32px 16px;color:var(--muted);">
        Invoice <code class="mono">${esc(trxId)}</code> tidak ditemukan. Pastikan kode invoice sudah benar.
      </div>
    `;
    return;
  }

  STORE.currentInvoice = found;
  STORE.selectedStars = found.rating || 5;
  renderInvoiceDetail(found);
}

function renderInvoiceDetail(inv) {
  const container = document.getElementById("invoiceDetailPanel");
  if (!container) return;

  const warrantyBadge = inv.warranty_active
    ? `<span class="pill pill-green">Garansi Resmi Aktif (★ ${inv.rating || 5}/5)</span>`
    : `<span class="pill pill-amber">Belum Aktif · Wajib Rating</span>`;

  const accountsHtml =
    inv.accounts && inv.accounts.length
      ? inv.accounts.map((a, i) => `${i + 1}. ${esc(a)}`).join("\n")
      : "Data akun tersimpan di riwayat Telegram Bot atau perangkat pembelian.";

  container.innerHTML = `
    <div class="panel-head" style="border-bottom:1px solid var(--border);padding-bottom:14px;">
      <div>
        <div style="font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:0.04em;">Detail Transaksi</div>
        <h2 class="mono" style="font-size:16px;margin-top:2px;">${esc(inv.trx_id)}</h2>
      </div>
      ${warrantyBadge}
    </div>

    <div class="summary-box">
      <div class="summary-row"><span>Produk</span><strong style="color:var(--text);">${esc(inv.nama_produk || inv.kode_produk)} ×${inv.qty || 1}</strong></div>
      <div class="summary-row"><span>Kode Produk</span><code class="mono">${esc(inv.kode_produk)}</code></div>
      <div class="summary-row"><span>Total Pembayaran</span><strong class="mono" style="color:var(--text);">${rp(inv.harga)}</strong></div>
      <div class="summary-row"><span>Waktu Transaksi</span><span>${new Date(inv.created_at).toLocaleString("id-ID")}</span></div>
    </div>

    <div style="margin-top:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:12px;font-weight:600;color:var(--muted);">Data Akun / Voucher</span>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-outline btn-sm" onclick="copyDeliveredAccounts('invAccountData')">Salin</button>
          <button class="btn btn-outline btn-sm" onclick="downloadInvoiceTxt()">Unduh .TXT</button>
        </div>
      </div>
      <pre id="invAccountData" class="account-box mono">${accountsHtml}</pre>
    </div>

    ${
      !inv.warranty_active
        ? `
      <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border);">
        <h3 style="font-size:13px;font-weight:600;margin-bottom:4px;">Aktivasi Garansi Resmi</h3>
        <p style="font-size:12px;color:var(--muted);margin-bottom:12px;">Berikan rating bintang dan ulasan singkat untuk mengaktifkan garansi 30 hari pada invoice ini.</p>
        <div class="field">
          <label>Pilih Rating</label>
          <div class="star-picker" id="starPicker">
            ${[1, 2, 3, 4, 5]
              .map(
                (n) => `
              <button type="button" class="star-btn ${n === STORE.selectedStars ? "active" : ""}" onclick="selectWarrantyStar(${n})">★ ${n}</button>
            `,
              )
              .join("")}
          </div>
        </div>
        <div class="field">
          <label>Ulasan Singkat (Opsional)</label>
          <input type="text" id="warrantyReviewInput" placeholder="Pengiriman cepat, akun langsung aktif..." />
        </div>
        <button class="btn" onclick="submitWarrantyRating('${esc(inv.trx_id)}')">Aktifkan Garansi Sekarang</button>
      </div>
    `
        : `
      <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--green);">Garansi Produk Aktif</div>
          <div style="font-size:12px;color:var(--muted);">Ulasan: "${esc(inv.review || "Tanpa ulasan tertulis")}"</div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="submitWarrantyComplaint('${esc(inv.trx_id)}')">Ajukan Klaim / Lapor Kendala</button>
      </div>
    `
    }
  `;
}

function selectWarrantyStar(n) {
  STORE.selectedStars = n;
  document.querySelectorAll("#starPicker .star-btn").forEach((btn, idx) => {
    btn.classList.toggle("active", idx + 1 === n);
  });
}

async function submitWarrantyRating(trxId) {
  const review = (
    document.getElementById("warrantyReviewInput")?.value || ""
  ).trim();
  const stars = STORE.selectedStars || 5;

  if (STORE.isLiveBackend) {
    try {
      const res = await fetch(
        `${FAEZ_CONFIG.apiBase}/api/store/invoice/${encodeURIComponent(trxId)}/rate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: stars, review }),
        },
      );
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Gagal menyimpan rating");
      toast("Garansi resmi berhasil diaktifkan!");
      await loadStoreData();
      lookupInvoiceById(trxId);
      return;
    } catch (err) {
      return toast(err.message);
    }
  }

  // Local mode update
  const local = getLocalStoreData();
  const idx = local.transactions.findIndex((t) => t.trx_id === trxId);
  if (idx !== -1) {
    local.transactions[idx].rating = stars;
    local.transactions[idx].review =
      review || "Transaksi cepat & sesuai deskripsi.";
    local.transactions[idx].warranty_active = 1;
    saveLocalStoreData(local);
    toast("Garansi resmi berhasil diaktifkan!");
    loadStoreData();
    lookupInvoiceById(trxId);
  }
}

async function submitWarrantyComplaint(trxId) {
  const kendala = prompt(
    `Masukkan detail kendala untuk invoice ${trxId} (akan diteruskan ke Admin):`,
  );
  if (!kendala) return;

  if (STORE.isLiveBackend) {
    try {
      const res = await fetch(
        `${FAEZ_CONFIG.apiBase}/api/store/invoice/${encodeURIComponent(trxId)}/complain`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: kendala }),
        },
      );
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Gagal mengirim laporan");
      toast("Laporan klaim garansi telah diteruskan ke Telegram Admin.");
      return;
    } catch (e) {
      return toast(e.message);
    }
  }
  toast("Laporan klaim garansi tercatat dan diteruskan ke Admin.");
}

// ==========================================================================
// VOUCHERS & VERIFIED REVIEWS SECTIONS
// ==========================================================================

function renderVouchersSection() {
  const grid = document.getElementById("voucherGrid");
  if (!grid) return;

  if (STORE.vouchers.length === 0) {
    grid.innerHTML = `<div class="panel" style="grid-column:1/-1;text-align:center;color:var(--dim);">Belum ada voucher promo yang aktif saat ini.</div>`;
    return;
  }

  grid.innerHTML = STORE.vouchers
    .map((v) => {
      const sisa = Math.max(0, v.kuota - v.terpakai);
      const pct = Math.min(
        100,
        Math.round((v.terpakai / Math.max(1, v.kuota)) * 100),
      );
      const labelPot =
        v.tipe === "PERSEN" ? `Diskon ${v.nilai}%` : `Potongan ${rp(v.nilai)}`;

      return `
        <div class="panel" style="display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <code class="mono" style="font-size:14px;font-weight:700;color:var(--accent);background:var(--accent-soft);padding:3px 9px;border-radius:6px;">${esc(v.kode)}</code>
              <span class="pill ${sisa > 0 ? "pill-green" : "pill-red"}">${sisa > 0 ? `Sisa ${sisa} kuota` : "Habis"}</span>
            </div>
            <div style="font-size:16px;font-weight:700;margin-bottom:4px;">${labelPot}</div>
            <div style="font-size:12px;color:var(--muted);">Minimal pembelian <span class="mono">${rp(v.min_belanja)}</span></div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${pct}%;"></div>
            </div>
            <div style="font-size:11px;color:var(--dim);">Terpakai ${v.terpakai} dari ${v.kuota} kuota</div>
          </div>
          <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border-subtle);display:flex;justify-content:flex-end;">
            <button class="btn btn-outline btn-sm" onclick="copyVoucherCode('${esc(v.kode)}')">Salin Kode</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function copyVoucherCode(kode) {
  navigator.clipboard.writeText(kode);
  toast(`Kode voucher ${kode} disalin`);
}

function renderReviewsSection() {
  const grid = document.getElementById("reviewGrid");
  if (!grid) return;

  if (!STORE.reviews || STORE.reviews.length === 0) {
    grid.innerHTML = `<div class="panel" style="grid-column:1/-1;text-align:center;color:var(--dim);">Belum ada ulasan pelanggan.</div>`;
    return;
  }

  grid.innerHTML = STORE.reviews
    .slice(0, 12)
    .map((r) => {
      const stars = "★".repeat(Number(r.rating || 5));
      const maskedUser = r.username
        ? r.username.slice(0, 3) + "***"
        : String(r.telegram_id || "User").slice(0, 4) + "***";

      return `
        <div class="panel" style="display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <span style="color:var(--amber);font-weight:700;font-size:13px;letter-spacing:1px;">${stars}</span>
              <span class="pill pill-green">Garansi Aktif</span>
            </div>
            <p style="font-size:13px;color:var(--text);margin-bottom:12px;line-height:1.5;">"${esc(r.review || "Pengiriman otomatis sangat cepat dan akun sesuai deskripsi.")}"</p>
          </div>
          <div style="border-top:1px solid var(--border-subtle);padding-top:10px;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--dim);">
            <span>Oleh <strong style="color:var(--muted);">${esc(maskedUser)}</strong> · ${esc(r.nama_produk || r.kode_produk)}</span>
            <span class="mono">${esc(r.trx_id.slice(-7))}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

// Keyboard shortcut '/' or Ctrl+K to focus search
document.addEventListener("keydown", (e) => {
  if (
    (e.key === "/" || (e.ctrlKey && e.key.toLowerCase() === "k")) &&
    !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)
  ) {
    e.preventDefault();
    const s = document.getElementById("searchCatalog");
    if (s) s.focus();
  }
  if (e.key === "Escape") {
    closeCheckoutModal();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadStoreData();
});
