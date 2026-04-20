const storageKey = "sat-vocab-sprint-progress";
const tabs = ["learn", "quiz", "spell", "write", "review"];

const appState = {
  selectedDay: 1,
  activeTab: "learn",
  learnIndex: 0,
  quizIndex: 0,
  quizFeedback: null,
  spellingIndex: 0,
  spellingFeedback: null,
  reviewIndex: 0,
  reviewFeedback: null,
  progress: loadProgress()
};

const dayGrid = document.getElementById("day-grid");
const panelContent = document.getElementById("panel-content");
const tabRow = document.getElementById("tab-row");

bootstrap();

function bootstrap() {
  ensureProgressShape();
  renderSummary();
  renderDayGrid();
  renderTabs();
  renderDayPanel();
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    return {};
  }
}

function ensureProgressShape() {
  if (!appState.progress.completedDays) appState.progress.completedDays = {};
  if (!appState.progress.quiz) appState.progress.quiz = {};
  if (!appState.progress.spelling) appState.progress.spelling = {};
  if (!appState.progress.sentences) appState.progress.sentences = {};
  if (!appState.progress.mastered) appState.progress.mastered = {};
}

function saveProgress() {
  localStorage.setItem(storageKey, JSON.stringify(appState.progress));
  renderSummary();
  renderDayGrid();
  updateHeroProgress();
}

function getDay(dayId) {
  return window.SAT_VOCAB_DATA.days.find((day) => day.id === dayId);
}

function getSelectedDay() {
  return getDay(appState.selectedDay);
}

function getCompletedCount() {
  return Object.keys(appState.progress.completedDays).length;
}

function updateHeroProgress() {
  document.getElementById("hero-progress").textContent = `${getCompletedCount()} days completed`;
}

function renderSummary() {
  const summaryRoot = document.getElementById("summary-grid");
  const loadedDays = window.SAT_VOCAB_DATA.days.length;
  const allWords = window.SAT_VOCAB_DATA.days.reduce((count, day) => count + day.words.length, 0);
  const masteredWords = Object.keys(appState.progress.mastered).length;
  const reviewWords = buildReviewDeck().length;

  summaryRoot.innerHTML = `
    <article class="summary-card">
      <span>Loaded Content</span>
      <strong>${loadedDays} of ${window.SAT_VOCAB_DATA.totalDays} days ready</strong>
    </article>
    <article class="summary-card">
      <span>Word Bank</span>
      <strong>${allWords} worksheet-based questions</strong>
    </article>
    <article class="summary-card">
      <span>Mastered Words</span>
      <strong>${masteredWords} marked strong</strong>
    </article>
    <article class="summary-card">
      <span>Review Queue</span>
      <strong>${reviewWords} retry items waiting</strong>
    </article>
  `;
  updateHeroProgress();
}

function renderDayGrid() {
  const total = window.SAT_VOCAB_DATA.totalDays;
  const loadedIds = new Set(window.SAT_VOCAB_DATA.days.map((day) => day.id));
  let html = "";

  for (let dayId = 1; dayId <= total; dayId += 1) {
    const isLoaded = loadedIds.has(dayId);
    const isSelected = dayId === appState.selectedDay;
    const isComplete = !!appState.progress.completedDays[dayId];
    const cardClass = [
      "day-chip",
      isSelected ? "active" : "",
      !isLoaded ? "locked" : "",
      isComplete ? "complete" : ""
    ].filter(Boolean).join(" ");

    html += `
      <button class="${cardClass}" data-day-id="${dayId}">
        <strong>Day ${dayId}</strong>
        <small>${isLoaded ? (isComplete ? "Completed" : "Available") : "Planned"}</small>
        ${!isLoaded ? '<span class="coming-soon">Add from book</span>' : ""}
      </button>
    `;
  }

  dayGrid.innerHTML = html;
  [...dayGrid.querySelectorAll("[data-day-id]")].forEach((button) => {
    button.addEventListener("click", () => {
      appState.selectedDay = Number(button.dataset.dayId);
      appState.learnIndex = 0;
      appState.quizIndex = 0;
      appState.spellingIndex = 0;
      appState.reviewIndex = 0;
      appState.quizFeedback = null;
      appState.spellingFeedback = null;
      appState.reviewFeedback = null;
      renderDayGrid();
      renderDayPanel();
    });
  });
}

function renderTabs() {
  const labels = {
    learn: "Learn",
    quiz: "Quiz",
    spell: "Spelling",
    write: "Sentence Lab",
    review: "Review"
  };

  tabRow.innerHTML = tabs.map((tab) => `
    <button class="tab-button ${appState.activeTab === tab ? "active" : ""}" data-tab="${tab}">
      ${labels[tab]}
    </button>
  `).join("");

  [...tabRow.querySelectorAll("[data-tab]")].forEach((button) => {
    button.addEventListener("click", () => {
      appState.activeTab = button.dataset.tab;
      renderTabs();
      renderDayPanel();
    });
  });
}

