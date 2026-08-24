// 퀴즈 결과 저장(localStorage) + 복사해서 붙여넣기 기능

function getStudentName() {
  return localStorage.getItem("studentName") || "";
}

function setStudentName(name) {
  localStorage.setItem("studentName", name);
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem("quizHistory") || "[]");
  } catch (err) {
    return [];
  }
}

function saveQuizResult({ day, modeLabel, score, total }) {
  const history = getHistory();
  history.unshift({
    name: getStudentName() || "이름 미입력",
    day,
    modeLabel,
    score,
    total,
    date: new Date().toISOString(),
  });
  localStorage.setItem("quizHistory", JSON.stringify(history.slice(0, 200)));
  renderHistoryList();
}

function formatDate(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRecord(r) {
  const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
  return `${r.name} | ${r.day} ${r.modeLabel} | ${r.score}/${r.total} (${pct}%) | ${formatDate(r.date)}`;
}

async function copyText(text, statusEl) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    if (statusEl) {
      statusEl.textContent = "✅ 복사했어요! 선생님께 붙여넣기 해보세요.";
      setTimeout(() => {
        statusEl.textContent = "";
      }, 3000);
    }
  } catch (err) {
    if (statusEl) statusEl.textContent = "⚠️ 복사에 실패했어요. 직접 선택해서 복사해주세요.";
  }
}

function renderHistoryList() {
  const listEl = document.getElementById("history-list");
  if (!listEl) return;

  const history = getHistory();
  if (!history.length) {
    listEl.innerHTML = `<p class="content-placeholder-text">아직 퀴즈 기록이 없어요. 퀴즈를 풀면 여기에 자동으로 쌓여요!</p>`;
    return;
  }

  listEl.innerHTML = history
    .map((r) => `<div class="history-row">${formatRecord(r)}</div>`)
    .join("");
}

function initHistoryPanel() {
  const nameInput = document.getElementById("student-name-input");
  const copyAllBtn = document.getElementById("copy-all-history-btn");
  const clearBtn = document.getElementById("clear-history-btn");
  const statusEl = document.getElementById("history-status");

  if (nameInput) {
    nameInput.value = getStudentName();
    nameInput.addEventListener("input", () => setStudentName(nameInput.value.trim()));
  }

  if (copyAllBtn) {
    copyAllBtn.addEventListener("click", () => {
      const history = getHistory();
      if (!history.length) {
        statusEl.textContent = "복사할 기록이 없어요.";
        return;
      }
      copyText(history.map(formatRecord).join("\n"), statusEl);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (confirm("모든 퀴즈 기록을 삭제할까요? 이 동작은 되돌릴 수 없어요.")) {
        localStorage.removeItem("quizHistory");
        renderHistoryList();
      }
    });
  }

  renderHistoryList();
}
