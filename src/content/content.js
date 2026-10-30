/**
 * SheetSpeed - Content Script (Gentle Mode Floating Widget)
 * Injected into web pages, encapsulated inside an isolated Shadow DOM.
 */

(function () {
  'use strict';

  if (document.getElementById('sheetspeed-root')) return;

  const DEFAULT_SETTINGS = {
    enabled: true,
    intervalSeconds: 5,
    clefMode: 'mixed', // 'treble' | 'bass' | 'mixed'
    seqLength: 3,
    isMuted: false,
    streak: 0,
    bestStreak: 0,
    totalAnswered: 0,
    totalCorrect: 0
  };

  let state = {
    settings: { ...DEFAULT_SETTINGS },
    currentSequence: null,
    userInputs: [],
    timerId: null,
    timeLeft: 5,
    isPaused: false,
    isMinimized: false,
    isAnswerRevealed: false
  };

  // Create Root & Shadow DOM
  const root = document.createElement('div');
  root.id = 'sheetspeed-root';
  document.body.appendChild(root);
  const shadow = root.attachShadow({ mode: 'open' });

  // Load Settings from chrome.storage
  function loadSettings(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(DEFAULT_SETTINGS, (stored) => {
        state.settings = { ...DEFAULT_SETTINGS, ...stored };
        if (window.AudioSynth) {
          window.AudioSynth.setMuted(state.settings.isMuted);
        }
        if (callback) callback();
      });
    } else {
      if (callback) callback();
    }
  }

  function saveSettings(updates) {
    state.settings = { ...state.settings, ...updates };
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(updates);
    }
  }

  // Setup Fonts
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    const fontBravuraUrl = chrome.runtime.getURL('lib/fonts/bravura.woff2');
    const fontAcademicoUrl = chrome.runtime.getURL('lib/fonts/academico.woff2');

    if (window.VexFlow && window.VexFlow.Font) {
      window.VexFlow.Font.HOST_URL = chrome.runtime.getURL('lib/fonts/');
    }

    if (!document.getElementById('sheetspeed-font-face')) {
      const fontStyle = document.createElement('style');
      fontStyle.id = 'sheetspeed-font-face';
      fontStyle.textContent = `
        @font-face {
          font-family: 'Bravura';
          src: url('${fontBravuraUrl}') format('woff2');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'Academico';
          src: url('${fontAcademicoUrl}') format('woff2');
          font-weight: normal;
          font-style: normal;
        }
      `;
      document.head.appendChild(fontStyle);
    }
  }

  // Shadow DOM Styles
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
    }

    .widget-bubble {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4), 0 2px 6px rgba(0,0,0,0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .widget-bubble:hover {
      transform: scale(1.08);
    }
    .widget-bubble .bubble-icon {
      font-size: 24px;
      color: #fff;
    }
    .widget-bubble svg.bubble-ring {
      position: absolute;
      top: -3px;
      left: -3px;
      width: 58px;
      height: 58px;
      transform: rotate(-90deg);
      pointer-events: none;
    }
    .widget-bubble circle {
      fill: none;
      stroke-width: 3;
      stroke-linecap: round;
    }
    .widget-bubble .ring-bg {
      stroke: rgba(255, 255, 255, 0.2);
    }
    .widget-bubble .ring-progress {
      stroke: #10b981;
      stroke-dasharray: 163;
      stroke-dashoffset: 0;
      transition: stroke-dashoffset 0.1s linear;
    }

    /* Main Card */
    .widget-card {
      width: 360px;
      background: rgba(24, 28, 38, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(0,0,0,0.2);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      color: #f1f5f9;
      font-family: inherit;
    }

    /* Top Progress Bar */
    .timer-bar-wrap {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      position: relative;
    }
    .timer-bar {
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #10b981, #6366f1);
      transition: width 0.1s linear;
    }
    .timer-bar.paused {
      background: #f59e0b;
    }

    /* Header */
    .card-header {
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      cursor: grab;
      background: rgba(255, 255, 255, 0.02);
    }
    .card-header:active {
      cursor: grabbing;
    }
    .brand-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.5px;
      color: #cbd5e1;
    }
    .clef-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.4);
    }
    .streak-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 7px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(245, 158, 11, 0.18);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .action-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      transition: background 0.15s, color 0.15s;
    }
    .action-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    /* Stave Score Canvas / SVG */
    .stave-wrapper {
      padding: 8px 12px 2px;
      background: #ffffff;
      margin: 10px 12px 6px;
      border-radius: 10px;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }
    .stave-wrapper svg {
      display: block;
      width: 100% !important;
      height: auto !important;
    }

    /* Input Progress Slots */
    .slots-container {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin: 6px 0 10px;
    }
    .note-slot {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      border: 2px dashed rgba(255, 255, 255, 0.2);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      color: #94a3b8;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      background: rgba(255, 255, 255, 0.03);
    }
    .note-slot.active {
      border-color: #6366f1;
      border-style: solid;
      background: rgba(99, 102, 241, 0.15);
      color: #fff;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
      transform: scale(1.05);
    }
    .note-slot.correct {
      border-color: #10b981;
      border-style: solid;
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
    }
    .note-slot.wrong {
      border-color: #ef4444;
      border-style: solid;
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      animation: slot-shake 0.3s ease;
    }
    .note-slot .slot-solfege {
      font-size: 9px;
      font-weight: 500;
      opacity: 0.8;
    }

    @keyframes slot-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    /* Virtual Keyboard */
    .keyboard-container {
      padding: 0 12px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .key-row {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 5px;
    }
    .note-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 7px 0;
      color: #f1f5f9;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: all 0.12s ease;
    }
    .note-btn:hover {
      background: rgba(99, 102, 241, 0.3);
      border-color: #6366f1;
      transform: translateY(-1px);
    }
    .note-btn:active {
      transform: translateY(1px);
      background: #6366f1;
    }
    .note-btn .btn-letter {
      font-weight: 700;
      font-size: 13px;
    }
    .note-btn .btn-solfege {
      font-size: 9px;
      color: #94a3b8;
    }

    .key-controls-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #64748b;
      padding-top: 2px;
    }
    .hint-text {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .hint-kbd {
      background: rgba(255, 255, 255, 0.1);
      padding: 1px 4px;
      border-radius: 4px;
      font-family: monospace;
      color: #cbd5e1;
    }
    .skip-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      transition: color 0.15s;
    }
    .skip-btn:hover {
      color: #e2e8f0;
      text-decoration: underline;
    }
  `;
  shadow.appendChild(style);

  // Widget Container
  const container = document.createElement('div');
  container.className = 'sheetspeed-container';
  shadow.appendChild(container);

  /**
   * Render the HTML structure
   */
  function buildWidgetDOM() {
    if (state.isMinimized) {
      container.innerHTML = `
        <div class="widget-bubble" id="btn-expand" title="SheetSpeed: Mở rộng">
          <svg class="bubble-ring">
            <circle class="ring-bg" cx="29" cy="29" r="26"></circle>
            <circle class="ring-progress" id="bubble-progress" cx="29" cy="29" r="26"></circle>
          </svg>
          <div class="bubble-icon">🎵</div>
        </div>
      `;
      shadow.getElementById('btn-expand').addEventListener('click', () => {
        state.isMinimized = false;
        buildWidgetDOM();
        renderStave();
      });
      return;
    }

    const clefLabel = state.currentSequence && state.currentSequence.clef === 'treble' 
      ? 'Khóa Sol 𝄞' 
      : 'Khóa Fa 𝄢';

    container.innerHTML = `
      <div class="widget-card" id="widget-card">
        <div class="timer-bar-wrap">
          <div class="timer-bar ${state.isPaused ? 'paused' : ''}" id="timer-bar"></div>
        </div>
        <div class="card-header" id="card-header">
          <div class="brand-title">
            <span class="clef-badge" id="clef-badge">${clefLabel}</span>
            <span class="streak-badge" title="Chuỗi đúng liên tiếp">🔥 <span id="streak-count">${state.settings.streak || 0}</span></span>
          </div>
          <div class="header-actions">
            <button class="action-btn" id="btn-pause" title="${state.isPaused ? 'Tiếp tục' : 'Tạm dừng'}">
              ${state.isPaused ? '▶' : '⏸'}
            </button>
            <button class="action-btn" id="btn-sound" title="${state.settings.isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}">
              ${state.settings.isMuted ? '🔇' : '🔊'}
            </button>
            <button class="action-btn" id="btn-minimize" title="Thu nhỏ">−</button>
            <button class="action-btn" id="btn-close" title="Ẩn">✕</button>
          </div>
        </div>

        <div class="stave-wrapper" id="stave-container"></div>

        <div class="slots-container" id="slots-container"></div>

        <div class="keyboard-container">
          <div class="key-row">
            <button class="note-btn" data-key="C"><span class="btn-letter">C</span><span class="btn-solfege">Đô</span></button>
            <button class="note-btn" data-key="D"><span class="btn-letter">D</span><span class="btn-solfege">Rê</span></button>
            <button class="note-btn" data-key="E"><span class="btn-letter">E</span><span class="btn-solfege">Mi</span></button>
            <button class="note-btn" data-key="F"><span class="btn-letter">F</span><span class="btn-solfege">Fa</span></button>
            <button class="note-btn" data-key="G"><span class="btn-letter">G</span><span class="btn-solfege">Sol</span></button>
            <button class="note-btn" data-key="A"><span class="btn-letter">A</span><span class="btn-solfege">La</span></button>
            <button class="note-btn" data-key="B"><span class="btn-letter">B</span><span class="btn-solfege">Si</span></button>
          </div>
          <div class="key-controls-row">
            <div class="hint-text">Gõ phím <span class="hint-kbd">C</span> <span class="hint-kbd">D</span> <span class="hint-kbd">E</span>...</div>
            <button class="skip-btn" id="btn-skip">Bỏ qua ⏭</button>
          </div>
        </div>
      </div>
    `;

    setupCardEventListeners();
  }

  /**
   * Set up event listeners inside the Card
   */
  function setupCardEventListeners() {
    const btnPause = shadow.getElementById('btn-pause');
    const btnSound = shadow.getElementById('btn-sound');
    const btnMinimize = shadow.getElementById('btn-minimize');
    const btnClose = shadow.getElementById('btn-close');
    const btnSkip = shadow.getElementById('btn-skip');

    if (btnPause) {
      btnPause.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePause();
      });
    }

    if (btnSound) {
      btnSound.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSound();
      });
    }

    if (btnMinimize) {
      btnMinimize.addEventListener('click', (e) => {
        e.stopPropagation();
        state.isMinimized = true;
        buildWidgetDOM();
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        saveSettings({ enabled: false });
        root.style.display = 'none';
      });
    }

    if (btnSkip) {
      btnSkip.addEventListener('click', (e) => {
        e.stopPropagation();
        nextQuestion();
      });
    }

    // Keyboard buttons
    const noteButtons = shadow.querySelectorAll('.note-btn');
    noteButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const letter = btn.getAttribute('data-key');
        handleNoteInput(letter);
      });
    });

    // Make Card Draggable
    setupDraggable();
  }

  /**
   * Draggable logic
   */
  function setupDraggable() {
    const header = shadow.getElementById('card-header');
    if (!header) return;

    let isDragging = false;
    let startX = 0, startY = 0;
    let initialRight = 24, initialBottom = 24;

    header.addEventListener('mousedown', (e) => {
      // Don't drag if clicking buttons
      if (e.target.closest('button')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = root.getBoundingClientRect();
      initialRight = window.innerWidth - rect.right;
      initialBottom = window.innerHeight - rect.bottom;

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        const newRight = Math.max(10, Math.min(window.innerWidth - 380, initialRight - dx));
        const newBottom = Math.max(10, Math.min(window.innerHeight - 250, initialBottom - dy));

        root.style.right = `${newRight}px`;
        root.style.bottom = `${newBottom}px`;
      };

      const onMouseUp = () => {
        isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  /**
   * Render the VexFlow Sheet Music Stave
   */
  function renderStave() {
    const containerElem = shadow.getElementById('stave-container');
    if (!containerElem || !state.currentSequence || !window.VexFlow) return;

    containerElem.innerHTML = ''; // Clear previous

    const clef = state.currentSequence.clef;
    const notesData = state.currentSequence.notes;
    const width = 330;
    const height = 120;

    const renderer = new VexFlow.Renderer(containerElem, VexFlow.Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();
    context.setFont('Arial', 10, '').setBackgroundFillStyle('#ffffff');

    const stave = new VexFlow.Stave(5, 5, width - 10);
    stave.addClef(clef);
    stave.setContext(context).draw();

    const staveNotes = notesData.map((n, i) => {
      const note = new VexFlow.StaveNote({
        clef: clef,
        keys: [n.key],
        duration: n.duration
      });

      // Highlight logic
      if (i < state.userInputs.length) {
        if (state.userInputs[i] === n.letter) {
          note.setStyle({ fillStyle: '#10b981', strokeStyle: '#10b981' }); // Green for correct
        } else {
          note.setStyle({ fillStyle: '#ef4444', strokeStyle: '#ef4444' }); // Red for wrong
        }
      } else if (state.isAnswerRevealed) {
        note.setStyle({ fillStyle: '#f59e0b', strokeStyle: '#f59e0b' }); // Orange for revealed
      }

      return note;
    });

    const voice = new VexFlow.Voice({ num_beats: notesData.length, beat_value: 4 });
    voice.setStrict(false);
    voice.addTickables(staveNotes);

    new VexFlow.Formatter().joinVoices([voice]).format([voice], width - 90);
    voice.draw(context, stave);

    renderSlots();
  }

  /**
   * Render Input Progress Slots
   */
  function renderSlots() {
    const slotsWrap = shadow.getElementById('slots-container');
    if (!slotsWrap || !state.currentSequence) return;

    slotsWrap.innerHTML = '';
    const notes = state.currentSequence.notes;

    notes.forEach((note, idx) => {
      const slot = document.createElement('div');
      slot.className = 'note-slot';

      if (idx === state.userInputs.length && !state.isAnswerRevealed) {
        slot.classList.add('active');
        slot.innerHTML = `<span class="slot-letter">?</span>`;
      } else if (idx < state.userInputs.length) {
        const isCorrect = state.userInputs[idx] === note.letter;
        slot.classList.add(isCorrect ? 'correct' : 'wrong');
        slot.innerHTML = `
          <span class="slot-letter">${state.userInputs[idx]}</span>
          <span class="slot-solfege">${MusicEngine.NOTE_META[state.userInputs[idx].toLowerCase()].solfege}</span>
        `;
      } else if (state.isAnswerRevealed) {
        slot.classList.add('wrong');
        slot.innerHTML = `
          <span class="slot-letter">${note.letter}</span>
          <span class="slot-solfege">${note.solfege}</span>
        `;
      } else {
        slot.innerHTML = `<span class="slot-letter">_</span>`;
      }

      slotsWrap.appendChild(slot);
    });
  }

  /**
   * Handle user input letter (e.g. 'C', 'E')
   */
  function handleNoteInput(letter) {
    if (!state.currentSequence || state.isAnswerRevealed) return;
    letter = letter.toUpperCase();
    if (!'CDEFGAB'.includes(letter)) return;

    const targetLetters = state.currentSequence.targetLetters;
    const currentIndex = state.userInputs.length;
    if (currentIndex >= targetLetters.length) return;

    const expectedLetter = targetLetters[currentIndex];
    const currentNote = state.currentSequence.notes[currentIndex];

    if (letter === expectedLetter) {
      // Correct note entered!
      state.userInputs.push(letter);
      if (window.AudioSynth) {
        window.AudioSynth.playNote(currentNote.frequency, 0.4);
      }
      renderStave();

      // Check if sequence completed
      if (state.userInputs.length === targetLetters.length) {
        handleSequenceSuccess();
      }
    } else {
      // Wrong note
      if (window.AudioSynth) {
        window.AudioSynth.playSoftMiss();
      }
      state.userInputs.push(letter);
      renderStave();

      // Reset streak and reveal answer gently
      const newStreak = 0;
      saveSettings({
        streak: newStreak,
        totalAnswered: (state.settings.totalAnswered || 0) + 1
      });
      updateStreakUI();

      state.isAnswerRevealed = true;
      setTimeout(() => {
        nextQuestion();
      }, 1200);
    }
  }

  /**
   * When entire sequence is successfully entered
   */
  function handleSequenceSuccess() {
    if (window.AudioSynth) {
      window.AudioSynth.playSuccess();
    }

    const newStreak = (state.settings.streak || 0) + 1;
    const bestStreak = Math.max(state.settings.bestStreak || 0, newStreak);
    const totalAnswered = (state.settings.totalAnswered || 0) + 1;
    const totalCorrect = (state.settings.totalCorrect || 0) + 1;

    saveSettings({
      streak: newStreak,
      bestStreak: bestStreak,
      totalAnswered: totalAnswered,
      totalCorrect: totalCorrect
    });
    updateStreakUI();

    // Gentle short pause before next question
    setTimeout(() => {
      nextQuestion();
    }, 800);
  }

  function updateStreakUI() {
    const count = shadow.getElementById('streak-count');
    if (count) count.textContent = state.settings.streak || 0;
  }

  /**
   * Next Question Generator
   */
  function nextQuestion() {
    if (!window.MusicEngine) return;
    state.currentSequence = MusicEngine.generateSequence(
      state.settings.clefMode,
      state.settings.seqLength || 3
    );
    state.userInputs = [];
    state.isAnswerRevealed = false;
    resetTimer();

    if (!state.isMinimized) {
      const badge = shadow.getElementById('clef-badge');
      if (badge) {
        badge.textContent = state.currentSequence.clef === 'treble' 
          ? 'Khóa Sol 𝄞' 
          : 'Khóa Fa 𝄢';
      }
      renderStave();
    }
  }

  /**
   * 5s Timer Countdown logic (Gentle Mode)
   */
  function startTimer() {
    clearInterval(state.timerId);
    const intervalSec = state.settings.intervalSeconds || 5;
    const stepMs = 100;
    const totalSteps = (intervalSec * 1000) / stepMs;
    let currentStep = totalSteps;

    state.timerId = setInterval(() => {
      if (state.isPaused) return;

      currentStep--;
      const percentage = (currentStep / totalSteps) * 100;

      // Update Card Timer Bar
      const timerBar = shadow.getElementById('timer-bar');
      if (timerBar) {
        timerBar.style.width = `${Math.max(0, percentage)}%`;
      }

      // Update Bubble Progress Ring (if minimized)
      const ring = shadow.getElementById('bubble-progress');
      if (ring) {
        const circumference = 2 * Math.PI * 26; // ~163
        const offset = circumference - (percentage / 100) * circumference;
        ring.style.strokeDashoffset = offset;
      }

      if (currentStep <= 0) {
        // 5s timeout reached!
        // Gentle Mode: If user didn't finish, quietly advance or softly reveal
        if (state.userInputs.length === 0) {
          // User was just reading, silently generate new note sequence
          nextQuestion();
        } else {
          // User started typing but timed out: softly reveal answer and advance
          state.isAnswerRevealed = true;
          renderStave();
          setTimeout(() => {
            nextQuestion();
          }, 1000);
        }
      }
    }, stepMs);
  }

  function resetTimer() {
    startTimer();
  }

  function togglePause() {
    state.isPaused = !state.isPaused;
    const btn = shadow.getElementById('btn-pause');
    if (btn) btn.textContent = state.isPaused ? '▶' : '⏸';
    const timerBar = shadow.getElementById('timer-bar');
    if (timerBar) timerBar.classList.toggle('paused', state.isPaused);
  }

  function toggleSound() {
    const isMuted = !state.settings.isMuted;
    saveSettings({ isMuted });
    if (window.AudioSynth) {
      window.AudioSynth.setMuted(isMuted);
    }
    const btn = shadow.getElementById('btn-sound');
    if (btn) btn.textContent = isMuted ? '🔇' : '🔊';
  }

  /**
   * Global Keyboard Listener
   */
  window.addEventListener('keydown', (e) => {
    // Only capture if user is not typing in an input/textarea/contenteditable
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
      return;
    }

    const key = e.key.toUpperCase();
    if ('CDEFGAB'.includes(key) && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      handleNoteInput(key);
    }
  });

  // Listen for storage changes from Popup
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes) => {
      let shouldRefresh = false;
      for (const [key, val] of Object.entries(changes)) {
        state.settings[key] = val.newValue;
        if (key === 'clefMode' || key === 'seqLength') {
          shouldRefresh = true;
        }
        if (key === 'isMuted' && window.AudioSynth) {
          window.AudioSynth.setMuted(val.newValue);
        }
        if (key === 'enabled') {
          root.style.display = val.newValue ? 'block' : 'none';
        }
      }
      if (shouldRefresh) {
        nextQuestion();
      }
    });
  }

  // Initialize
  async function init() {
    if (window.VexFlow) {
      if (window.VexFlow.Font && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        window.VexFlow.Font.HOST_URL = chrome.runtime.getURL('lib/fonts/');
      }
      try {
        if (VexFlow.loadFonts) {
          await VexFlow.loadFonts('Bravura', 'Academico');
        }
        if (VexFlow.setFonts) {
          VexFlow.setFonts('Bravura', 'Academico');
        }
      } catch (err) {
        console.warn('VexFlow font note:', err);
      }
    }

    loadSettings(() => {
      if (!state.settings.enabled) {
        root.style.display = 'none';
      }
      buildWidgetDOM();
      nextQuestion();
    });
  }

  init();

})();