function renderDayPanel() {
  const selectedDay = getSelectedDay();
  const dayTitle = document.getElementById("day-title");
  const dayStatus = document.getElementById("day-status");
  const daySummary = document.getElementById("day-summary");

  if (!selectedDay) {
    dayTitle.textContent = `Day ${appState.selectedDay}`;
    dayStatus.textContent = "Coming Soon";
    daySummary.textContent = "This slot is reserved for the full 32-day book. Add the matching word list in data.js and it will appear here automatically.";
    panelContent.innerHTML = `
      <div class="empty-state">
        <h3>Day ${appState.selectedDay} is reserved.</h3>
        <p class="meta-text">The site structure is already ready for the rest of the book. Once more word sets are added to <code>data.js</code>, this panel will switch on automatically.</p>
      </div>
    `;
    return;
  }

  dayTitle.textContent = selectedDay.title;
  dayStatus.textContent = appState.progress.completedDays[selectedDay.id] ? "Completed" : "Ready";
  daySummary.textContent = `${selectedDay.words.length} worksheet-based items. Focus: ${selectedDay.focus}`;

  const views = {
    learn: renderLearnTab,
    quiz: renderQuizTab,
    spell: renderSpellingTab,
    write: renderWritingTab,
    review: renderReviewTab
  };

  views[appState.activeTab](selectedDay);
}

function renderLearnTab(day) {
  const entry = day.words[appState.learnIndex] || day.words[0];
  const isMastered = !!appState.progress.mastered[entry.word];
  panelContent.innerHTML = `
    <div class="flashcard">
      <div class="meta-row">
        <span class="pill">Card ${appState.learnIndex + 1} of ${day.words.length}</span>
        <span class="pill">${isMastered ? "Mastered" : "Needs more review"}</span>
      </div>
      ${renderWordWithPhonetic(entry, "learn-word")}
      <p class="question-stem">${entry.sentence}</p>
      <div class="meaning">
        <p class="meta-text"><strong>Core meaning:</strong> ${entry.choices[entry.answer]}</p>
        <p class="meta-text"><strong>Memory move:</strong> Say the word out loud, spell it, then use it in your own example.</p>
      </div>
      <div class="flash-controls">
        <button class="ghost" id="learn-prev">Previous</button>
        <button class="ghost" id="learn-next">Next</button>
        <button class="secondary" id="toggle-mastered">${isMastered ? "Unmark mastered" : "Mark mastered"}</button>
      </div>
    </div>
  `;

  document.getElementById("learn-prev").addEventListener("click", () => {
    appState.learnIndex = (appState.learnIndex - 1 + day.words.length) % day.words.length;
    renderLearnTab(day);
  });

  document.getElementById("learn-next").addEventListener("click", () => {
    appState.learnIndex = (appState.learnIndex + 1) % day.words.length;
    renderLearnTab(day);
  });

  document.getElementById("toggle-mastered").addEventListener("click", () => {
    if (appState.progress.mastered[entry.word]) {
      delete appState.progress.mastered[entry.word];
    } else {
      appState.progress.mastered[entry.word] = true;
    }
    saveProgress();
    renderLearnTab(day);
  });
}

function renderQuizTab(day) {
  const quizState = appState.progress.quiz[day.id] || { answers: {}, mistakes: [] };
  const question = day.words[appState.quizIndex];
  const answered = quizState.answers[question.word];
  const progressCount = Object.keys(quizState.answers).length;

  panelContent.innerHTML = `
    <div class="question-card">
      <div class="meta-row">
        <span class="pill">Question ${appState.quizIndex + 1} of ${day.words.length}</span>
        <span class="meta-text"><strong>${progressCount}</strong> answered so far</span>
      </div>
      ${renderWordWithPhonetic(question, "question-word")}
      <p class="question-stem">${question.sentence}</p>
      <div class="choice-list">
        ${question.choices.map((choice, index) => `
          <button class="choice-button ${answered === index ? (index === question.answer ? "correct" : "wrong") : ""}" data-choice-index="${index}">
            ${String.fromCharCode(65 + index)}. ${choice}
          </button>
        `).join("")}
      </div>
      ${renderFeedback(appState.quizFeedback)}
      <div class="quiz-controls">
        <button class="ghost" id="quiz-prev">Previous</button>
        <button class="ghost" id="quiz-next">Next</button>
        <button class="primary" id="quiz-complete">Finish this day</button>
      </div>
    </div>
  `;

  [...panelContent.querySelectorAll("[data-choice-index]")].forEach((button) => {
    button.addEventListener("click", () => handleQuizAnswer(day, Number(button.dataset.choiceIndex)));
  });

  document.getElementById("quiz-prev").addEventListener("click", () => {
    appState.quizIndex = (appState.quizIndex - 1 + day.words.length) % day.words.length;
    appState.quizFeedback = null;
    renderQuizTab(day);
  });

  document.getElementById("quiz-next").addEventListener("click", () => {
    appState.quizIndex = (appState.quizIndex + 1) % day.words.length;
    appState.quizFeedback = null;
    renderQuizTab(day);
  });

  document.getElementById("quiz-complete").addEventListener("click", () => {
    finalizeDay(day);
  });
}

