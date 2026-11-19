const API_URL = "https://api.zientax.my.id/api/survey/submit";
const MAX_FACTORS = 2;
const TOTAL_STEPS = 4;

let currentStep = 1;

// DOM Elements
const htmlEl = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const surveyForm = document.getElementById("surveyForm");
const steps = document.querySelectorAll(".step");
const progressFill = document.getElementById("progressFill");
const stepIndicator = document.getElementById("stepIndicator");
const stepPercent = document.getElementById("stepPercent");
const stepMeta = document.getElementById("stepMeta");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const errorMsg = document.getElementById("errorMsg");
const voucherScreen = document.getElementById("voucherScreen");
const voucherCodeText = document.getElementById("voucherCodeText");
const copyVoucherBtn = document.getElementById("copyVoucherBtn");
const factorInputs = document.querySelectorAll('input[name="factors"]');
const factorCounter = document.getElementById("factorCounter");

// 1. Inisialisasi Ikon & Tema
lucide.createIcons();

function applyTheme(theme) {
  htmlEl.setAttribute("data-theme", theme);
  localStorage.setItem("faez_theme", theme);
  themeIcon.setAttribute("data-lucide", theme === "dark" ? "sun" : "moon");
  lucide.createIcons();
}

const savedTheme =
  localStorage.getItem("faez_theme") ||
  (window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light");
applyTheme(savedTheme);

themeToggle.addEventListener("click", () => {
  const nextTheme =
    htmlEl.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
});

// 2. Cek apakah user sudah pernah mengisi survei
const claimedCode = localStorage.getItem("faez_survey_voucher");
if (claimedCode) {
  showVoucherScreen(claimedCode);
}

// 3. Validasi Maksimal 2 Pilihan pada Faktor Prioritas
factorInputs.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    const checkedCount = document.querySelectorAll(
      'input[name="factors"]:checked',
    ).length;
    factorCounter.textContent = `${checkedCount} / ${MAX_FACTORS} dipilih`;

    factorInputs.forEach((cb) => {
      if (!cb.checked) {
        cb.disabled = checkedCount >= MAX_FACTORS;
      }
    });
  });
});

// 4. Navigasi Multi-Step & Validasi Per Langkah
function showError(message) {
  errorMsg.textContent = message;
  errorMsg.hidden = false;
}

function clearError() {
  errorMsg.hidden = true;
  errorMsg.textContent = "";
}

function updateStepUI() {
  clearError();
  steps.forEach((step) => {
    step.classList.toggle("active", Number(step.dataset.step) === currentStep);
  });

  const percent = Math.round((currentStep / TOTAL_STEPS) * 100);
  progressFill.style.width = `${percent}%`;
  stepIndicator.textContent = `Langkah ${currentStep} dari ${TOTAL_STEPS}`;
  stepPercent.textContent = `${percent}%`;

  prevBtn.hidden = currentStep === 1;
  nextBtn.hidden = currentStep === TOTAL_STEPS;
  submitBtn.hidden = currentStep !== TOTAL_STEPS;
}

function validateStep(stepNumber) {
  clearError();

  if (stepNumber === 1) {
    const role = surveyForm.querySelector('input[name="role"]:checked');
    const platform = surveyForm.querySelector('input[name="platform"]:checked');
    const frequency = surveyForm.querySelector(
      'input[name="frequency"]:checked',
    );
    if (!role || !platform || !frequency) {
      showError("Silakan lengkapi seluruh pertanyaan pada langkah ini.");
      return false;
    }
  }

  if (stepNumber === 2) {
    const apps = surveyForm.querySelectorAll(
      'input[name="favoriteApps"]:checked',
    );
    const accountType = surveyForm.querySelector(
      'input[name="accountType"]:checked',
    );
    if (apps.length === 0) {
      showError("Pilih minimal 1 aplikasi premium yang sering digunakan.");
      return false;
    }
    if (!accountType) {
      showError("Pilih tipe akun yang paling kamu sukai.");
      return false;
    }
  }

  if (stepNumber === 4) {
    const budget = surveyForm.querySelector('input[name="budget"]:checked');
    const payment = surveyForm.querySelector('input[name="payment"]:checked');
    const factors = surveyForm.querySelectorAll(
      'input[name="factors"]:checked',
    );
    if (!budget || !payment) {
      showError("Pilih rata-rata budget dan metode pembayaran favoritmu.");
      return false;
    }
    if (factors.length === 0 || factors.length > MAX_FACTORS) {
      showError(`Pilih 1 hingga ${MAX_FACTORS} faktor terpenting.`);
      return false;
    }
  }

  return true;
}

nextBtn.addEventListener("click", () => {
  if (validateStep(currentStep) && currentStep < TOTAL_STEPS) {
    currentStep++;
    updateStepUI();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

prevBtn.addEventListener("click", () => {
  if (currentStep > 1) {
    currentStep--;
    updateStepUI();
  }
});

// 5. Pengiriman Form ke API Backend
surveyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateStep(4)) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Mengirim...";

  const payload = {
    role: surveyForm.querySelector('input[name="role"]:checked')?.value,
    platform: surveyForm.querySelector('input[name="platform"]:checked')?.value,
    frequency: surveyForm.querySelector('input[name="frequency"]:checked')
      ?.value,
    favoriteApps: Array.from(
      surveyForm.querySelectorAll('input[name="favoriteApps"]:checked'),
    ).map((el) => el.value),
    accountType: surveyForm.querySelector('input[name="accountType"]:checked')
      ?.value,
    otherNeeds: Array.from(
      surveyForm.querySelectorAll('input[name="otherNeeds"]:checked'),
    ).map((el) => el.value),
    missingStock: document.getElementById("missingStock").value.trim(),
    budget: surveyForm.querySelector('input[name="budget"]:checked')?.value,
    payment: surveyForm.querySelector('input[name="payment"]:checked')?.value,
    factors: Array.from(
      surveyForm.querySelectorAll('input[name="factors"]:checked'),
    ).map((el) => el.value),
    feedback: document.getElementById("feedback").value.trim(),
    contact: document.getElementById("contact").value.trim(),
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal menyimpan survei.");
    }

    const code = result.voucherCode || "SURVEY15";
    localStorage.setItem("faez_survey_voucher", code);
    showVoucherScreen(code);
  } catch (err) {
    showError(
      err.message || "Koneksi ke server gagal. Coba beberapa saat lagi.",
    );
    submitBtn.disabled = false;
    submitBtn.textContent = "Kirim & Klaim Voucher";
  }
});

// 6. Layar Klaim & Salin Voucher
function showVoucherScreen(code) {
  surveyForm.hidden = true;
  stepMeta.hidden = true;
  progressFill.style.width = "100%";
  voucherCodeText.textContent = code;
  voucherScreen.hidden = false;
  lucide.createIcons();
}

copyVoucherBtn.addEventListener("click", async () => {
  const code = voucherCodeText.textContent;
  try {
    await navigator.clipboard.writeText(code);
    copyVoucherBtn.innerHTML = '<i data-lucide="check"></i> Tersalin';
    lucide.createIcons();
    setTimeout(() => {
      copyVoucherBtn.innerHTML = '<i data-lucide="copy"></i> Salin';
      lucide.createIcons();
    }, 2000);
  } catch {
    alert(`Kode voucher: ${code}`);
  }
});
