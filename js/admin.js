/* ==========================================================================
   FAEZ STORE — Admin Dashboard Logic (API + Local Fallback)
   ========================================================================== */

let STATE = {
  isLiveBackend: false,
  products: [],
  vouchers: [],
  transactions: [],
  users: [],
  currentStocks: []
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
  clearTimeout(window.__admToast);
  window.__admToast = setTimeout(() => el.classList.remove("show"), 2800);
}

function getToken() {
  return localStorage.getItem("faez_admin_token") || "";
}

function doLogin() {
  const val = document.getElementById("loginTokenInput").value.trim();
  if (!val) return toast("Masukkan password terlebih dahulu");
  localStorage.setItem("faez_admin_token", val);
  loadAll();
}

function enterDemoAdmin() {
  localStorage.setItem("faez_admin_token", "f@dil123");
  loadAll(true);
}

function logout() {
  localStorage.removeItem("faez_admin_token");
  document.getElementById("authModal").style.display = "flex";
}

async function api(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": getToken(),
      ...(opts.headers || {})
    }
  });
  if (res.status === 401) {
    document.getElementById("authModal").style.display = "flex";
    throw new Error("Password admin salah.");
  }
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Terjadi kesalahan");
  return data;
}

function switchTab(id, btn) {
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  btn.classList.add("active");
}