function handleQuizAnswer(day, selectedIndex) {
  const question = day.words[appState.quizIndex];
  const quizState = appState.progress.quiz[day.id] || { answers: {}, mistakes: [] };
  quizState.answers[question.word] = selectedIndex;

  if (selectedIndex === question.answer) {
    quizState.mistakes = quizState.mistakes.filter((word) => word !== question.word);
    appState.quizFeedback = {
      type: "good",
      text: `Correct. "${question.word}" here means "${question.choices[question.answer]}."`
    };
  } else {
    if (!quizState.mistakes.includes(question.word)) {
      quizState.mistakes.push(question.word);
    }
    appState.quizFeedback = {
      type: "bad",
      text: `Not quite. The best answer is "${question.choices[question.answer]}."`
    };
  }

  appState.progress.quiz[day.id] = quizState;
  saveProgress();
  renderQuizTab(day);
}

function renderSpellingTab(day) {
  const question = day.words[appState.spellingIndex];
  const attempt = appState.progress.spelling[question.word] ? appState.progress.spelling[question.word].attempt || "" : "";
  panelContent.innerHTML = `
    <div class="question-card">
      <div class="meta-row">
        <span class="pill">Spelling ${appState.spellingIndex + 1} of ${day.words.length}</span>
        <span class="meta-text"><strong>Type the exact word or phrase.</strong></span>
      </div>
      <h3>${question.choices[question.answer]}</h3>
      <p class="question-stem">${question.sentence}</p>
      <p class="input-help">Students should type the target word from memory, including spaces for phrases.</p>
      <input type="text" id="spelling-input" value="${escapeHtml(attempt)}" placeholder="Type the vocabulary word" />
      ${renderFeedback(appState.spellingFeedback)}
      <div class="spell-controls">
        <button class="primary" id="check-spelling">Check spelling</button>
        <button class="ghost" id="spell-prev">Previous</button>
        <button class="ghost" id="spell-next">Next</button>
      </div>
    </div>
  `;

  const spellingInput = document.getElementById("spelling-input");
  spellingInput.addEventListener("input", (event) => {
    if (!appState.progress.spelling[question.word]) {
      appState.progress.spelling[question.word] = {};
    }
    appState.progress.spelling[question.word].attempt = event.target.value;
    saveProgress();
  });

  document.getElementById("check-spelling").addEventListener("click", () => {
    const guess = spellingInput.value.trim().toLowerCase();
    const target = question.word.trim().toLowerCase();
    const isCorrect = guess === target;
    if (!appState.progress.spelling[question.word]) {
      appState.progress.spelling[question.word] = {};
    }
    appState.progress.spelling[question.word].correct = isCorrect;
    appState.progress.spelling[question.word].attempt = spellingInput.value;
    appState.spellingFeedback = {
      type: isCorrect ? "good" : "bad",
      text: isCorrect ? "Perfect spelling." : `Keep going. The correct form is "${question.word}".`
    };
    saveProgress();
    renderSpellingTab(day);
  });

  document.getElementById("spell-prev").addEventListener("click", () => {
    appState.spellingIndex = (appState.spellingIndex - 1 + day.words.length) % day.words.length;
    appState.spellingFeedback = null;
    renderSpellingTab(day);
  });

  document.getElementById("spell-next").addEventListener("click", () => {
    appState.spellingIndex = (appState.spellingIndex + 1) % day.words.length;
    appState.spellingFeedback = null;
    renderSpellingTab(day);
  });
}

function renderWritingTab(day) {
  const writingWords = day.words.slice(0, 5);
  panelContent.innerHTML = `
    <div class="sentence-list">
      ${writingWords.map((entry) => {
        const stored = appState.progress.sentences[entry.word] || "";
        return `
          <div class="sentence-card">
            <div class="meta-row">
              <div class="word-chip-wrap">${renderWordWithPhonetic(entry, "word-chip-title")}</div>
              <span class="meta-text"><strong>${entry.choices[entry.answer]}</strong></span>
            </div>
            <p class="question-stem">${entry.sentence}</p>
            <textarea data-sentence-word="${entry.word}" placeholder="Write your own sentence using ${entry.word}.">${escapeHtml(stored)}</textarea>
          </div>
        `;
      }).join("")}
    </div>
  `;

  [...panelContent.querySelectorAll("[data-sentence-word]")].forEach((textarea) => {
    textarea.addEventListener("input", (event) => {
      appState.progress.sentences[event.target.dataset.sentenceWord] = event.target.value;
      saveProgress();
    });
  });
}

