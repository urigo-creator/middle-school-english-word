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

// iOS/Safari는 cancel() 직후 바로 speak()하면 소리가 씹히거나 안 나오는
// 버그가 있어서 짧게 텀을 줘야 한다. 반면 안드로이드 크롬(갤럭시 등)은
// speak()가 클릭 이벤트 핸들러 안에서 "동기적으로" 호출되지 않으면
// 사용자 제스처로 인정하지 않아 아예 소리가 나오지 않으므로, 안드로이드를
// 포함한 그 외 브라우저에서는 지연 없이 즉시 재생해야 한다.
const isIOS =
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// 갤럭시(삼성 인터넷 등) 일부 브라우저는 speechSynthesis가 아예 동작하지 않고,
// 온라인 TTS(구글 번역)는 GitHub Pages 도메인에서 요청하면 차단(404)당한다.
// 그래서 모든 단어의 발음 mp3를 audio/words/ 에 미리 만들어 두고(tools/generate-audio.js),
// 그 파일을 재생한다. 파일이 없을 때만 브라우저 speechSynthesis로 대체한다.
let currentAudio = null;

function speakWithSynthesis(text) {
  if (!("speechSynthesis" in window)) return;

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 0.92;
  utter.pitch = 1;
  if (preferredVoice) utter.voice = preferredVoice;

  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel();
  }

  // iOS/Safari는 cancel() 직후 바로 speak()하면 소리가 씹히는 버그가 있어 짧게 텀을 준다.
  if (isIOS) {
    setTimeout(() => speechSynthesis.speak(utter), 30);
  } else {
    speechSynthesis.speak(utter);
  }
}

function speak(text) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  const audio = new Audio(`audio/words/${slugify(text)}.mp3`);
  currentAudio = audio;
  audio.addEventListener("error", () => speakWithSynthesis(text), { once: true });
  audio.play().catch(() => speakWithSynthesis(text));
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

  // Day 단어장 초기화. 새 Day를 추가하려면
  //   1) js/data/dayN.js 를 만들고 (const dayNWords = [...])
  //   2) index.html 에 dayN 스크립트 태그와 vocabulary-dayN 패널을 추가한 뒤
  //   3) 아래 목록에 한 줄 더 넣으면 된다.
  // (dayNWords 는 const 전역이라 window[...] 로는 안 잡혀서 직접 나열한다.)
  // Day 1은 예전에 만든 퀴즈 패널 id가 "quiz-..." (숫자 없음)라서 예외 처리한다.
  const dayWordSets = [];
  if (typeof day1Words !== "undefined") dayWordSets.push([1, day1Words]);
  if (typeof day2Words !== "undefined") dayWordSets.push([2, day2Words]);
  if (typeof day3Words !== "undefined") dayWordSets.push([3, day3Words]);
  if (typeof day17Words !== "undefined") dayWordSets.push([17, day17Words]);
  if (typeof day18Words !== "undefined") dayWordSets.push([18, day18Words]);
  if (typeof day19Words !== "undefined") dayWordSets.push([19, day19Words]);

  dayWordSets.forEach(([n, words]) => {
    const prefix = `day${n}`;
    const quizPrefix = n === 1 ? "quiz" : `quiz${n}`;
    const label = `Day ${n}`;

    renderWordGrid(`${prefix}-word-grid`, words);
    initFlashcard(prefix, words, `${prefix}-word-grid`);

    initMultipleChoiceQuiz(`${quizPrefix}-en-ko`, words, "en-ko", label);
    initMultipleChoiceQuiz(`${quizPrefix}-ko-en`, words, "ko-en", label);
    initSpellingQuiz(`${quizPrefix}-spelling`, words, label);
  });
});
