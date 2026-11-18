/* ==========================================================================
   FAEZ STORE — Dynamic QRIS Engine (EMVCo CRC16-CCITT) & Store Config
   ========================================================================== */

const FAEZ_CONFIG = {
  storeName: "FAEZ STORE",
  botUsername: "faezstore_bot",
  expireMinutes: 15,
  apiBase: window.location.hostname.includes("github.io")
    ? "https://zientax.my.id"
    : "",
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
  const tagNominal =
    "54" + nominalStr.length.toString().padStart(2, "0") + nominalStr;
  const payloadBaru = bagian[0] + tagNominal + "5802ID" + bagian[1];
  return payloadBaru + hitungCRC16(payloadBaru);
}

function getQrImageUrl(qrisString, size = 360) {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrisString)}&size=${size}x${size}&margin=8`;
}

// Initial seed data matching seed_demo.sql for standalone/offline mode
const DEFAULT_SEED_DATA = {
  storeName: "FAEZ STORE",
  products: [
    {
      kode: "NFX-1BLN",
      nama: "Netflix Premium 1 Bulan",
      harga: 45000,
      kategori: "Streaming",
      deskripsi: "Akun Private, garansi 30 hari",
      stok: 3,
      total: 8,
    },
    {
      kode: "NFX-3BLN",
      nama: "Netflix Premium 3 Bulan",
      harga: 120000,
      kategori: "Streaming",
      deskripsi: "Hemat 11% dibanding beli satuan",
      stok: 2,
      total: 5,
    },
    {
      kode: "SPT-1BLN",
      nama: "Spotify Premium 1 Bulan",
      harga: 20000,
      kategori: "Streaming",
      deskripsi: "Tanpa iklan, download lagu offline",
      stok: 3,
      total: 9,
    },
    {
      kode: "SPT-3BLN",
      nama: "Spotify Premium 3 Bulan",
      harga: 55000,
      kategori: "Streaming",
      deskripsi: "Hemat lebih banyak!",
      stok: 2,
      total: 4,
    },
    {
      kode: "YTB-1BLN",
      nama: "YouTube Premium 1 Bulan",
      harga: 25000,
      kategori: "Streaming",
      deskripsi: "Tanpa iklan + YouTube Music",
      stok: 2,
      total: 6,
    },
    {
      kode: "DSN-1BLN",
      nama: "Disney+ Hotstar 1 Bulan",
      harga: 30000,
      kategori: "Streaming",
      deskripsi: "Film & serial terbaru Disney, Marvel",
      stok: 2,
      total: 4,
    },
    {
      kode: "NVN-1BLN",
      nama: "NordVPN 1 Bulan",
      harga: 35000,
      kategori: "VPN",
      deskripsi: "Koneksi aman & cepat, 60+ negara",
      stok: 2,
      total: 5,
    },
    {
      kode: "NVN-6BLN",
      nama: "NordVPN 6 Bulan",
      harga: 150000,
      kategori: "VPN",
      deskripsi: "Hemat 29%, server premium",
      stok: 1,
      total: 2,
    },
    {
      kode: "CNV-PRO",
      nama: "Canva Pro 1 Bulan",
      harga: 40000,
      kategori: "Produktivitas",
      deskripsi: "Semua template premium terbuka",
      stok: 2,
      total: 7,
    },
    {
      kode: "GPT-PLUS",
      nama: "ChatGPT Plus 1 Bulan",
      harga: 85000,
      kategori: "Produktivitas",
      deskripsi: "GPT-4, akses prioritas",
      stok: 2,
      total: 6,
    },
    {
      kode: "GRM-PRE",
      nama: "Grammarly Premium 1 Bulan",
      harga: 35000,
      kategori: "Produktivitas",
      deskripsi: "AI writing & grammar checker",
      stok: 2,
      total: 3,
    },
    {
      kode: "ML-DM100",
      nama: "Mobile Legends 100 Diamond",
      harga: 15000,
      kategori: "Game",
      deskripsi: "Top up instan ke akun ML kamu",
      stok: 2,
      total: 10,
    },
    {
      kode: "ML-DM500",
      nama: "Mobile Legends 500 Diamond",
      harga: 65000,
      kategori: "Game",
      deskripsi: "Bonus 50 Diamond setiap pembelian",
      stok: 2,
      total: 5,
    },
    {
      kode: "FF-DM100",
      nama: "Free Fire 100 Diamond",
      harga: 14000,
      kategori: "Game",
      deskripsi: "Top up FF cepat & aman",
      stok: 2,
      total: 8,
    },
    {
      kode: "FF-DM500",
      nama: "Free Fire 500 Diamond",
      harga: 60000,
      kategori: "Game",
      deskripsi: "Value terbaik untuk FF!",
      stok: 2,
      total: 4,
    },
  ],
  stocks: [
    {
      id: 1,
      kode_produk: "NFX-1BLN",
      data_akun:
        "email: netflixdemo1@gmail.com | pass: Demo@1234 | Profil: Slot 3",
      is_sold: false,
    },
    {
      id: 2,
      kode_produk: "NFX-1BLN",
      data_akun:
        "email: netflixdemo2@gmail.com | pass: Demo@5678 | Profil: Slot 2",
      is_sold: false,
    },
    {
      id: 3,
      kode_produk: "NFX-1BLN",
      data_akun:
        "email: netflixdemo3@gmail.com | pass: Demo@9012 | Profil: Slot 4",
      is_sold: false,
    },
    {
      id: 4,
      kode_produk: "NFX-3BLN",
      data_akun:
        "email: netflixprem1@gmail.com | pass: Prem@1111 | Profil: Slot 1",
      is_sold: false,
    },
    {
      id: 5,
      kode_produk: "NFX-3BLN",
      data_akun:
        "email: netflixprem2@gmail.com | pass: Prem@2222 | Profil: Slot 2",
      is_sold: false,
    },
    {
      id: 6,
      kode_produk: "SPT-1BLN",
      data_akun: "email: spotifydemo1@gmail.com | pass: Spot@111",
      is_sold: false,
    },
    {
      id: 7,
      kode_produk: "SPT-1BLN",
      data_akun: "email: spotifydemo2@gmail.com | pass: Spot@222",
      is_sold: false,
    },
    {
      id: 8,
      kode_produk: "SPT-1BLN",
      data_akun: "email: spotifydemo3@gmail.com | pass: Spot@333",
      is_sold: false,
    },
    {
      id: 9,
      kode_produk: "SPT-3BLN",
      data_akun: "email: spotifyprem1@gmail.com | pass: Spot@999",
      is_sold: false,
    },
    {
      id: 10,
      kode_produk: "SPT-3BLN",
      data_akun: "email: spotifyprem2@gmail.com | pass: Spot@888",
      is_sold: false,
    },
    {
      id: 11,
      kode_produk: "YTB-1BLN",
      data_akun: "email: ytprem1@gmail.com | pass: Youtube@11",
      is_sold: false,
    },
    {
      id: 12,
      kode_produk: "YTB-1BLN",
      data_akun: "email: ytprem2@gmail.com | pass: Youtube@22",
      is_sold: false,
    },
    {
      id: 13,
      kode_produk: "DSN-1BLN",
      data_akun: "email: disneydemo1@gmail.com | pass: Disney@11",
      is_sold: false,
    },
    {
      id: 14,
      kode_produk: "DSN-1BLN",
      data_akun: "email: disneydemo2@gmail.com | pass: Disney@22",
      is_sold: false,
    },
    {
      id: 15,
      kode_produk: "NVN-1BLN",
      data_akun: "email: nordvpn1@gmail.com | pass: Nord@1234",
      is_sold: false,
    },
    {
      id: 16,
      kode_produk: "NVN-1BLN",
      data_akun: "email: nordvpn2@gmail.com | pass: Nord@5678",
      is_sold: false,
    },
    {
      id: 17,
      kode_produk: "NVN-6BLN",
      data_akun: "email: nordvpn6m@gmail.com | pass: Nord6M@111",
      is_sold: false,
    },
    {
      id: 18,
      kode_produk: "CNV-PRO",
      data_akun: "email: canvapro1@gmail.com | pass: Canva@Pro1",
      is_sold: false,
    },
    {
      id: 19,
      kode_produk: "CNV-PRO",
      data_akun: "email: canvapro2@gmail.com | pass: Canva@Pro2",
      is_sold: false,
    },
    {
      id: 20,
      kode_produk: "GPT-PLUS",
      data_akun:
        "email: chatgpt1@gmail.com | pass: GPT@Plus1 | Metode: Shared Account",
      is_sold: false,
    },
    {
      id: 21,
      kode_produk: "GPT-PLUS",
      data_akun:
        "email: chatgpt2@gmail.com | pass: GPT@Plus2 | Metode: Shared Account",
      is_sold: false,
    },
    {
      id: 22,
      kode_produk: "GRM-PRE",
      data_akun: "email: grammarly1@gmail.com | pass: Gram@Pre1",
      is_sold: false,
    },
    {
      id: 23,
      kode_produk: "GRM-PRE",
      data_akun: "email: grammarly2@gmail.com | pass: Gram@Pre2",
      is_sold: false,
    },
    {
      id: 24,
      kode_produk: "ML-DM100",
      data_akun: "ID: 123456789 | Server: ID | 100 Diamond sudah ditambahkan",
      is_sold: false,
    },
    {
      id: 25,
      kode_produk: "ML-DM100",
      data_akun: "ID: 987654321 | Server: ID | 100 Diamond sudah ditambahkan",
      is_sold: false,
    },
    {
      id: 26,
      kode_produk: "ML-DM500",
      data_akun:
        "ID: 111222333 | Server: ID | 500+50 Diamond sudah ditambahkan",
      is_sold: false,
    },
    {
      id: 27,
      kode_produk: "ML-DM500",
      data_akun:
        "ID: 444555666 | Server: ID | 500+50 Diamond sudah ditambahkan",
      is_sold: false,
    },
    {
      id: 28,
      kode_produk: "FF-DM100",
      data_akun: "ID: 55566677 | Reg: ID | 100 Diamond sudah ditambahkan",
      is_sold: false,
    },
    {
      id: 29,
      kode_produk: "FF-DM100",
      data_akun: "ID: 88899900 | Reg: ID | 100 Diamond sudah ditambahkan",
      is_sold: false,
    },
    {
      id: 30,
      kode_produk: "FF-DM500",
      data_akun: "ID: 11122233 | Reg: ID | 500 Diamond sudah ditambahkan",
      is_sold: false,
    },
    {
      id: 31,
      kode_produk: "FF-DM500",
      data_akun: "ID: 44455566 | Reg: ID | 500 Diamond sudah ditambahkan",
      is_sold: false,
    },
  ],
  vouchers: [
    {
      kode: "HEMAT5K",
      tipe: "NOMINAL",
      nilai: 5000,
      kuota: 25,
      terpakai: 6,
      min_belanja: 25000,
    },
    {
      kode: "FAEZ10",
      tipe: "PERSEN",
      nilai: 10,
      kuota: 50,
      terpakai: 14,
      min_belanja: 20000,
    },
    {
      kode: "PRO15K",
      tipe: "NOMINAL",
      nilai: 15000,
      kuota: 15,
      terpakai: 3,
      min_belanja: 80000,
    },
  ],
  transactions: [
    {
      trx_id: "TRX-1763401192841",
      telegram_id: 8143402518,
      username: "fadil_px",
      kode_produk: "NFX-1BLN",
      nama_produk: "Netflix Premium 1 Bulan",
      harga: 45000,
      qty: 1,
      voucher_code: null,
      rating: 5,
      review: "Pengiriman akun instan begitu QRIS lunas, langsung bisa login.",
      warranty_active: 1,
      created_at: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
      accounts: [
        "email: netflixdemo_sold1@gmail.com | pass: Demo@9911 | Profil: Slot 1",
      ],
    },
    {
      trx_id: "TRX-1763392041120",
      telegram_id: 629104821,
      username: "rizky_dev",
      kode_produk: "GPT-PLUS",
      nama_produk: "ChatGPT Plus 1 Bulan",
      harga: 80000,
      qty: 1,
      voucher_code: "HEMAT5K",
      rating: 5,
      review: "Akses GPT-4 lancar, kode voucher berfungsi normal.",
      warranty_active: 1,
      created_at: new Date(Date.now() - 3600 * 1000 * 19).toISOString(),
      accounts: [
        "email: chatgpt_sold1@gmail.com | pass: GPT@Pro88 | Metode: Shared Account",
      ],
    },
    {
      trx_id: "TRX-1763348920315",
      telegram_id: 518293014,
      username: "nanda_klt",
      kode_produk: "SPT-1BLN",
      nama_produk: "Spotify Premium 1 Bulan",
      harga: 20000,
      qty: 1,
      voucher_code: null,
      rating: 5,
      review: "Proses cepat gak perlu nunggu admin balas chat.",
      warranty_active: 1,
      created_at: new Date(Date.now() - 3600 * 1000 * 32).toISOString(),
      accounts: ["email: spot_sold1@gmail.com | pass: Spot@771"],
    },
  ],
  users: [
    {
      telegram_id: 8143402518,
      username: "fadil_px",
      balance: 125000,
      total_trx: 4,
    },
    {
      telegram_id: 629104821,
      username: "rizky_dev",
      balance: 40000,
      total_trx: 2,
    },
    {
      telegram_id: 518293014,
      username: "nanda_klt",
      balance: 15000,
      total_trx: 1,
    },
  ],
};

function getLocalStoreData() {
  try {
    const raw = localStorage.getItem("faez_local_db_v1");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  localStorage.setItem("faez_local_db_v1", JSON.stringify(DEFAULT_SEED_DATA));
  return JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
}

function saveLocalStoreData(data) {
  try {
    localStorage.setItem("faez_local_db_v1", JSON.stringify(data));
  } catch (e) {}
}
