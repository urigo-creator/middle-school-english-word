// Reading 지문 탭 렌더링 (지문 제목별 탭 -> 단어/표현 목록)
// passages 배열만 바꾸면 다른 폴더(예: Intermediate)에도 그대로 재사용 가능.

function renderReadingPassages(prefix, tabsContainerId, panelsContainerId, passages) {
  const tabsEl = document.getElementById(tabsContainerId);
  const panelsEl = document.getElementById(panelsContainerId);
  if (!tabsEl || !panelsEl || !passages || !passages.length) return;

  tabsEl.innerHTML = passages
    .map(
      (p, i) =>
        `<button class="tab-btn${i === 0 ? " active" : ""}" data-tabgroup="${prefix}" data-target="${prefix}-${p.id}">${p.title}</button>`
    )
    .join("");

  panelsEl.innerHTML = passages
    .map(
      (p, i) => `
      <div class="tab-panel${i === 0 ? " active" : ""}" data-tabgroup="${prefix}" id="${prefix}-${p.id}">
        <div class="reading-header-text">
          <h3>📖 ${p.title}</h3>
          ${p.meta ? `<p class="reading-meta">${p.meta}</p>` : ""}
        </div>
        <div class="reading-vocab">
          <h4>단어 &amp; 표현 (${p.vocab.length})</h4>
          <ul class="vocab-list">
            ${p.vocab
              .map(
                (v, idx) => `
                <li>
                  <span class="vocab-no">${idx + 1}</span>
                  <span class="vocab-en">
                    ${v.en}
                    <button class="speak-btn" type="button" aria-label="발음 듣기" data-word="${v.en}">🔊</button>
                  </span>
                  <span class="vocab-ko">${v.ko}</span>
                </li>`
              )
              .join("")}
          </ul>
        </div>
      </div>`
    )
    .join("");

  panelsEl.querySelectorAll(".speak-btn").forEach((btn) => {
    btn.addEventListener("click", () => speak(btn.dataset.word));
  });
}