function renderReviewTab() {
  const reviewDeck = buildReviewDeck();

  if (!reviewDeck.length) {
    panelContent.innerHTML = `
      <div class="empty-state">
        <h3>Review queue is empty.</h3>
        <p class="meta-text">Once students miss quiz or spelling items, those words will appear here automatically for a second round.</p>
      </div>
    `;
    return;
  }

  const item = reviewDeck[appState.reviewIndex % reviewDeck.length];
  panelContent.innerHTML = `
    <div class="review-card">
      <div class="meta-row">
        <span class="pill">Review ${appState.reviewIndex + 1} of ${reviewDeck.length}</span>
        <span class="meta-text"><strong>Source:</strong> ${item.dayTitle}</span>
      </div>
      ${renderWordWithPhonetic(item, "question-word")}
      <p class="question-stem">${item.sentence}</p>
      <div class="choice-list">
        ${item.choices.map((choice, index) => `
          <button class="choice-button" data-review-choice="${index}">
            ${String.fromCharCode(65 + index)}. ${choice}
          </button>
        `).join("")}
      </div>
      ${renderFeedback(appState.reviewFeedback)}
      <div class="quiz-controls">
        <button class="ghost" id="review-next">Next review item</button>
      </div>
    </div>
  `;

  [...panelContent.querySelectorAll("[data-review-choice]")].forEach((button) => {
    button.addEventListener("click", () => handleReviewAnswer(item, Number(button.dataset.reviewChoice)));
  });

  document.getElementById("review-next").addEventListener("click", () => {
    appState.reviewIndex = (appState.reviewIndex + 1) % reviewDeck.length;
    appState.reviewFeedback = null;
    renderReviewTab();
  });
}

function handleReviewAnswer(item, selectedIndex) {
  const isCorrect = selectedIndex === item.answer;
  appState.reviewFeedback = {
    type: isCorrect ? "good" : "bad",
    text: isCorrect ? `Correct. "${item.word}" is back on track.` : `Best answer: "${item.choices[item.answer]}."`
  };

  if (isCorrect) {
    const dayQuiz = appState.progress.quiz[item.dayId];
    if (dayQuiz) {
      dayQuiz.mistakes = dayQuiz.mistakes.filter((word) => word !== item.word);
    }
    if (appState.progress.spelling[item.word]) {
      appState.progress.spelling[item.word].correct = true;
    }
    saveProgress();
  }

  renderReviewTab();
}

function finalizeDay(day) {
  const quizState = appState.progress.quiz[day.id] || { answers: {}, mistakes: [] };
  const answeredCount = Object.keys(quizState.answers).length;
  if (answeredCount < day.words.length) {
    appState.quizFeedback = {
      type: "bad",
      text: `There are still ${day.words.length - answeredCount} unanswered quiz items for this day.`
    };
    renderQuizTab(day);
    return;
  }

  appState.progress.completedDays[day.id] = true;
  saveProgress();
  appState.quizFeedback = {
    type: "good",
    text: `Day ${day.id} marked complete. Students can now move into spelling, sentence writing, and the review queue.`
  };
  renderQuizTab(day);
}

function buildReviewDeck() {
  const reviewWords = [];

  window.SAT_VOCAB_DATA.days.forEach((day) => {
    const mistakes = appState.progress.quiz[day.id] ? appState.progress.quiz[day.id].mistakes || [] : [];
    day.words.forEach((entry) => {
      const spellingWrong = appState.progress.spelling[entry.word] && appState.progress.spelling[entry.word].correct === false;
      if (mistakes.includes(entry.word) || spellingWrong) {
        reviewWords.push({ ...entry, dayId: day.id, dayTitle: day.title });
      }
    });
  });

  return reviewWords;
}

function renderFeedback(feedback) {
  if (!feedback) {
    return "";
  }
  return `<div class="feedback ${feedback.type}">${feedback.text}</div>`;
}

function renderWordWithPhonetic(entry, wordClass) {
  const phonetic = entry.phonetic ? escapeHtml(entry.phonetic) : "";
  return `
    <div class="word-with-phonetic ${wordClass}">
      <span class="word-text">${escapeHtml(entry.word)}</span>
      ${phonetic ? `<span class="phonetic">${phonetic}</span>` : ""}
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
