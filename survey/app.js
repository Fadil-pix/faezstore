const API_BASE = "https://api.zientax.my.id/api/survey";

// Aman dari karakter khusus (", <, &) pada teks pertanyaan/opsi
const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Survey tetap jalan walau library ikon gagal dimuat
function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

let GROUPS = []; // [{ name: 'Profil', questions: [...] }, ...]
let CURRENT_STEP = 0;
let ANSWERS = {}; // { [questionId]: valueOrArray }

const surveyMain = document.getElementById("surveyMain");
const stepSidebarList = document.getElementById("stepSidebarList");
const currentGroupBadge = document.getElementById("currentGroupBadge");
const currentGroupTitle = document.getElementById("currentGroupTitle");
const questionsContainer = document.getElementById("questionsContainer");
const dynamicSurveyForm = document.getElementById("dynamicSurveyForm");
const errorMsg = document.getElementById("errorMsg");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const topProgressBadge = document.getElementById("topProgressBadge");
const progressFill = document.getElementById("progressFill");
const progressPercentPill = document.getElementById("progressPercentPill");
const voucherScreen = document.getElementById("voucherScreen");
const voucherCodeText = document.getElementById("voucherCodeText");
const copyVoucherBtn = document.getElementById("copyVoucherBtn");

refreshIcons();

// Cek jika sudah pernah mengisi survei
const savedVoucher = localStorage.getItem("faez_survey_voucher_v2");
if (savedVoucher) {
  showVoucherScreen(savedVoucher);
} else {
  loadQuestions();
}

async function loadQuestions() {
  try {
    const res = await fetch(`${API_BASE}/questions`);
    const json = await res.json();
    if (!json.success || !json.data.length) {
      currentGroupTitle.textContent = "Belum ada pertanyaan survei aktif.";
      return;
    }

    // Kelompokkan pertanyaan berdasarkan step_group
    const map = new Map();
    json.data.forEach((q) => {
      const grp = q.step_group || "Umum";
      if (!map.has(grp)) map.set(grp, []);
      map.get(grp).push(q);
    });

    GROUPS = Array.from(map.entries()).map(([name, questions]) => ({
      name,
      questions,
    }));
    renderCurrentStep();
  } catch (err) {
    currentGroupTitle.textContent = "Gagal memuat pertanyaan survei.";
  }
}

function renderSidebar() {
  stepSidebarList.innerHTML = GROUPS.map((g, idx) => {
    const isActive = idx === CURRENT_STEP;
    const isDone = idx < CURRENT_STEP;
    return `
      <div class="cat-item ${isActive ? "active" : ""} ${isDone ? "done" : ""}">
        <span>${g.name}</span>
        <span class="cat-badge">${isDone ? "✓" : g.questions.length}</span>
      </div>
    `;
  }).join("");
}

function renderCurrentStep() {
  errorMsg.hidden = true;
  const totalSteps = GROUPS.length;
  const group = GROUPS[CURRENT_STEP];

  renderSidebar();

  const pct = Math.round(((CURRENT_STEP + 1) / totalSteps) * 100);
  topProgressBadge.textContent = `Bagian ${CURRENT_STEP + 1} / ${totalSteps}`;
  progressFill.style.width = `${pct}%`;
  progressPercentPill.textContent = `${pct}%`;

  currentGroupBadge.textContent = `Bagian ${CURRENT_STEP + 1} dari ${totalSteps}`;
  currentGroupTitle.textContent = group.name;

  questionsContainer.innerHTML = group.questions
    .map((q) => {
      const opts =
        typeof q.options_json === "string"
          ? JSON.parse(q.options_json)
          : q.options_json || [];
      const savedVal = ANSWERS[q.id];
      const reqMark = q.is_required ? '<span class="req-star">*</span>' : "";
      const limitBadge =
        q.question_type === "checkbox" && q.max_select > 0
          ? `<span class="q-limit-pill">Maks. ${q.max_select} pilihan</span>`
          : "";

      let inputHtml = "";
      if (q.question_type === "radio") {
        inputHtml =
          `<div class="options-wrap">` +
          opts
            .map(
              (opt) => `
        <label class="opt-pill">
          <input type="radio" name="q_${q.id}" value="${esc(opt)}" ${savedVal === opt ? "checked" : ""} onchange="handleRadioChange(${q.id}, this.value)" />
          <span>${esc(opt)}</span>
        </label>
      `,
            )
            .join("") +
          `</div>`;
      } else if (q.question_type === "checkbox") {
        const arr = Array.isArray(savedVal) ? savedVal : [];
        const reachedMax = q.max_select > 0 && arr.length >= q.max_select;
        inputHtml =
          `<div class="options-wrap">` +
          opts
            .map((opt) => {
              const isChecked = arr.includes(opt);
              const isDisabled = !isChecked && reachedMax;
              return `
          <label class="opt-pill">
            <input type="checkbox" name="q_${q.id}" value="${esc(opt)}" ${isChecked ? "checked" : ""} ${isDisabled ? "disabled" : ""} onchange="handleCheckboxChange(${q.id}, ${q.max_select || 0})" />
            <span>${esc(opt)}</span>
          </label>
        `;
            })
            .join("") +
          `</div>`;
      } else if (q.question_type === "textarea") {
        inputHtml = `<textarea class="input-clean" rows="3" placeholder="Tulis jawabanmu di sini..." oninput="ANSWERS[${q.id}] = this.value">${esc(savedVal || "")}</textarea>`;
      } else {
        inputHtml = `<input type="text" class="input-clean" placeholder="Tulis jawabanmu di sini..." value="${esc(savedVal || "")}" oninput="ANSWERS[${q.id}] = this.value" />`;
      }

      return `
      <div class="q-card">
        <div class="q-card-head">
          <div class="q-title">${esc(q.question_text)} ${reqMark}</div>
          ${limitBadge}
        </div>
        ${inputHtml}
      </div>
    `;
    })
    .join("");

  // Kontrol tombol: Kirim HANYA tampil saat user berada di langkah terakhir!
  const isLastStep = CURRENT_STEP === totalSteps - 1;
  prevBtn.hidden = CURRENT_STEP === 0;
  nextBtn.hidden = isLastStep;
  submitBtn.hidden = !isLastStep;

  refreshIcons();
}

