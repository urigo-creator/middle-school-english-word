// 모든 레벨(main / sub / tertiary / quiz)의 탭을 동일한 방식으로 처리
// 버튼: class="tab-btn" data-tabgroup="그룹명" data-target="패널id"
// 패널: class="tab-panel" data-tabgroup="그룹명" id="패널id"
// 이벤트 위임 방식이라 나중에 JS로 동적으로 추가한 탭 버튼(예: Reading 지문 탭)도
// 별도 코드 없이 바로 동작한다.
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn || btn.disabled) return;

  const group = btn.dataset.tabgroup;
  const targetId = btn.dataset.target;

  document
    .querySelectorAll(`.tab-btn[data-tabgroup="${group}"]`)
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  document
    .querySelectorAll(`.tab-panel[data-tabgroup="${group}"]`)
    .forEach((panel) => panel.classList.remove("active"));
  document.getElementById(targetId).classList.add("active");
});

// 영어 단어 발음 듣기 (브라우저 내장 음성 합성 사용)
// 브라우저 기본 음성은 어색하게 들릴 수 있어서, 더 자연스러운
// 영어 음성이 있으면 그걸 우선 사용하도록 골라둔다.
let preferredVoice = null;

function pickPreferredVoice() {
  if (!("speechSynthesis" in window)) return;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return;

  const preferredNames = [
    "Samantha", // macOS/iOS 기본 자연스러운 음성
    "Google US English",
    "Microsoft Aria Online (Natural) - English (United States)",
    "Microsoft Jenny Online (Natural) - English (United States)",
  ];

  preferredVoice =
    preferredNames.map((name) => voices.find((v) => v.name === name)).find(Boolean) ||
    voices.find((v) => v.lang === "en-US") ||
    voices.find((v) => v.lang && v.lang.startsWith("en")) ||
    null;
}

if ("speechSynthesis" in window) {
  pickPreferredVoice();
  speechSynthesis.onvoiceschanged = pickPreferredVoice;
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  // Safari는 cancel() 직후 바로 speak()하면 소리가 씹히거나 안 나오는
  // 버그가 있어서 짧게 텀을 준다.
  setTimeout(() => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.92;
    utter.pitch = 1;
    if (preferredVoice) utter.voice = preferredVoice;
    speechSynthesis.speak(utter);
  }, 30);
}

// ================= 학습 카드 렌더링 =================
function renderWordGrid(containerId, words) {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  grid.innerHTML = words
    .map(
      (w) => `
      <div class="word-card">
        <div class="word-card-visual">${
          w.img ? `<img src="${w.img}" alt="${w.en}">` : w.emoji || "📘"
        }</div>
        <div class="word-card-no">${String(w.no).padStart(3, "0")}</div>
        <div class="word-card-en">
          ${w.en}
          <button class="speak-btn" type="button" aria-label="발음 듣기" data-word="${w.en}">🔊</button>
        </div>
        <div class="word-card-ko">${w.ko}</div>
      </div>`
    )
    .join("");

  grid.querySelectorAll(".speak-btn").forEach((btn) => {
    btn.addEventListener("click", () => speak(btn.dataset.word));
  });
}

// ================= 초기화 =================
document.addEventListener("DOMContentLoaded", () => {
  initHistoryPanel();

  if (typeof readingBasicPassages !== "undefined") {
    renderReadingPassages("reading-basic", "reading-basic-tabs", "reading-basic-panels", readingBasicPassages);
  }

  if (typeof readingIntermediatePassages !== "undefined") {
    renderReadingPassages(
      "reading-intermediate",
      "reading-intermediate-tabs",
      "reading-intermediate-panels",
      readingIntermediatePassages
    );
  }

  if (typeof day1Words !== "undefined") {
    renderWordGrid("day1-word-grid", day1Words);
    initFlashcard("day1", day1Words, "day1-word-grid");

    initMultipleChoiceQuiz("quiz-en-ko", day1Words, "en-ko", "Day 1");
    initMultipleChoiceQuiz("quiz-ko-en", day1Words, "ko-en", "Day 1");
    initSpellingQuiz("quiz-spelling", day1Words, "Day 1");
  }

  if (typeof day2Words !== "undefined") {
    renderWordGrid("day2-word-grid", day2Words);
    initFlashcard("day2", day2Words, "day2-word-grid");

    initMultipleChoiceQuiz("quiz2-en-ko", day2Words, "en-ko", "Day 2");
    initMultipleChoiceQuiz("quiz2-ko-en", day2Words, "ko-en", "Day 2");
    initSpellingQuiz("quiz2-spelling", day2Words, "Day 2");
  }
});
