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

// 발음 재생은 아래 순서로 시도한다. 앞 단계가 실패하면 자동으로 다음 단계로 넘어가며,
// 새 단어를 추가해도 별도 작업 없이 갤럭시·아이폰 모두에서 소리가 나도록 하는 게 목적이다.
//   1) 미리 만들어 둔 mp3 파일 (audio/words/) — 오프라인에서도 되고 음질이 일정하다.
//   2) 온라인 TTS (구글 번역 TTS) — mp3가 없는 단어도 사람 목소리로 재생. Samsung
//      Internet 등 일부 갤럭시 브라우저는 speechSynthesis가 아예 동작하지 않기 때문에
//      기기 음성 합성보다 먼저 시도한다. (네트워크 필요)
//   3) 브라우저 speechSynthesis — 위 두 가지가 모두 안 될 때의 최후 수단.
let currentAudio = null;

// 주어진 URL을 재생한다. 재생이 시작되면 resolve, 로드/재생에 실패하면 reject 하는 Promise.
function playAudioUrl(url) {
  return new Promise((resolve, reject) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    const audio = new Audio();
    currentAudio = audio;

    // 일정 시간 안에 재생이 시작되지 않으면 실패로 간주하고 다음 단계로 넘어간다.
    const timer = setTimeout(() => reject(new Error("audio timeout")), 4000);
    const done = (fn) => (arg) => {
      clearTimeout(timer);
      fn(arg);
    };
    const ok = done(resolve);
    const fail = done(reject);

    audio.addEventListener("playing", () => ok(), { once: true });
    audio.addEventListener("error", () => fail(new Error("audio error")), { once: true });
    audio.src = url;
    audio.play().then(ok, fail);
  });
}

function onlineTtsUrl(text) {
  const q = encodeURIComponent(text.trim());
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${q}`;
}

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
  playAudioUrl(`audio/words/${slugify(text)}.mp3`)
    .catch(() => playAudioUrl(onlineTtsUrl(text)))
    .catch(() => speakWithSynthesis(text));
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

  if (typeof day17Words !== "undefined") {
    renderWordGrid("day17-word-grid", day17Words);
    initFlashcard("day17", day17Words, "day17-word-grid");

    initMultipleChoiceQuiz("quiz17-en-ko", day17Words, "en-ko", "Day 17");
    initMultipleChoiceQuiz("quiz17-ko-en", day17Words, "ko-en", "Day 17");
    initSpellingQuiz("quiz17-spelling", day17Words, "Day 17");
  }
});