async function loadAll(forceLocal = false) {
  if (!getToken()) return;
  if (!forceLocal) {
    try {
      const data = await api("/api/admin/overview");
      STATE.isLiveBackend = true;
      document.getElementById("authModal").style.display = "none";
      document.getElementById("demoBanner")?.classList.remove("show");
      STATE = { ...STATE, ...data, isLiveBackend: true };
      renderOverviewMetrics(data.storeName, data.stats);
      finalizeRender();
      return;
    } catch (e) {
      if (e.message === "Password admin salah.") {
        return toast(e.message);
      }
    }
  }

  // Fallback to Local Storage DB when opened standalone without Node server
  const token = getToken();
  if (token !== "f@dil123" && token !== "admin123" && !forceLocal) {
    document.getElementById("authModal").style.display = "flex";
    return toast("Mode Lokal: Gunakan password .env (f@dil123) atau klik Mode Demo.");
  }

  STATE.isLiveBackend = false;
  document.getElementById("authModal").style.display = "none";
  document.getElementById("demoBanner")?.classList.add("show");

  const local = getLocalStoreData();
  const products = local.products.map((p) => {
    const ready = local.stocks.filter((s) => s.kode_produk === p.kode && !s.is_sold).length;
    return { ...p, stok: ready };
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const trxTodayList = local.transactions.filter((t) => (t.created_at || "").slice(0, 10) === todayStr);
  const ratedList = local.transactions.filter((t) => t.rating);
  const avgRating = ratedList.length
    ? (ratedList.reduce((a, b) => a + Number(b.rating), 0) / ratedList.length).toFixed(1)
    : "5.0";

  const stats = {
    omzetToday: trxTodayList.reduce((a, b) => a + Number(b.harga || 0), 0),
    trxToday: trxTodayList.length,
    omzetAll: local.transactions.reduce((a, b) => a + Number(b.harga || 0), 0),
    trxAll: local.transactions.length,
    stokReady: products.reduce((a, b) => a + b.stok, 0),
    totalProduk: products.length,
    avgRating,
    totalRatings: ratedList.length,
    totalUsers: local.users.length,
    totalSaldoUser: local.users.reduce((a, b) => a + Number(b.balance || 0), 0)
  };

  STATE.products = products;
  STATE.vouchers = local.vouchers;
  STATE.transactions = local.transactions;
  STATE.users = local.users;

  renderOverviewMetrics(local.storeName || "FAEZ STORE", stats);
  finalizeRender();
}

function renderOverviewMetrics(storeName, stats) {
  document.getElementById("storeTitle").textContent = storeName;
  document.getElementById("statOmzetToday").textContent = rp(stats.omzetToday);
  document.getElementById("statTrxToday").textContent = `${stats.trxToday} transaksi`;
  document.getElementById("statOmzetAll").textContent = rp(stats.omzetAll);
  document.getElementById("statTrxAll").textContent = `${stats.trxAll} total order`;
  document.getElementById("statStok").textContent = stats.stokReady;
  document.getElementById("statProduk").textContent = `${stats.totalProduk} sub-produk`;
  document.getElementById("statRating").textContent = `${stats.avgRating} / 5 (${stats.totalRatings})`;
  document.getElementById("statUsers").textContent = `${stats.totalUsers} user · ${rp(stats.totalSaldoUser)}`;
}

function finalizeRender() {
  const kats = [...new Set(STATE.products.map((p) => p.kategori || "Lainnya"))];
  document.getElementById("kategoriList").innerHTML = kats.map((k) => `<option value="${esc(k)}">`).join("");
  renderProducts();
  populateStockDropdown();
  renderVouchers();
  renderTransactions();
  renderUsers();
  if (window.lucide) lucide.createIcons();
}

function renderProducts() {
  const q = document.getElementById("searchProduk").value.toLowerCase();
  const filtered = STATE.products.filter(
    (p) =>
      p.kode.toLowerCase().includes(q) ||
      p.nama.toLowerCase().includes(q) ||
      (p.kategori || "").toLowerCase().includes(q)
  );
  document.getElementById("tblProduk").innerHTML =
    filtered
      .map(
        (p) => `
      <tr>
        <td><span class="pill pill-neutral">${esc(p.kategori)}</span></td>
        <td>
          <div style="font-weight:600;">${esc(p.nama)} <code style="color:var(--accent);font-size:11px;">${esc(p.kode)}</code></div>
          <div style="font-size:12px;color:var(--dim);">${esc(p.deskripsi || "-")}</div>
        </td>
        <td class="mono">${rp(p.harga)}</td>
        <td><span class="pill ${p.stok > 0 ? "pill-green" : "pill-red"}">${p.stok}</span></td>
        <td style="text-align:right;">
          <div style="display:inline-flex;gap:6px;">
            <button class="btn btn-outline btn-sm" onclick='openEditModal(${JSON.stringify(p)})'>Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct('${esc(p.kode)}')">Hapus</button>
          </div>
        </td>
      </tr>
    `
      )
      .join("") || `<tr><td colspan="5" style="text-align:center;color:var(--dim);">Tidak ada produk</td></tr>`;
}

async function addProduct() {
  const payload = {
    kategori: document.getElementById("pKategori").value.trim() || "Lainnya",
    kode: document.getElementById("pKode").value.trim().toUpperCase().replace(/\s+/g, ""),
    nama: document.getElementById("pNama").value.trim(),
    harga: Number(document.getElementById("pHarga").value || 0),
    deskripsi: document.getElementById("pDesk").value.trim()
  };
  if (!payload.kode || !payload.nama || !payload.harga) {
    return toast("Kode, nama, dan harga wajib diisi.");
  }

  try {
    if (STATE.isLiveBackend) {
      await api("/api/admin/products", { method: "POST", body: JSON.stringify(payload) });
    } else {
      const local = getLocalStoreData();
      if (local.products.some((p) => p.kode === payload.kode)) {
        return toast(`Kode ${payload.kode} sudah digunakan.`);
      }
      local.products.push({ ...payload, stok: 0, total: 0 });
      saveLocalStoreData(local);
    }
    ["pKode", "pNama", "pHarga", "pDesk"].forEach((id) => (document.getElementById(id).value = ""));
    toast("Sub-produk ditambahkan");
    loadAll(!STATE.isLiveBackend);
  } catch (e) {
    toast(e.message);
  }
}

function openEditModal(p) {
  document.getElementById("editKode").value = p.kode;
  document.getElementById("editKategori").value = p.kategori;
  document.getElementById("editNama").value = p.nama;
  document.getElementById("editHarga").value = p.harga;
  document.getElementById("editDesk").value = p.deskripsi || "";
  document.getElementById("editModal").classList.add("open");
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("open");
}

async function saveEditProduct() {
  const kode = document.getElementById("editKode").value;
  const payload = {
    kategori: document.getElementById("editKategori").value.trim() || "Lainnya",
    nama: document.getElementById("editNama").value.trim(),
    harga: Number(document.getElementById("editHarga").value || 0),
    deskripsi: document.getElementById("editDesk").value.trim()
  };

  try {
    if (STATE.isLiveBackend) {
      await api(`/api/admin/products/${kode}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      const local = getLocalStoreData();
      const idx = local.products.findIndex((p) => p.kode === kode);
      if (idx !== -1) local.products[idx] = { ...local.products[idx], ...payload };
      saveLocalStoreData(local);
    }
    closeEditModal();
    toast("Perubahan disimpan");
    loadAll(!STATE.isLiveBackend);
  } catch (e) {
    toast(e.message);
  }
}

async function deleteProduct(kode) {
  if (!confirm(`Hapus produk ${kode} beserta stok ready-nya?`)) return;
  try {
    if (STATE.isLiveBackend) {
      await api(`/api/admin/products/${kode}`, { method: "DELETE" });
    } else {
      const local = getLocalStoreData();
      local.products = local.products.filter((p) => p.kode !== kode);
      local.stocks = local.stocks.filter((s) => !(s.kode_produk === kode && !s.is_sold));
      saveLocalStoreData(local);
    }
    toast("Produk dihapus");
    loadAll(!STATE.isLiveBackend);
  } catch (e) {
    toast(e.message);
  }
}

function populateStockDropdown() {
  const sel = document.getElementById("stokSelectProduk");
  const prev = sel.value;
  sel.innerHTML = STATE.products
    .map((p) => `<option value="${esc(p.kode)}">[${esc(p.kategori)}] ${esc(p.nama)} (${p.stok} ready)</option>`)
    .join("");
  if (prev && STATE.products.some((p) => p.kode === prev)) sel.value = prev;
  loadStockDetail();
}

async function loadStockDetail() {
  const kode = document.getElementById("stokSelectProduk").value;
  if (!kode) return;
  document.getElementById("stokDetailTitle").textContent = `Stok Ready · ${kode}`;
  try {
    if (STATE.isLiveBackend) {
      const data = await api(`/api/admin/stocks/${kode}`);
      STATE.currentStocks = data.stocks;
    } else {
      const local = getLocalStoreData();
      STATE.currentStocks = local.stocks.filter((s) => s.kode_produk === kode && !s.is_sold);
    }
    renderStockDetail();
  } catch (e) {
    toast(e.message);
  }
}

function renderStockDetail() {
  const q = document.getElementById("searchStok").value.toLowerCase();
  const filtered = STATE.currentStocks.filter((s) => s.data_akun.toLowerCase().includes(q));
  document.getElementById("tblStokDetail").innerHTML =
    filtered
      .map(
        (s) => `
      <tr>
        <td class="mono" style="color:var(--dim);">${s.id}</td>
        <td class="mono" style="font-size:12px;">${esc(s.data_akun)}</td>
        <td style="text-align:right;"><button class="btn btn-danger btn-sm" onclick="deleteStockItem(${s.id})">Hapus</button></td>
      </tr>
    `
      )
      .join("") || `<tr><td colspan="3" style="text-align:center;color:var(--dim);">Stok kosong</td></tr>`;
}

async function addBulkStock() {
  const kode = document.getElementById("stokSelectProduk").value;
  const accounts = document.getElementById("stokAccounts").value;
  const lines = accounts.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (!kode || lines.length === 0) return toast("Isi daftar akun terlebih dahulu.");

  try {
    if (STATE.isLiveBackend) {
      const res = await api("/api/admin/stocks", { method: "POST", body: JSON.stringify({ kode, accounts }) });
      toast(`${res.added} stok ditambahkan`);
    } else {
      const local = getLocalStoreData();
      let maxId = local.stocks.reduce((m, s) => Math.max(m, Number(s.id || 0)), 0);
      lines.forEach((acc) => {
        maxId += 1;
        local.stocks.push({ id: maxId, kode_produk: kode, data_akun: acc, is_sold: false });
      });
      saveLocalStoreData(local);
      toast(`${lines.length} stok ditambahkan`);
    }
    document.getElementById("stokAccounts").value = "";
    loadAll(!STATE.isLiveBackend);
  } catch (e) {
    toast(e.message);
  }
}

async function deleteStockItem(id) {
  try {
    if (STATE.isLiveBackend) {
      await api(`/api/admin/stocks/item/${id}`, { method: "DELETE" });
    } else {
      const local = getLocalStoreData();
      local.stocks = local.stocks.filter((s) => s.id !== Number(id));
      saveLocalStoreData(local);
    }
    toast("Stok dihapus");
    loadAll(!STATE.isLiveBackend);
  } catch (e) {
    toast(e.message);
  }
}

async function clearSelectedStock() {
  const kode = document.getElementById("stokSelectProduk").value;
  if (!kode || !confirm(`Kosongkan semua stok ready untuk ${kode}?`)) return;
  try {
    if (STATE.isLiveBackend) {
      await api(`/api/admin/stocks/clear/${kode}`, { method: "DELETE" });
    } else {
      const local = getLocalStoreData();
      local.stocks = local.stocks.filter((s) => !(s.kode_produk === kode && !s.is_sold));
      saveLocalStoreData(local);
    }
    toast("Stok dikosongkan");
    loadAll(!STATE.isLiveBackend);
  } catch (e) {
    toast(e.message);
  }
}

function renderVouchers() {
  const q = document.getElementById("searchVoucher").value.toLowerCase();
  const filtered = STATE.vouchers.filter((v) => v.kode.toLowerCase().includes(q));
  document.getElementById("tblVoucher").innerHTML =
    filtered
      .map(
        (v) => `
      <tr>
        <td><code>${esc(v.kode)}</code></td>
        <td><b>${v.tipe === "PERSEN" ? v.nilai + "%" : rp(v.nilai)}</b></td>
        <td>${v.terpakai} / ${v.kuota}</td>
        <td class="mono">${rp(v.min_belanja)}</td>
        <td style="text-align:right;"><button class="btn btn-danger btn-sm" onclick="deleteVoucher('${esc(v.kode)}')">Hapus</button></td>
      </tr>
    `
      )
      .join("") || `<tr><td colspan="5" style="text-align:center;color:var(--dim);">Belum ada voucher</td></tr>`;
}

async function addVoucher() {
  const payload = {
    kode: document.getElementById("vKode").value.trim().toUpperCase().replace(/\s+/g, ""),
    tipe: document.getElementById("vTipe").value,
    nilai: Number(document.getElementById("vNilai").value || 0),
    kuota: Number(document.getElementById("vKuota").value || 0),
    min_belanja: Number(document.getElementById("vMin").value || 0)
  };
  if (!payload.kode || !payload.nilai || !payload.kuota) return toast("Data voucher belum lengkap");

  try {
    if (STATE.isLiveBackend) {
      await api("/api/admin/vouchers", { method: "POST", body: JSON.stringify(payload) });
    } else {
      const local = getLocalStoreData();
      local.vouchers = local.vouchers.filter((v) => v.kode !== payload.kode);
      local.vouchers.unshift({ ...payload, terpakai: 0 });
      saveLocalStoreData(local);
    }
    ["vKode", "vNilai", "vKuota"].forEach((id) => (document.getElementById(id).value = ""));
    toast("Voucher disimpan");
    loadAll(!STATE.isLiveBackend);
  } catch (e) {
    toast(e.message);
  }
}

async function deleteVoucher(kode) {
  if (!confirm(`Hapus voucher ${kode}?`)) return;
  try {
    if (STATE.isLiveBackend) {
      await api(`/api/admin/vouchers/${kode}`, { method: "DELETE" });
    } else {
      const local = getLocalStoreData();
      local.vouchers = local.vouchers.filter((v) => v.kode !== kode);
      saveLocalStoreData(local);
    }
    toast("Voucher dihapus");
    loadAll(!STATE.isLiveBackend);
  } catch (e) {
    toast(e.message);
  }
}

function renderTransactions() {
  const q = document.getElementById("searchTrx").value.toLowerCase();
  const filtered = STATE.transactions.filter(
    (t) =>
      t.trx_id.toLowerCase().includes(q) ||
      String(t.telegram_id).includes(q) ||
      (t.username || "").toLowerCase().includes(q) ||
      (t.nama_produk || t.kode_produk).toLowerCase().includes(q)
  );
  document.getElementById("tblTrx").innerHTML =
    filtered
      .map(
        (t) => `
      <tr>
        <td class="mono" style="font-size:12px;">${esc(t.trx_id)}</td>
        <td>${esc(t.username || "-")} <div style="font-size:11px;color:var(--dim);">${esc(t.telegram_id)}</div></td>
        <td>${esc(t.nama_produk || t.kode_produk)} <span style="color:var(--dim);">×${t.qty || 1}</span></td>
        <td class="mono">${rp(t.harga)}</td>
        <td>
          ${t.rating ? `<span style="color:var(--amber);font-weight:600;">★ ${t.rating}/5</span>` : `<span style="color:var(--dim);">-</span>`}
          ${t.review ? `<div style="font-size:11px;color:var(--muted);max-width:200px;">"${esc(t.review)}"</div>` : ""}
        </td>
        <td>
          <span class="pill ${t.warranty_active ? "pill-green" : "pill-amber"}">
            ${t.warranty_active ? "Aktif" : "Belum Rating"}
          </span>
        </td>
        <td style="font-size:12px;color:var(--dim);">${new Date(t.created_at).toLocaleString("id-ID")}</td>
      </tr>
    `
      )
      .join("") || `<tr><td colspan="7" style="text-align:center;color:var(--dim);">Tidak ada transaksi</td></tr>`;
}

function exportCsv() {
  const headers = ["TRX_ID", "TELEGRAM_ID", "USERNAME", "KODE_PRODUK", "NAMA_PRODUK", "QTY", "VOUCHER", "TOTAL_BAYAR", "RATING", "GARANSI", "WAKTU"];
  const lines = STATE.transactions.map((t) =>
    [
      `"${t.trx_id}"`,
      `"${t.telegram_id}"`,
      `"${t.username || "-"}"`,
      `"${t.kode_produk}"`,
      `"${t.nama_produk || t.kode_produk}"`,
      t.qty || 1,
      `"${t.voucher_code || "-"}"`,
      t.harga,
      t.rating || 0,
      t.warranty_active ? "AKTIF" : "BELUM",
      `"${new Date(t.created_at).toISOString()}"`
    ].join(",")
  );
  const blob = new Blob(["\uFEFF" + [headers.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Laporan_FaezStore_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

function renderUsers() {
  const q = document.getElementById("searchUser").value.toLowerCase();
  const filtered = STATE.users.filter(
    (u) => String(u.telegram_id).includes(q) || (u.username || "").toLowerCase().includes(q)
  );
  document.getElementById("tblUsers").innerHTML =
    filtered
      .map(
        (u) => `
      <tr>
        <td class="mono">${u.telegram_id}</td>
        <td>${esc(u.username || "-")}</td>
        <td>${u.total_trx}x</td>
        <td class="mono" style="font-weight:600;">${rp(u.balance)}</td>
        <td style="text-align:right;">
          <div style="display:inline-flex;gap:4px;">
            <button class="btn btn-success btn-sm" onclick="adjustBalance(${u.telegram_id}, true)">+</button>
            <button class="btn btn-danger btn-sm" onclick="adjustBalance(${u.telegram_id}, false)">−</button>
          </div>
        </td>
      </tr>
    `
      )
      .join("") || `<tr><td colspan="5" style="text-align:center;color:var(--dim);">Tidak ada pelanggan</td></tr>`;
}

async function adjustBalance(tgId, isAdd) {
  const raw = prompt(isAdd ? `Tambah saldo untuk ${tgId}:` : `Kurangi saldo untuk ${tgId}:`);
  if (!raw) return;
  const val = Number(raw.replace(/[^\d]/g, ""));
  if (!val) return toast("Nominal tidak valid");
  try {
    if (STATE.isLiveBackend) {
      await api("/api/admin/users/balance", {
        method: "POST",
        body: JSON.stringify({ telegram_id: tgId, delta: isAdd ? val : -val })
      });
    } else {
      const local = getLocalStoreData();
      const idx = local.users.findIndex((u) => Number(u.telegram_id) === Number(tgId));
      if (idx !== -1) {
        local.users[idx].balance = Math.max(0, Number(local.users[idx].balance || 0) + (isAdd ? val : -val));
        saveLocalStoreData(local);
      }
    }
    toast("Saldo diperbarui");
    loadAll(!STATE.isLiveBackend);
  } catch (e) {
    toast(e.message);
  }
}

async function sendBroadcast() {
  const message = document.getElementById("bcMessage").value.trim();
  if (!message || !confirm("Kirim broadcast ke semua user?")) return;
  try {
    if (STATE.isLiveBackend) {
      await api("/api/admin/broadcast", { method: "POST", body: JSON.stringify({ message }) });
      toast("Broadcast dikirim di background");
    } else {
      toast("Simulasi Broadcast: Pesan siap dikirim ke seluruh user Telegram.");
    }
    document.getElementById("bcMessage").value = "";
  } catch (e) {
    toast(e.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();
  if (getToken()) loadAll();
});
