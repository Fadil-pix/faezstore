/* ==========================================================================
   FaezStore — Kelola Foto (upload / ganti / hapus foto produk & banner)

   Cara kerja:
   - Pemilik masuk lewat footer "Kelola Foto" + PIN (FAEZ_CONFIG.adminPin).
   - Foto disimpan di browser pemilik (localStorage) dan langsung terlihat.
   - Agar terlihat oleh SEMUA pengunjung: "Simpan & Publikasi" → unduh
     product-images.json → taruh di data/product-images.json → commit & push.
   ========================================================================== */

const IMG_KEY = "faez_img_overrides_v1";
const ADMIN_KEY = "faez_admin_v1";
const NO_IMG = "__none__"; // penanda: sengaja tanpa foto
const BANNER_KEY = "__banner__";

const IMG = { published: {}, local: {}, loaded: false };
const EDIT = { kode: null, mode: "keep", value: "" };

/* ---------- State & penyimpanan ---------- */
function isAdmin() {
  try {
    return localStorage.getItem(ADMIN_KEY) === "1";
  } catch (_) {
    return false;
  }
}
function hasOwn(o, k) {
  return Object.prototype.hasOwnProperty.call(o, k);
}

async function loadImageOverrides() {
  if (IMG.loaded) return;
  IMG.loaded = true;
  try {
    const res = await fetch(FAEZ_CONFIG.imagesFile, { cache: "no-cache" });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object") IMG.published = data;
    }
  } catch (_) {
    /* file belum ada: tidak masalah */
  }
  try {
    const raw = JSON.parse(localStorage.getItem(IMG_KEY) || "{}");
    if (raw && typeof raw === "object") IMG.local = raw;
  } catch (_) {
    IMG.local = {};
  }
}

function saveLocalImages() {
  try {
    localStorage.setItem(IMG_KEY, JSON.stringify(IMG.local));
    return true;
  } catch (_) {
    toast(
      "Penyimpanan browser penuh. Hapus beberapa foto lama atau kecilkan ukuran.",
    );
    return false;
  }
}

function getImgOverride(kode) {
  if (hasOwn(IMG.local, kode)) return IMG.local[kode];
  return IMG.published[kode];
}
function getProductImage(p) {
  const o = getImgOverride(p.kode);
  if (o === NO_IMG) return "";
  return o || p.image_url || "";
}
function getBannerImage() {
  const o = getImgOverride(BANNER_KEY);
  return o && o !== NO_IMG ? o : "";
}

function applyBanner() {
  const hero = document.getElementById("heroBanner");
  if (!hero) return;
  const url = getBannerImage();
  if (url) {
    hero.style.backgroundImage = `url("${url.replace(/"/g, "%22")}")`;
    hero.classList.add("has-img");
  } else {
    hero.style.backgroundImage = "";
    hero.classList.remove("has-img");
  }
}

/* ---------- Masuk / keluar mode kelola ---------- */
function applyAdminUI() {
  const on = isAdmin();
  document.body.classList.toggle("is-admin", on);
  const bar = document.getElementById("adminBar");
  if (bar) bar.hidden = !on;
}

function openAdminLogin() {
  if (isAdmin()) {
    toast("Mode Kelola Foto sudah aktif. Ketuk ikon kamera pada produk.");
    return;
  }
  document.getElementById("pinInput").value = "";
  document.getElementById("pinStatus").textContent = "";
  openModal("pinModal");
  setTimeout(() => document.getElementById("pinInput")?.focus(), 80);
}

function submitAdminPin() {
  const val = document.getElementById("pinInput").value.trim();
  const status = document.getElementById("pinStatus");
  if (val && val === String(FAEZ_CONFIG.adminPin)) {
    try {
      localStorage.setItem(ADMIN_KEY, "1");
    } catch (_) {}
    closeModal("pinModal");
    applyAdminUI();
    renderGrid();
    toast("Mode Kelola Foto aktif. Ketuk ikon kamera untuk ganti foto.");
  } else {
    status.style.color = "var(--danger)";
    status.textContent = "PIN salah. Coba lagi.";
  }
}

