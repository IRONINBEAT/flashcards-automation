(() => {
  // ---- State ----
  const state = {
    mode: 'modules',      // 'modules' | 'blind'
    selectedModule: 'all', // 'all' | 1 | 2 | 3
    order: 'sequential',   // 'sequential' | 'random'
    deck: [],
    currentIndex: 0,
    isFlipped: false,
  };

  // ---- DOM refs ----
  const $ = id => document.getElementById(id);
  const mainScreen = $('main-screen');
  const cardScreen = $('card-screen');
  const doneScreen = $('done-screen');
  const settingsPanel = $('settings-panel');
  const flashcard = $('flashcard');

  // ---- Init ----
  function init() {
    updateModuleCounts();
    bindEvents();
  }

  function updateModuleCounts() {
    [1, 2, 3].forEach(m => {
      const count = QUESTIONS.filter(q => q.module === m).length;
      const el = $(`count-${m}`);
      if (el) el.textContent = `${count} вопрос${pluralRu(count)}`;
    });
    const total = $('stat-total');
    if (total) total.textContent = QUESTIONS.length;
  }

  function pluralRu(n) {
    if (n % 10 === 1 && n % 100 !== 11) return '';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'а';
    return 'ов';
  }

  // ---- Events ----
  function bindEvents() {
    // Settings panel
    $('btn-settings').addEventListener('click', () => settingsPanel.classList.remove('hidden'));
    $('settings-overlay').addEventListener('click', () => settingsPanel.classList.add('hidden'));

    // Mode toggle in settings
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode;
        $('module-selector-group').style.display = state.mode === 'blind' ? 'none' : '';
      });
    });

    // Module selection in settings
    document.querySelectorAll('.module-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.module-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedModule = btn.dataset.module === 'all' ? 'all' : parseInt(btn.dataset.module);
      });
    });

    // Order toggle in settings
    document.querySelectorAll('[data-order]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-order]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.order = btn.dataset.order;
      });
    });

    // Start from settings
    $('btn-start').addEventListener('click', () => {
      settingsPanel.classList.add('hidden');
      startDeck();
    });

    // Welcome screen buttons
    $('btn-all-cards').addEventListener('click', () => {
      state.mode = 'modules';
      state.selectedModule = 'all';
      state.order = 'sequential';
      startDeck();
    });
    $('btn-blind-mode').addEventListener('click', () => {
      state.mode = 'blind';
      state.selectedModule = 'all';
      state.order = 'random';
      startDeck();
    });

    // Module preview cards
    document.querySelectorAll('.module-preview, .btn-start-module').forEach(el => {
      el.addEventListener('click', (e) => {
        const preview = el.closest('.module-preview') || el.parentElement;
        const mod = parseInt(preview.dataset.startModule);
        state.mode = 'modules';
        state.selectedModule = mod;
        state.order = 'sequential';
        startDeck();
        e.stopPropagation();
      });
    });

    // Card navigation
    $('btn-back').addEventListener('click', goHome);
    $('btn-prev').addEventListener('click', prevCard);
    $('btn-next').addEventListener('click', nextCard);
    $('btn-flip').addEventListener('click', flipCard);
    flashcard.addEventListener('click', flipCard);
    $('btn-shuffle-inline').addEventListener('click', shuffleDeck);
    $('btn-restart').addEventListener('click', restartDeck);

    // Done screen
    $('btn-restart-done').addEventListener('click', restartDeck);
    $('btn-home').addEventListener('click', goHome);

    // Keyboard
    document.addEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (cardScreen.classList.contains('hidden')) return;
    if (e.key === 'ArrowRight' || e.key === 'l') nextCard();
    if (e.key === 'ArrowLeft' || e.key === 'h') prevCard();
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
    if (e.key === 'Escape') goHome();
  }

  // ---- Deck management ----
  function buildDeck() {
    let questions = QUESTIONS.slice();
    if (state.selectedModule !== 'all') {
      questions = questions.filter(q => q.module === state.selectedModule);
    }
    if (state.order === 'random') {
      questions = shuffle(questions);
    }
    return questions;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function startDeck() {
    state.deck = buildDeck();
    state.currentIndex = 0;
    state.isFlipped = false;
    showScreen('card');
    renderCard();
  }

  function restartDeck() {
    state.currentIndex = 0;
    state.isFlipped = false;
    showScreen('card');
    renderCard();
  }

  function shuffleDeck() {
    state.deck = shuffle(state.deck);
    state.currentIndex = 0;
    state.isFlipped = false;
    renderCard();
  }

  // ---- Navigation ----
  function prevCard() {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      state.isFlipped = false;
      renderCard();
    }
  }

  function nextCard() {
    if (state.currentIndex < state.deck.length - 1) {
      state.currentIndex++;
      state.isFlipped = false;
      renderCard();
    } else {
      showScreen('done');
    }
  }

  function flipCard() {
    state.isFlipped = !state.isFlipped;
    flashcard.classList.toggle('flipped', state.isFlipped);
    const btn = $('btn-flip');
    btn.textContent = state.isFlipped ? 'Скрыть ответ' : 'Показать ответ';
    btn.classList.toggle('flipped', state.isFlipped);
  }

  // ---- Rendering ----
  function renderCard() {
    const q = state.deck[state.currentIndex];
    if (!q) return;

    // Progress
    const progress = ((state.currentIndex + 1) / state.deck.length) * 100;
    $('progress-fill').style.width = `${progress}%`;

    // Counter
    $('card-current').textContent = state.currentIndex + 1;
    $('card-total').textContent = state.deck.length;

    // Mode badge
    const badge = $('card-mode-badge');
    if (state.mode === 'blind') {
      badge.textContent = 'Слепой режим';
      badge.classList.remove('hidden');
    } else if (state.selectedModule !== 'all') {
      badge.textContent = `Модуль ${state.selectedModule}`;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    // Module tag
    const tag = $('card-module-tag');
    const tagBack = $('card-module-tag-back');
    if (state.mode === 'blind') {
      tag.classList.add('hidden-tag');
      tagBack.classList.add('hidden-tag');
    } else {
      tag.classList.remove('hidden-tag');
      tagBack.classList.remove('hidden-tag');
      const tagText = `Модуль ${q.module} · ${q.moduleName}`;
      tag.textContent = tagText;
      tagBack.textContent = tagText;
    }

    // Question
    $('card-question').textContent = q.question;
    $('card-question-back').textContent = q.question;

    // Options (front)
    const optionsEl = $('card-options');
    optionsEl.innerHTML = '';

    if (q.type === 'special') {
      // Show extra lines (matching items)
      if (q.extraLines && q.extraLines.length > 0) {
        const extraDiv = document.createElement('div');
        extraDiv.className = 'card-extra-lines';
        q.extraLines.forEach(line => {
          const d = document.createElement('div');
          d.className = 'extra-line';
          d.textContent = line;
          extraDiv.appendChild(d);
        });
        optionsEl.appendChild(extraDiv);
      }
      // Show options if any
      if (q.options && q.options.length > 0) {
        q.options.forEach(opt => {
          const d = document.createElement('div');
          d.className = 'option-item';
          d.textContent = opt.text;
          optionsEl.appendChild(d);
        });
      }
    } else {
      q.options.forEach(opt => {
        const d = document.createElement('div');
        d.className = 'option-item';
        d.textContent = opt.text;
        optionsEl.appendChild(d);
      });
    }

    // Answers (back)
    const answersEl = $('card-answers');
    answersEl.innerHTML = '';

    if (q.type === 'special' && q.correctAnswer) {
      const d = document.createElement('div');
      d.className = 'answer-item special-answer';
      d.textContent = q.correctAnswer;
      answersEl.appendChild(d);
    } else {
      const correctOpts = q.options.filter(o => o.correct);
      correctOpts.forEach(opt => {
        const d = document.createElement('div');
        d.className = 'answer-item';
        d.textContent = opt.text;
        answersEl.appendChild(d);
      });
    }

    // Reset flip state
    flashcard.classList.toggle('flipped', state.isFlipped);
    const btn = $('btn-flip');
    btn.textContent = state.isFlipped ? 'Скрыть ответ' : 'Показать ответ';
    btn.classList.toggle('flipped', state.isFlipped);

    // Nav buttons
    $('btn-prev').disabled = state.currentIndex === 0;
    $('btn-next').disabled = false;
    if (state.currentIndex === state.deck.length - 1) {
      $('btn-next').textContent = 'Завершить →';
    } else {
      $('btn-next').textContent = 'След. →';
    }
  }

  // ---- Screens ----
  function showScreen(name) {
    mainScreen.classList.toggle('hidden', name !== 'main');
    cardScreen.classList.toggle('hidden', name !== 'card');
    doneScreen.classList.toggle('hidden', name !== 'done');

    if (name === 'done') {
      const modName = state.selectedModule === 'all'
        ? 'все модули'
        : `Модуль ${state.selectedModule}`;
      $('done-subtitle').textContent =
        `${state.deck.length} карточек · ${modName}`;
    }
  }

  function goHome() {
    state.isFlipped = false;
    flashcard.classList.remove('flipped');
    showScreen('main');
  }

  init();
})();
