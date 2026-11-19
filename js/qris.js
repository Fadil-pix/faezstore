/* ==========================================================================
   FAEZ STORE — Dynamic QRIS Engine (EMVCo CRC16-CCITT) & Store Config
   ========================================================================== */

const IS_LOCAL_HOST =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "api.zientax.my.id";

const FAEZ_CONFIG = {
  storeName: "FaezStore",
  botUsername: "faezstoresbot",
  expireMinutes: 15,
  apiBase: IS_LOCAL_HOST ? "" : "https://api.zientax.my.id",
  qrisStatic:
    "00020101021126610014COM.GO-JEK.WWW01189360091436122211990210G6122211990303UMI51440014ID.CO.QRIS.WWW0215ID10253671311960303UMI5204899953033605802ID5915Faezig, Digital6006KLATEN61055746662070703A0163041830",
};

function hitungCRC16(str) {
  let crc = 0xffff;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc = crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function buatQrisDinamis(qrisStatis, nominal) {
  const clean = (qrisStatis || FAEZ_CONFIG.qrisStatic).trim();
  const qrisTanpaCRC = clean.slice(0, -4);
  const step1 = qrisTanpaCRC.replace("010211", "010212");
  const bagian = step1.split("5802ID");
  const nominalStr = Math.floor(Number(nominal)).toString();
  const tagNominal = "54" + nominalStr.length.toString().padStart(2, "0") + nominalStr;
  const payloadBaru = bagian[0] + tagNominal + "5802ID" + bagian[1];
  return payloadBaru + hitungCRC16(payloadBaru);
}

function getQrImageUrl(qrisString, size = 360) {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrisString)}&size=${size}x${size}&margin=8`;
}

const DEFAULT_SEED_DATA = {
  storeName: "FaezStore",
  products: [
    {
      kode: "NFX-1BLN", nama: "Netflix Premium 1 Bulan", harga: 45000, effective_price: 45000, strike_price: 55000,
      kategori: "Streaming", deskripsi: "Akun Private, garansi 30 hari, kirim otomatis 24/7",
      stok: 3, sold_count: 42, avg_rating: "5.0", review_count: 18,
      tiers: [{ min_qty: 3, harga_satuan: 40000 }, { min_qty: 5, harga_satuan: 37000 }],
    },
    {
      kode: "SPT-1BLN", nama: "Spotify Premium 1 Bulan", harga: 20000, effective_price: 20000, strike_price: 25000,
      kategori: "Streaming", deskripsi: "Tanpa iklan, download lagu offline",
      stok: 4, sold_count: 65, avg_rating: "4.9", review_count: 24,
      tiers: [{ min_qty: 5, harga_satuan: 17000 }],
    },
    {
      kode: "YTB-1BLN", nama: "YouTube Premium 1 Bulan", harga: 25000, effective_price: 25000, strike_price: null,
      kategori: "Streaming", deskripsi: "Tanpa iklan + YouTube Music",
      stok: 2, sold_count: 31, avg_rating: "5.0", review_count: 11, tiers: [],
    },
    {
      kode: "CNV-PRO", nama: "Canva Pro 1 Bulan", harga: 40000, effective_price: 40000, strike_price: 50000,
      kategori: "Produktivitas", deskripsi: "Semua template & aset premium terbuka",
      stok: 3, sold_count: 54, avg_rating: "5.0", review_count: 19,
      tiers: [{ min_qty: 3, harga_satuan: 35000 }],
    },
    {
      kode: "GPT-PLUS", nama: "ChatGPT Plus 1 Bulan", harga: 85000, effective_price: 85000, strike_price: 99000,
      kategori: "Produktivitas", deskripsi: "Akses prioritas GPT terbaru, pengiriman instan",
      stok: 2, sold_count: 28, avg_rating: "4.9", review_count: 12, tiers: [],
    },
    {
      kode: "ML-DM100", nama: "Mobile Legends 100 Diamond", harga: 15000, effective_price: 15000, strike_price: null,
      kategori: "Game", deskripsi: "Top up instan ke akun ML kamu",
      stok: 5, sold_count: 89, avg_rating: "5.0", review_count: 30, tiers: [],
    },
  ],
  vouchers: [],
  reviews: [
    { trx_masked: "TRX-••••2841", buyer_masked: "P***i", kode_produk: "NFX-1BLN", nama_produk: "Netflix Premium 1 Bulan", rating: 5, review: "Pengiriman akun instan begitu QRIS lunas, langsung bisa login.", warranty_active: 1 },
    { trx_masked: "TRX-••••1120", buyer_masked: "R***y", kode_produk: "GPT-PLUS", nama_produk: "ChatGPT Plus 1 Bulan", rating: 5, review: "Akses lancar, pengiriman otomatis sangat cepat.", warranty_active: 1 },
  ],
};

function getLocalStoreData() { return JSON.parse(JSON.stringify(DEFAULT_SEED_DATA)); }
