// 단어 퀴즈 엔진 (객관식 영→한 / 한→영, 철자 맞추기 주관식)

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ================= 객관식 퀴즈 (영→한 / 한→영) =================
function initMultipleChoiceQuiz(containerId, words, mode, dayLabel) {
  const root = document.getElementById(containerId);
  if (!root) return;

  const isEnToKo = mode === "en-ko";
  const modeLabel = isEnToKo ? "영→한" : "한→영";
  let questions = [];
  let index = 0;
  let score = 0;
  let answered = false;
  let answers = [];

  function buildQuestions() {
    return shuffle(words).map((word) => {
      const correct = isEnToKo ? word.ko : word.en;
      const promptText = isEnToKo ? word.en : word.ko;
      const distractorPool = words.filter((w) => w !== word);
      const distractors = shuffle(distractorPool)
        .slice(0, 3)
        .map((w) => (isEnToKo ? w.ko : w.en));
      const options = shuffle([correct, ...distractors]);
      return { word, promptText, correct, options };
    });
  }

  function start() {
    questions = buildQuestions();
    index = 0;
    score = 0;
    answered = false;
    answers = [];
    renderQuestion();
  }

  function renderQuestion() {
    if (index >= questions.length) {
      renderResult();
      return;
    }
    const q = questions[index];
    answered = false;

    root.innerHTML = `
      <div class="quiz-progress">${index + 1} / ${questions.length} · 점수 ${score}</div>
      <div class="quiz-question">
        ${
          isEnToKo
            ? `${q.promptText} <button class="speak-btn" type="button" aria-label="발음 듣기">🔊</button>`
            : q.promptText
        }
      </div>
      <div class="quiz-options">
        ${q.options
          .map((opt) => `<button class="quiz-option-btn" data-value="${encodeURIComponent(opt)}">${opt}</button>`)
          .join("")}
      </div>
      <div class="quiz-feedback" aria-live="polite"></div>
    `;

    if (isEnToKo) {
      root.querySelector(".speak-btn").addEventListener("click", () => speak(q.word.en));
    }

    root.querySelectorAll(".quiz-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => selectAnswer(btn, q));
    });
  }

  function selectAnswer(btn, q) {
    if (answered) return;
    answered = true;

    const chosen = decodeURIComponent(btn.dataset.value);
    const isCorrect = chosen === q.correct;
    if (isCorrect) score++;
    answers.push({ word: q.word, isCorrect, yourAnswer: chosen });

    root.querySelectorAll(".quiz-option-btn").forEach((b) => {
      b.disabled = true;
      const val = decodeURIComponent(b.dataset.value);
      if (val === q.correct) b.classList.add("correct");
      else if (b === btn) b.classList.add("incorrect");
    });

    const feedback = root.querySelector(".quiz-feedback");
    feedback.textContent = isCorrect ? "✅ 정답이에요!" : `❌ 오답! 정답은 "${q.correct}"`;
    feedback.classList.add(isCorrect ? "correct" : "incorrect");

    const nextBtn = document.createElement("button");
    nextBtn.className = "quiz-next-btn";
    nextBtn.type = "button";
    nextBtn.textContent = index + 1 >= questions.length ? "결과 보기" : "다음 →";
    nextBtn.addEventListener("click", () => {
      index++;
      renderQuestion();
    });
    root.appendChild(nextBtn);
  }

  function renderResult() {
    saveQuizResult({ day: dayLabel, modeLabel, score, total: questions.length });

    root.innerHTML = `
      <div class="quiz-result">
        <p class="quiz-result-score">${score} / ${questions.length}</p>
        <p class="quiz-result-msg">${resultMessage(score, questions.length)}</p>
        <div class="quiz-result-actions">
          <button class="quiz-copy-btn" type="button">📋 결과 복사하기</button>
          <button class="quiz-restart-btn" type="button">🔄 다시 풀기</button>
        </div>
        <p class="quiz-copy-status"></p>
        ${buildReviewHtml(answers)}
      </div>
    `;
    root.querySelector(".quiz-restart-btn").addEventListener("click", start);
    root.querySelector(".quiz-copy-btn").addEventListener("click", () => {
      const record = {
        name: getStudentName() || "이름 미입력",
        day: dayLabel,
        modeLabel,
        score,
        total: questions.length,
        date: new Date().toISOString(),
      };
      copyText(formatRecord(record), root.querySelector(".quiz-copy-status"));
    });
    root.querySelectorAll(".review-speak-btn").forEach((btn) => {
      btn.addEventListener("click", () => speak(btn.dataset.word));
    });
  }

  start();
}