function exitAdminMode() {
  try {
    localStorage.removeItem(ADMIN_KEY);
  } catch (_) {}
  applyAdminUI();
  renderGrid();
  toast("Keluar dari Mode Kelola Foto");
}

/* ---------- Editor foto ---------- */
function currentEditImage() {
  if (EDIT.mode === "set") return EDIT.value;
  if (EDIT.mode === "none") return "";
  const p = STORE.products.find((x) => x.kode === EDIT.kode);
  if (EDIT.mode === "reset") {
    const pub = IMG.published[EDIT.kode];
    if (pub && pub !== NO_IMG) return pub;
    return EDIT.kode === BANNER_KEY ? "" : p?.image_url || "";
  }
  // keep
  if (EDIT.kode === BANNER_KEY) return getBannerImage();
  return p ? getProductImage(p) : "";
}

function renderEditPreview() {
  const box = document.getElementById("imgPreview");
  const url = currentEditImage();
  box.classList.toggle("wide-prev", EDIT.kode === BANNER_KEY);
  if (url) {
    box.innerHTML = `<img src="${esc(url)}" alt="Pratinjau foto" />`;
    box.querySelector("img").addEventListener("error", () => {
      box.innerHTML = `<div class="ph">${ic("image", 28)}<span>Gambar tidak bisa dimuat</span></div>`;
    });
  } else {
    box.innerHTML = `<div class="ph">${ic("image", 28)}<span>Belum ada foto</span></div>`;
  }
}

function openImageEditor(kode) {
  if (!isAdmin()) return;
  const isBanner = kode === BANNER_KEY;
  const p = STORE.products.find((x) => x.kode === kode);
  if (!isBanner && !p) return;
  EDIT.kode = kode;
  EDIT.mode = "keep";
  EDIT.value = "";
  document.getElementById("imgModalTitle").textContent = isBanner
    ? "Ganti Banner Toko"
    : `Foto: ${p.nama}`;
  document.getElementById("imgUrlInput").value = "";
  document.getElementById("imgFileInput").value = "";
  renderEditPreview();
  openModal("imgModal");
}

/* Potong persegi (atau 16:9 untuk banner), kecilkan, kompres → data URL */
function fileToDataUrl(
  file,
  { square = true, maxSide = 800, quality = 0.82 } = {},
) {
  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const ratio = square ? 1 : 16 / 9;
        let sw = img.naturalWidth,
          sh = img.naturalHeight;
        // area potong di tengah dengan rasio target
        let cw = sw,
          ch = sw / ratio;
        if (ch > sh) {
          ch = sh;
          cw = sh * ratio;
        }
        const sx = (sw - cw) / 2,
          sy = (sh - ch) / 2;
        const scale = Math.min(1, maxSide / Math.max(cw, ch));
        const tw = Math.max(1, Math.round(cw * scale));
        const th = Math.max(1, Math.round(ch * scale));
        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, tw, th);
        ctx.drawImage(img, sx, sy, cw, ch, 0, 0, tw, th);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error("Format gambar tidak didukung"));
    };
    img.src = blobUrl;
  });
}

