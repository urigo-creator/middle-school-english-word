// 플래시카드 학습 모드
// "학습하기" 버튼 -> 카드 모달이 뜨고, 앞면(그림+영어) -> 화살표 버튼 -> 뒷면(한국어 뜻)
// 발음 듣기(원어민) + 내 발음 녹음/재생 비교 기능 포함.
// prefix가 다르면 day2, day3 등에도 그대로 재사용 가능.

function initFlashcard(prefix, words, gridId) {
  const grid = document.getElementById(gridId);
  if (!grid || !words || !words.length) return;

  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "flashcard-start-btn";
  startBtn.textContent = "🔄 학습하기 (카드로 외우기)";
  grid.parentElement.insertBefore(startBtn, grid);

  const modal = document.createElement("div");
  modal.className = "flashcard-modal hidden";
  modal.id = `${prefix}-flashcard-modal`;
  modal.innerHTML = `
    <div class="flashcard-modal-inner">
      <button class="flashcard-close-btn" type="button" aria-label="닫기">✕</button>
      <div class="flashcard-progress"></div>

      <div class="flashcard">
        <div class="flashcard-inner">
          <div class="flashcard-face flashcard-front">
            <div class="flashcard-visual"></div>
            <div class="flashcard-en">
              <span class="flashcard-en-text"></span>
              <button class="speak-btn large" type="button" aria-label="발음 듣기">🔊</button>
            </div>
          </div>
          <div class="flashcard-face flashcard-back">
            <div class="flashcard-visual flashcard-visual-back"></div>
            <div class="flashcard-ko"></div>
            <div class="flashcard-en-small"></div>
          </div>
        </div>
      </div>

      <button class="flashcard-flip-btn" type="button">➡️ 뜻 보기</button>

      <div class="pronunciation-practice">
        <button class="native-play-btn" type="button">🔊 원어민 발음</button>
        <button class="record-btn" type="button">🎙️ 내 발음 녹음</button>
        <button class="play-my-btn" type="button" disabled>▶️ 내 발음 듣기</button>
      </div>
      <div class="record-status"></div>

      <div class="flashcard-nav">
        <button class="flashcard-prev-btn" type="button">← 이전</button>
        <button class="flashcard-next-btn" type="button">다음 →</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const progressEl = modal.querySelector(".flashcard-progress");
  const cardEl = modal.querySelector(".flashcard");
  const visualEl = modal.querySelector(".flashcard-front .flashcard-visual");
  const visualBackEl = modal.querySelector(".flashcard-visual-back");
  const enTextEl = modal.querySelector(".flashcard-en-text");
  const koEl = modal.querySelector(".flashcard-ko");
  const enSmallEl = modal.querySelector(".flashcard-en-small");
  const flipBtn = modal.querySelector(".flashcard-flip-btn");
  const speakIconBtn = modal.querySelector(".flashcard-front .speak-btn");
  const nativePlayBtn = modal.querySelector(".native-play-btn");
  const recordBtn = modal.querySelector(".record-btn");
  const playMyBtn = modal.querySelector(".play-my-btn");
  const statusEl = modal.querySelector(".record-status");
  const closeBtn = modal.querySelector(".flashcard-close-btn");
  const prevBtn = modal.querySelector(".flashcard-prev-btn");
  const nextBtn = modal.querySelector(".flashcard-next-btn");

  let index = 0;
  let mediaRecorder = null;
  let audioChunks = [];
  let recordedUrl = null;
  let isRecording = false;

  function resetRecording() {
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
    }
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      recordedUrl = null;
    }
    playMyBtn.disabled = true;
    recordBtn.textContent = "🎙️ 내 발음 녹음";
    recordBtn.classList.remove("recording");
    statusEl.textContent = "";
  }

  function renderCard() {
    const word = words[index];
    cardEl.classList.remove("flipped");
    flipBtn.textContent = "➡️ 뜻 보기";
    progressEl.textContent = `${index + 1} / ${words.length}`;
    const visualHtml = word.img
      ? `<img src="${word.img}" alt="${word.en}">`
      : word.emoji || "📘";
    visualEl.innerHTML = visualHtml;
    visualBackEl.innerHTML = visualHtml;
    enTextEl.textContent = word.en;
    koEl.textContent = word.ko;
    enSmallEl.textContent = word.en;
    resetRecording();
  }

  function flip() {
    const flipped = cardEl.classList.toggle("flipped");
    flipBtn.textContent = flipped ? "⬅️ 다시 보기" : "➡️ 뜻 보기";
  }

  function open() {
    index = 0;
    renderCard();
    modal.classList.remove("hidden");
  }

  function close() {
    modal.classList.add("hidden");
    resetRecording();
  }

  function go(delta) {
    index = (index + delta + words.length) % words.length;
    renderCard();
  }

  startBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", (e) => {
    if (modal.classList.contains("hidden")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  });

  cardEl.addEventListener("click", flip);
  flipBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    flip();
  });
  speakIconBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    speak(words[index].en);
  });
  nativePlayBtn.addEventListener("click", () => speak(words[index].en));

  prevBtn.addEventListener("click", () => go(-1));
  nextBtn.addEventListener("click", () => go(1));

  recordBtn.addEventListener("click", async () => {
    if (isRecording) {
      mediaRecorder.stop();
      return;
    }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      statusEl.textContent = "⚠️ 이 브라우저는 녹음 기능을 지원하지 않아요.";
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        recordedUrl = URL.createObjectURL(blob);
        playMyBtn.disabled = false;
        statusEl.textContent = "✅ 녹음 완료! 원어민 발음과 비교해보세요.";
        recordBtn.textContent = "🎙️ 다시 녹음";
        recordBtn.classList.remove("recording");
        isRecording = false;
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      isRecording = true;
      recordBtn.textContent = "⏹️ 정지";
      recordBtn.classList.add("recording");
      statusEl.textContent = "🔴 녹음 중...";
    } catch (err) {
      statusEl.textContent = "⚠️ 마이크 권한을 허용해주세요.";
    }
  });

  playMyBtn.addEventListener("click", () => {
    if (!recordedUrl) return;
    new Audio(recordedUrl).play();
  });
}