// ================= 듣고 뜻 맞히기 퀴즈 (카드 뒤집기) =================
function initSpellingQuiz(containerId, words, dayLabel) {
  const root = document.getElementById(containerId);
  if (!root) return;

  const modeLabel = "듣고 뜻 맞히기";
  let order = [];
  let index = 0;
  let score = 0;
  let flipped = false;
  let answers = [];

  function start() {
    order = shuffle(words);
    index = 0;
    score = 0;
    answers = [];
    renderQuestion();
  }

  function renderQuestion() {
    if (index >= order.length) {
      renderResult();
      return;
    }
    const word = order[index];
    flipped = false;

    root.innerHTML = `
      <div class="quiz-progress">${index + 1} / ${order.length} · 점수 ${score}</div>

      <div class="flashcard quiz-listen-card">
        <div class="flashcard-inner">
          <div class="flashcard-face flashcard-front">
            <button class="speak-btn giant" type="button" aria-label="발음 듣기">🔊</button>
            <p class="flashcard-hint">발음을 듣고 철자와 뜻을 떠올려보세요</p>
          </div>
          <div class="flashcard-face flashcard-back">
            <div class="flashcard-en">
              ${word.en}
              <button class="speak-btn" type="button" aria-label="발음 듣기">🔊</button>
            </div>
            <div class="flashcard-ko">${word.ko}</div>
          </div>
        </div>
      </div>

      <button class="flashcard-flip-btn quiz-reveal-btn" type="button">➡️ 정답 확인</button>

      <div class="quiz-self-grade" hidden>
        <button class="grade-btn grade-wrong-btn" type="button">😵 몰랐어요</button>
        <button class="grade-btn grade-correct-btn" type="button">✅ 맞았어요</button>
      </div>
    `;

    const cardEl = root.querySelector(".quiz-listen-card");
    const revealBtn = root.querySelector(".quiz-reveal-btn");
    const gradeRow = root.querySelector(".quiz-self-grade");

    const playPronunciation = () => speak(word.en);
    root.querySelectorAll(".speak-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        playPronunciation();
      });
    });

    const reveal = () => {
      if (flipped) return;
      flipped = true;
      cardEl.classList.add("flipped");
      revealBtn.hidden = true;
      gradeRow.hidden = false;
    };

    cardEl.addEventListener("click", reveal);
    revealBtn.addEventListener("click", reveal);

    root.querySelector(".grade-correct-btn").addEventListener("click", () => gradeAnswer(word, true));
    root.querySelector(".grade-wrong-btn").addEventListener("click", () => gradeAnswer(word, false));

    playPronunciation();
  }

  function gradeAnswer(word, isCorrect) {
    if (isCorrect) score++;
    answers.push({ word, isCorrect, yourAnswer: isCorrect ? "맞음" : "몰랐음" });
    index++;
    renderQuestion();
  }

  function renderResult() {
    saveQuizResult({ day: dayLabel, modeLabel, score, total: order.length });

    root.innerHTML = `
      <div class="quiz-result">
        <p class="quiz-result-score">${score} / ${order.length}</p>
        <p class="quiz-result-msg">${resultMessage(score, order.length)}</p>
        <div class="quiz-result-actions">
          <button class="quiz-copy-btn" type="button">📋 결과 복사하기</button>
          <button class="quiz-restart-btn" type="button">🔄 다시 풀기</button>
        </div>
        <p class="quiz-copy-status"></p>
        ${buildReviewHtml(answers)}
      </div>
    `;
    root.querySelector(".quiz-restart-btn").addEventListener("click", start);
    root.querySelector(".quiz-copy-btn").addEventListener("click", () => {
      const record = {
        name: getStudentName() || "이름 미입력",
        day: dayLabel,
        modeLabel,
        score,
        total: order.length,
        date: new Date().toISOString(),
      };
      copyText(formatRecord(record), root.querySelector(".quiz-copy-status"));
    });
    root.querySelectorAll(".review-speak-btn").forEach((btn) => {
      btn.addEventListener("click", () => speak(btn.dataset.word));
    });
  }

  start();
}

// ================= 결과 화면 - 맞은/틀린 단어 목록 =================
function buildReviewHtml(answers) {
  const wrongItems = answers.filter((a) => !a.isCorrect);
  const correctItems = answers.filter((a) => a.isCorrect);

  const renderItem = (a, showYourAnswer) => `
    <li>
      <div class="review-word">
        <span class="review-en">${a.word.en}</span>
        <button class="review-speak-btn" type="button" aria-label="발음 듣기" data-word="${a.word.en}">🔊</button>
      </div>
      <span class="review-ko">${a.word.ko}</span>
      ${showYourAnswer ? `<span class="review-your-answer">내 답: ${a.yourAnswer}</span>` : ""}
    </li>`;

  return `
    <div class="quiz-review">
      <div class="quiz-review-col quiz-review-wrong">
        <h3>❌ 틀린 단어 (${wrongItems.length})</h3>
        ${
          wrongItems.length
            ? `<ul>${wrongItems.map((a) => renderItem(a, true)).join("")}</ul>`
            : `<p class="quiz-review-empty">틀린 단어가 없어요! 🎉</p>`
        }
      </div>
      <div class="quiz-review-col quiz-review-correct">
        <h3>✅ 맞은 단어 (${correctItems.length})</h3>
        ${
          correctItems.length
            ? `<ul>${correctItems.map((a) => renderItem(a, false)).join("")}</ul>`
            : `<p class="quiz-review-empty">아직 없어요.</p>`
        }
      </div>
    </div>
  `;
}

function resultMessage(score, total) {
  const ratio = total === 0 ? 0 : score / total;
  if (ratio === 1) return "완벽해요! 🎉";
  if (ratio >= 0.8) return "아주 잘했어요! 👏";
  if (ratio >= 0.5) return "조금만 더 연습해봐요! 💪";
  return "다시 한번 학습 탭에서 복습해봐요! 📚";
}