async function handleImageFile(file) {
  if (!file) return;
  if (!/^image\//.test(file.type))
    return toast("Pilih file gambar (JPG, PNG, atau WEBP)");
  if (file.size > 25 * 1024 * 1024)
    return toast("File terlalu besar (maks. 25 MB)");
  const saveBtn = document.getElementById("imgSaveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Memproses foto...";
  try {
    const isBanner = EDIT.kode === BANNER_KEY;
    EDIT.value = await fileToDataUrl(file, {
      square: !isBanner,
      maxSide: isBanner ? 1280 : 800,
    });
    EDIT.mode = "set";
    renderEditPreview();
  } catch (e) {
    toast(e.message || "Gagal memproses gambar");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Simpan";
  }
}

function useImageUrl() {
  const raw = document.getElementById("imgUrlInput").value.trim();
  if (!/^https?:\/\//i.test(raw))
    return toast("Link harus diawali http:// atau https://");
  EDIT.mode = "set";
  EDIT.value = raw;
  renderEditPreview();
}
function pendingRemoveImage() {
  EDIT.mode = "none";
  EDIT.value = "";
  renderEditPreview();
}
function pendingResetImage() {
  EDIT.mode = "reset";
  EDIT.value = "";
  renderEditPreview();
}

function saveImageEdit() {
  const kode = EDIT.kode;
  if (!kode) return;
  const backup = { ...IMG.local };
  if (EDIT.mode === "set") IMG.local[kode] = EDIT.value;
  else if (EDIT.mode === "none") IMG.local[kode] = NO_IMG;
  else if (EDIT.mode === "reset") delete IMG.local[kode];
  else {
    closeModal("imgModal");
    return;
  }

  if (!saveLocalImages()) {
    IMG.local = backup;
    return;
  }
  closeModal("imgModal");
  applyBanner();
  renderGrid();
  toast(
    "Foto tersimpan. Ketuk “Simpan & Publikasi” agar tampil untuk semua pengunjung.",
  );
}

/* ---------- Simpan & publikasi ---------- */
function mergedImages() {
  const out = { ...IMG.published };
  Object.keys(IMG.local).forEach((k) => {
    out[k] = IMG.local[k];
  });
  return out;
}

function openExportModal() {
  const n = Object.keys(IMG.local).length;
  const kb = Math.round(new Blob([JSON.stringify(IMG.local)]).size / 1024);
  document.getElementById("exportInfo").textContent = n
    ? `${n} perubahan foto di browser ini (±${kb} KB).`
    : "Belum ada perubahan foto di browser ini.";
  openModal("exportModal");
}

function exportImages() {
  const data = mergedImages();
  if (!Object.keys(data).length) return toast("Belum ada foto untuk disimpan");
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "product-images.json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
  toast("File product-images.json diunduh. Taruh di folder data/ lalu push.");
}

async function importImagesFile(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error("bad");
    let count = 0;
    Object.entries(data).forEach(([k, v]) => {
      if (
        typeof v === "string" &&
        (v === NO_IMG || /^(data:image\/|https?:\/\/)/i.test(v))
      ) {
        IMG.local[k] = v;
        count++;
      }
    });
    if (!saveLocalImages()) return;
    applyBanner();
    renderGrid();
    openExportModal();
    toast(`${count} foto berhasil diimpor`);
  } catch (_) {
    toast("File tidak valid. Gunakan file product-images.json");
  }
}

function clearLocalImages() {
  if (!Object.keys(IMG.local).length) return toast("Tidak ada perubahan lokal");
  if (
    !confirm(
      "Hapus semua perubahan foto di browser ini? Foto yang sudah dipublikasikan tidak terhapus.",
    )
  )
    return;
  IMG.local = {};
  try {
    localStorage.removeItem(IMG_KEY);
  } catch (_) {}
  applyBanner();
  renderGrid();
  openExportModal();
  toast("Perubahan lokal dihapus");
}

/* ---------- Pasang event ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("imgFileInput")
    ?.addEventListener("change", (e) => handleImageFile(e.target.files[0]));
  document
    .getElementById("importFileInput")
    ?.addEventListener("change", (e) => {
      importImagesFile(e.target.files[0]);
      e.target.value = "";
    });

  const prev = document.getElementById("imgPreview");
  if (prev) {
    ["dragenter", "dragover"].forEach((ev) =>
      prev.addEventListener(ev, (e) => {
        e.preventDefault();
        prev.classList.add("drag");
      }),
    );
    ["dragleave", "drop"].forEach((ev) =>
      prev.addEventListener(ev, (e) => {
        e.preventDefault();
        prev.classList.remove("drag");
      }),
    );
    prev.addEventListener("drop", (e) =>
      handleImageFile(e.dataTransfer?.files?.[0]),
    );
  }
  applyAdminUI();
});