window.handleRadioChange = (qId, val) => {
  ANSWERS[qId] = val;
};

window.handleCheckboxChange = (qId, maxSelect) => {
  const checked = Array.from(
    document.querySelectorAll(`input[name="q_${qId}"]:checked`),
  ).map((el) => el.value);
  ANSWERS[qId] = checked;

  if (maxSelect > 0) {
    document.querySelectorAll(`input[name="q_${qId}"]`).forEach((cb) => {
      if (!cb.checked) cb.disabled = checked.length >= maxSelect;
    });
  }
};

function validateCurrentStep() {
  errorMsg.hidden = true;
  const group = GROUPS[CURRENT_STEP];

  for (const q of group.questions) {
    if (!q.is_required) continue;
    const val = ANSWERS[q.id];
    const isEmpty =
      val === undefined ||
      val === null ||
      (typeof val === "string" && val.trim() === "") ||
      (Array.isArray(val) && val.length === 0);
    if (isEmpty) {
      errorMsg.textContent = `Mohon isi pertanyaan wajib: "${q.question_text}"`;
      errorMsg.hidden = false;
      return false;
    }
  }
  return true;
}

prevBtn.addEventListener("click", () => {
  if (CURRENT_STEP > 0) {
    CURRENT_STEP--;
    renderCurrentStep();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

nextBtn.addEventListener("click", () => {
  if (!validateCurrentStep()) return;
  if (CURRENT_STEP < GROUPS.length - 1) {
    CURRENT_STEP++;
    renderCurrentStep();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

dynamicSurveyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateCurrentStep()) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Mengirim...";

  // Susun payload jawaban lengkap dengan teks pertanyaannya
  const formattedAnswers = [];
  GROUPS.forEach((g) => {
    g.questions.forEach((q) => {
      formattedAnswers.push({
        question_id: q.id,
        question_text: q.question_text,
        answer: ANSWERS[q.id] ?? "",
      });
    });
  });

  try {
    const res = await fetch(`${API_BASE}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: formattedAnswers }),
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.message || "Gagal mengirim survei.");

    const code = json.voucherCode || "SURVEY15";
    localStorage.setItem("faez_survey_voucher_v2", code);
    showVoucherScreen(code);
  } catch (err) {
    errorMsg.textContent = err.message;
    errorMsg.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Kirim Survei & Klaim Voucher";
  }
});

function showVoucherScreen(code) {
  surveyMain.hidden = true;
  progressFill.style.width = "100%";
  progressPercentPill.textContent = "100%";
  voucherCodeText.textContent = code;
  voucherScreen.hidden = false;
  refreshIcons();
}

copyVoucherBtn.addEventListener("click", async () => {
  const code = voucherCodeText.textContent;
  try {
    await navigator.clipboard.writeText(code);
  } catch (_) {
    const ta = document.createElement("textarea");
    ta.value = code;
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand("copy"); } catch (_) {}
    ta.remove();
  }
  copyVoucherBtn.textContent = "Tersalin!";
  setTimeout(() => {
    copyVoucherBtn.textContent = "Salin Kode";
  }, 2000);
});
