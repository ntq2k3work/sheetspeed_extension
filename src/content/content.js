/**
 * SheetSpeed - Content Script 2.0 (Gentle Mode Floating Widget)
 * Encapsulated inside an isolated Shadow DOM.
 * Features:
 * - Web MIDI Controller Integration (USB Piano/Keyboard input)
 * - Accidentals (♯ / ♭) with piano keyboard (White & Black keys)
 * - RPG Mode & Combo Fever lighting
 * - Spaced Repetition (recording stats per note key)
 */

(function () {
  'use strict';

  if (document.getElementById('sheetspeed-root')) return;

  const DEFAULT_SETTINGS = {
    enabled: true,
    intervalSeconds: 5,
    clefMode: 'mixed', // 'treble' | 'bass' | 'mixed'
    seqLength: 3,
    drillMode: 'notes', // 'notes' | 'chords'
    allowAccidentals: false,
    gameMode: 'custom', // 'custom' | 'rpg'
    xp: 0,
    isMuted: false,
    streak: 0,
    bestStreak: 0,
    totalAnswered: 0,
    totalCorrect: 0,
    sprintBestScore: 0,
    sprintBestSpeed: '0.00',
    noteStats: {} // { 'c/4': { correct: 10, total: 12 }, ... }
  };

  let state = {
    settings: { ...DEFAULT_SETTINGS },
    currentSequence: null,
    userInputs: [],
    timerId: null,
    isPaused: false,
    isMinimized: false,
    isAnswerRevealed: false,
    isFever: false,
    midiDeviceName: '',
    isMidiConnected: false
  };

  // Create Root & Shadow DOM
  const root = document.createElement('div');
  root.id = 'sheetspeed-root';
  document.body.appendChild(root);
  const shadow = root.attachShadow({ mode: 'open' });

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
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.45), 0 2px 6px rgba(0,0,0,0.2);
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
      width: 60px;
      height: 60px;
      transform: rotate(-90deg);
      pointer-events: none;
    }
    .widget-bubble circle {
      fill: none;
      stroke-width: 3.5;
      stroke-linecap: round;
    }
    .widget-bubble .ring-bg {
      stroke: rgba(255, 255, 255, 0.2);
    }
    .widget-bubble .ring-progress {
      stroke: #10b981;
      stroke-dasharray: 169;
      stroke-dashoffset: 0;
      transition: stroke-dashoffset 0.1s linear;
    }

    /* Main Card */
    .widget-card {
      width: 380px;
      background: rgba(24, 28, 38, 0.96);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0,0,0,0.2);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
    }

    /* Fever Glow Effect */
    .widget-card.fever-mode {
      border-color: #f59e0b;
      box-shadow: 0 0 25px rgba(245, 158, 11, 0.45), 0 16px 36px rgba(0,0,0,0.4);
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
    .timer-bar.fever {
      background: linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6);
    }

    /* Header */
    .card-header {
      padding: 9px 12px;
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
    .brand-meta-row {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
    }
    .clef-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      border-radius: 8px;
      font-weight: 600;
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.4);
    }
    .rpg-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 6px;
      border-radius: 8px;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.18);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .streak-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 6px;
      border-radius: 8px;
      font-weight: 700;
      background: rgba(245, 158, 11, 0.18);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .midi-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 5px;
      border-radius: 8px;
      font-size: 10px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .action-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      width: 22px;
      height: 22px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      transition: background 0.15s, color 0.15s;
    }
    .action-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    /* Stave Wrapper */
    .stave-wrapper {
      padding: 6px 10px 2px;
      background: #ffffff;
      margin: 8px 12px 6px;
      border-radius: 10px;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.12);
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .stave-wrapper svg {
      display: block;
      width: 100% !important;
      height: auto !important;
    }

    /* Slots */
    .slots-container {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin: 4px 0 8px;
    }
    .note-slot {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 2px dashed rgba(255, 255, 255, 0.2);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.03);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .note-slot.active {
      border-color: #6366f1;
      border-style: solid;
      background: rgba(99, 102, 241, 0.2);
      color: #fff;
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
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
    }
    .note-slot.revealed {
      border-color: #f59e0b;
      border-style: solid;
      background: rgba(245, 158, 11, 0.25);
      color: #fbbf24;
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.35);
    }
    .note-slot .slot-solfege {
      font-size: 8px;
      font-weight: 500;
      opacity: 0.8;
    }

    /* Piano Keyboard (White + Black Keys) */
    .piano-wrapper {
      padding: 0 12px 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .piano-keys-layout {
      position: relative;
      display: flex;
      height: 52px;
      background: rgba(0,0,0,0.3);
      border-radius: 8px;
      padding: 2px;
    }
    /* White keys */
    .white-keys {
      display: flex;
      width: 100%;
      gap: 2px;
    }
    .p-key-white {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      padding-bottom: 4px;
      cursor: pointer;
      color: #1e293b;
      font-weight: 700;
      font-size: 11px;
      transition: background 0.1s, transform 0.08s;
      position: relative;
      z-index: 1;
    }
    .p-key-white:hover {
      background: #e2e8f0;
    }
    .p-key-white:active {
      background: #93c5fd;
      transform: translateY(1px);
    }
    .p-key-white small {
      font-size: 8px;
      color: #64748b;
      font-weight: 500;
    }

    /* Black keys container */
    .black-keys {
      position: absolute;
      top: 2px;
      left: 2px;
      right: 2px;
      height: 32px;
      pointer-events: none;
      display: flex;
      z-index: 2;
    }
    .p-key-black {
      pointer-events: auto;
      position: absolute;
      width: 10.5%;
      height: 100%;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 0 0 3px 3px;
      color: #f8fafc;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      padding-bottom: 2px;
      font-size: 8px;
      font-weight: 700;
      line-height: 1.1;
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
      transition: background 0.1s, transform 0.08s;
    }
    .p-key-black small {
      font-size: 6px;
      font-weight: 500;
      opacity: 0.75;
      color: #94a3b8;
    }
    .p-key-black:hover {
      background: #334155;
    }
    .p-key-black:active {
      background: #6366f1;
      transform: translateY(1px);
    }
    /* Black keys positions */
    .p-key-black[data-key="C#"] { left: 9.5%; }
    .p-key-black[data-key="D#"] { left: 23.5%; }
    .p-key-black[data-key="F#"] { left: 52%; }
    .p-key-black[data-key="G#"] { left: 66%; }
    .p-key-black[data-key="A#"] { left: 80%; }

    .bottom-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #64748b;
      padding: 0 2px;
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
      padding: 2px 4px;
      border-radius: 4px;
    }
    .skip-btn:hover {
      color: #e2e8f0;
      text-decoration: underline;
    }
  `;
  shadow.appendChild(style);

  const container = document.createElement('div');
  container.className = 'sheetspeed-container';
  shadow.appendChild(container);

  function buildWidgetDOM() {
    if (state.isMinimized) {
      container.innerHTML = `
        <div class="widget-bubble" id="btn-expand" title="SheetSpeed: Mở rộng">
          <svg class="bubble-ring">
            <circle class="ring-bg" cx="30" cy="30" r="27"></circle>
            <circle class="ring-progress" id="bubble-progress" cx="30" cy="30" r="27"></circle>
          </svg>
          <div class="bubble-icon">
            <img src="${chrome.runtime ? chrome.runtime.getURL('icons/icon48.png') : ''}" style="width:26px;height:26px;border-radius:50%;object-fit:contain;display:block;" alt="NoteGuitar">
          </div>
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

    const rpgInfo = MusicEngine.getRpgLevel(state.settings.xp || 0);
    const isRpgMode = state.settings.gameMode === 'rpg';

    container.innerHTML = `
      <div class="widget-card ${state.isFever ? 'fever-mode' : ''}" id="widget-card">
        <div class="timer-bar-wrap">
          <div class="timer-bar ${state.isPaused ? 'paused' : ''} ${state.isFever ? 'fever' : ''}" id="timer-bar"></div>
        </div>
        <div class="card-header" id="card-header">
          <div class="brand-meta-row">
            <span class="clef-badge" id="clef-badge">
              <img src="${chrome.runtime ? chrome.runtime.getURL('icons/icon16.png') : ''}" style="width:13px;height:13px;border-radius:3px;object-fit:contain;margin-right:4px;" alt="logo">
              ${clefLabel}
            </span>
            ${state.currentSequence && state.currentSequence.type === 'chord' ? `<span class="rpg-badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border-color: rgba(245, 158, 11, 0.4);" title="${state.currentSequence.chordFullName}">🎼 ${state.currentSequence.chordName}</span>` : ''}
            ${isRpgMode ? `<span class="rpg-badge" title="Cấp độ RPG: ${rpgInfo.current.title}">Lv.${rpgInfo.current.level}</span>` : ''}
            <span class="streak-badge" title="Chuỗi đúng">🔥 <span id="streak-count">${state.settings.streak || 0}</span></span>
            ${state.isMidiConnected ? `<span class="midi-badge" title="Đã kết nối: ${state.midiDeviceName}">🎹 MIDI</span>` : ''}
          </div>
          <div class="header-actions">
            <button class="action-btn" id="btn-pause" title="${state.isPaused ? 'Tiếp tục' : 'Tạm dừng'}">
              ${state.isPaused ? '▶' : '⏸'}
            </button>
            <button class="action-btn" id="btn-sound" title="${state.settings.isMuted ? 'Bật âm' : 'Tắt âm'}">
              ${state.settings.isMuted ? '🔇' : '🔊'}
            </button>
            <button class="action-btn" id="btn-minimize" title="Thu nhỏ">−</button>
            <button class="action-btn" id="btn-close" title="Ẩn">✕</button>
          </div>
        </div>

        <div class="stave-wrapper" id="stave-container"></div>

        <div class="slots-container" id="slots-container"></div>

        <div class="piano-wrapper">
          <div class="piano-keys-layout">
            <!-- White Keys -->
            <div class="white-keys">
              <button class="p-key-white" data-key="C">C <small>Đô</small></button>
              <button class="p-key-white" data-key="D">D <small>Rê</small></button>
              <button class="p-key-white" data-key="E">E <small>Mi</small></button>
              <button class="p-key-white" data-key="F">F <small>Fa</small></button>
              <button class="p-key-white" data-key="G">G <small>Sol</small></button>
              <button class="p-key-white" data-key="A">A <small>La</small></button>
              <button class="p-key-white" data-key="B">B <small>Si</small></button>
            </div>
            <!-- Black Keys (Accidentals) -->
            <div class="black-keys">
              <button class="p-key-black" data-key="C#">C#<small>D♭</small></button>
              <button class="p-key-black" data-key="D#">D#<small>E♭</small></button>
              <button class="p-key-black" data-key="F#">F#<small>G♭</small></button>
              <button class="p-key-black" data-key="G#">G#<small>A♭</small></button>
              <button class="p-key-black" data-key="A#">A#<small>B♭</small></button>
            </div>
          </div>
          <div class="bottom-info-row">
            <div class="hint-text">Bàn phím <span class="hint-kbd">C</span><span class="hint-kbd">#</span> hoặc phím <span class="hint-kbd">🎹 Đàn</span></div>
            <button class="skip-btn" id="btn-skip">Bỏ qua ⏭</button>
          </div>
        </div>
      </div>
    `;

    setupCardEventListeners();
  }

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

    // Keyboard Buttons (White & Black)
    const allKeys = shadow.querySelectorAll('.p-key-white, .p-key-black');
    allKeys.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const letter = btn.getAttribute('data-key');
        handleNoteInput(letter);
      });
    });

    setupDraggable();
  }

  function setupDraggable() {
    const header = shadow.getElementById('card-header');
    if (!header) return;

    let isDragging = false;
    let startX = 0, startY = 0;
    let initialRight = 24, initialBottom = 24;

    header.addEventListener('mousedown', (e) => {
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

        const newRight = Math.max(10, Math.min(window.innerWidth - 400, initialRight - dx));
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

  function renderStave() {
    const containerElem = shadow.getElementById('stave-container');
    if (!containerElem || !state.currentSequence || !window.VexFlow) return;

    containerElem.innerHTML = '';

    const clef = state.currentSequence.clef;
    const notesData = state.currentSequence.notes;
    const width = 350;
    const height = 115;

    const renderer = new VexFlow.Renderer(containerElem, VexFlow.Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();
    context.setFont('Arial', 10, '').setBackgroundFillStyle('#ffffff');

    const stave = new VexFlow.Stave(5, 5, width - 10);
    stave.addClef(clef);
    stave.setContext(context).draw();

    if (state.currentSequence.type === 'chord') {
      // Render Single Stacked Chord
      const chordNote = new VexFlow.StaveNote({
        clef: clef,
        keys: state.currentSequence.keys,
        duration: 'w'
      });

      // Add accidentals (sharps # and flats b) to chord keys if present
      state.currentSequence.keys.forEach((k, idx) => {
        const step = k.split('/')[0];
        if (step.includes('#')) {
          chordNote.addModifier(new VexFlow.Accidental('#'), idx);
        } else if (step.length > 1 && step.endsWith('b')) {
          chordNote.addModifier(new VexFlow.Accidental('b'), idx);
        }
      });

      // Highlight logic
      if (state.userInputs.length === state.currentSequence.targetLetters.length) {
        chordNote.setStyle({ fillStyle: '#10b981', strokeStyle: '#10b981' });
      } else if (state.isAnswerRevealed) {
        chordNote.setStyle({ fillStyle: '#f59e0b', strokeStyle: '#f59e0b' });
      }

      const voice = new VexFlow.Voice({ num_beats: 4, beat_value: 4 });
      voice.setStrict(false);
      voice.addTickables([chordNote]);

      new VexFlow.Formatter().joinVoices([voice]).format([voice], width - 120);
      voice.draw(context, stave);
    } else {
      // Render Note Sequence
      const staveNotes = notesData.map((n, i) => {
        const note = new VexFlow.StaveNote({
          clef: clef,
          keys: [n.key],
          duration: n.duration
        });

        if (n.accidental) {
          note.addModifier(new VexFlow.Accidental(n.accidental), 0);
        }

        if (state.isAnswerRevealed) {
          if (i < state.userInputs.length && MusicEngine.matchInput(state.userInputs[i], n)) {
            note.setStyle({ fillStyle: '#10b981', strokeStyle: '#10b981' });
          } else {
            note.setStyle({ fillStyle: '#f59e0b', strokeStyle: '#f59e0b' });
          }
        } else if (i < state.userInputs.length) {
          if (MusicEngine.matchInput(state.userInputs[i], n)) {
            note.setStyle({ fillStyle: '#10b981', strokeStyle: '#10b981' });
          } else {
            note.setStyle({ fillStyle: '#ef4444', strokeStyle: '#ef4444' });
          }
        }

        return note;
      });

      const voice = new VexFlow.Voice({ num_beats: notesData.length, beat_value: 4 });
      voice.setStrict(false);
      voice.addTickables(staveNotes);

      new VexFlow.Formatter().joinVoices([voice]).format([voice], width - 90);
      voice.draw(context, stave);
    }

    renderSlots();
  }

  function renderSlots() {
    const slotsWrap = shadow.getElementById('slots-container');
    if (!slotsWrap || !state.currentSequence) return;

    slotsWrap.innerHTML = '';
    const notes = state.currentSequence.notes;

    notes.forEach((note, idx) => {
      const slot = document.createElement('div');
      slot.className = 'note-slot';

      if (state.isAnswerRevealed) {
        if (idx < state.userInputs.length && MusicEngine.matchInput(state.userInputs[idx], note)) {
          slot.classList.add('correct');
          slot.innerHTML = `
            <span class="slot-letter">${note.letter}</span>
            <span class="slot-solfege">${note.solfege}</span>
          `;
        } else {
          // Show correct answer highlighted with strike-through wrong note if any
          slot.classList.add('revealed');
          const wrongInput = idx < state.userInputs.length ? state.userInputs[idx] : '';
          slot.innerHTML = `
            <span class="slot-letter">${note.letter}</span>
            <span class="slot-solfege">${note.solfege}</span>
            ${wrongInput ? `<span style="font-size:7px;color:#f87171;text-decoration:line-through;margin-top:-2px;">${wrongInput}</span>` : ''}
          `;
        }
      } else if (idx < state.userInputs.length) {
        const isCorrect = MusicEngine.matchInput(state.userInputs[idx], note);
        slot.classList.add(isCorrect ? 'correct' : 'wrong');
        slot.innerHTML = `
          <span class="slot-letter">${state.userInputs[idx]}</span>
          <span class="slot-solfege">${note.solfege}</span>
        `;
      } else if (idx === state.userInputs.length) {
        slot.classList.add('active');
        slot.innerHTML = `<span class="slot-letter">?</span>`;
      } else {
        slot.innerHTML = `<span class="slot-letter">_</span>`;
      }

      slotsWrap.appendChild(slot);
    });
  }

  function handleNoteInput(inputNote) {
    if (!state.currentSequence || state.isAnswerRevealed) return;
    const currentIndex = state.userInputs.length;
    const notes = state.currentSequence.notes;
    if (currentIndex >= notes.length) return;

    const currentNote = notes[currentIndex];
    const isCorrect = MusicEngine.matchInput(inputNote, currentNote);

    // Record stats for Spaced Repetition
    const noteStats = { ...(state.settings.noteStats || {}) };
    if (!noteStats[currentNote.key]) {
      noteStats[currentNote.key] = { correct: 0, total: 0 };
    }
    noteStats[currentNote.key].total += 1;

    if (isCorrect) {
      noteStats[currentNote.key].correct += 1;
      state.userInputs.push(inputNote);

      if (window.AudioSynth) {
        window.AudioSynth.playNote(currentNote.frequency, 0.4);
      }
      renderStave();

      if (state.userInputs.length === notes.length) {
        if (state.currentSequence.type === 'chord' && window.AudioSynth && window.AudioSynth.playChord) {
          window.AudioSynth.playChord(state.currentSequence.frequencies, 1.0);
        }
        saveSettings({ noteStats });
        handleSequenceSuccess();
      }
    } else {
      // 1. Show user's wrong answer in red first
      state.userInputs.push(inputNote);
      if (window.AudioSynth) {
        window.AudioSynth.playSoftMiss();
      }
      renderStave();

      const newStreak = 0;
      state.isFever = false;
      saveSettings({
        streak: newStreak,
        noteStats,
        totalAnswered: (state.settings.totalAnswered || 0) + 1
      });
      updateStreakUI();
      clearInterval(state.timerId);

      // 2. After 450ms, reveal the correct answer and play its sound
      setTimeout(() => {
        state.isAnswerRevealed = true;
        if (window.AudioSynth) {
          if (state.currentSequence.type === 'chord' && window.AudioSynth.playChord) {
            window.AudioSynth.playChord(state.currentSequence.frequencies, 0.8);
          } else {
            window.AudioSynth.playNote(currentNote.frequency, 0.5);
          }
        }
        renderStave();

        // 3. Keep correct answer visible for 1.6s so user can learn before next question
        setTimeout(() => {
          nextQuestion();
        }, 1600);
      }, 450);
    }
  }

  function handleSequenceSuccess() {
    const isRpg = state.settings.gameMode === 'rpg';
    const oldXp = state.settings.xp || 0;
    const oldLevel = MusicEngine.getRpgLevel(oldXp).current.level;

    const newStreak = (state.settings.streak || 0) + 1;
    const bestStreak = Math.max(state.settings.bestStreak || 0, newStreak);
    const totalAnswered = (state.settings.totalAnswered || 0) + 1;
    const totalCorrect = (state.settings.totalCorrect || 0) + 1;

    // Check Combo Fever (Streak >= 10)
    if (newStreak >= 10 && !state.isFever) {
      state.isFever = true;
      if (window.AudioSynth) window.AudioSynth.playFever();
    } else {
      if (window.AudioSynth) window.AudioSynth.playSuccess();
    }

    const earnedXp = (10 + Math.min(newStreak, 5) * 2) * (state.isFever ? 2 : 1);
    const newXp = oldXp + earnedXp;
    const newLevel = MusicEngine.getRpgLevel(newXp).current.level;

    if (isRpg && newLevel > oldLevel) {
      if (window.AudioSynth) window.AudioSynth.playLevelUp();
    }

    saveSettings({
      streak: newStreak,
      bestStreak: bestStreak,
      xp: newXp,
      totalAnswered: totalAnswered,
      totalCorrect: totalCorrect
    });
    updateStreakUI();

    setTimeout(() => {
      nextQuestion();
    }, 800);
  }

  function updateStreakUI() {
    const count = shadow.getElementById('streak-count');
    if (count) count.textContent = state.settings.streak || 0;
    const card = shadow.getElementById('widget-card');
    if (card) {
      card.classList.toggle('fever-mode', state.isFever);
    }
  }

  function nextQuestion() {
    if (!window.MusicEngine) return;

    let clefMode = state.settings.clefMode;
    let length = state.settings.seqLength || 3;
    let intervalSec = state.settings.intervalSeconds || 5;
    let allowAccidentals = !!state.settings.allowAccidentals;

    // In RPG mode, settings follow current level
    if (state.settings.gameMode === 'rpg') {
      const rpg = MusicEngine.getRpgLevel(state.settings.xp || 0).current;
      clefMode = rpg.clef;
      length = rpg.length;
      intervalSec = rpg.interval;
      allowAccidentals = rpg.accidentals;
    }

    if (state.settings.gameMode !== 'rpg' && state.settings.drillMode === 'chords') {
      state.currentSequence = MusicEngine.generateChord(clefMode);
    } else {
      state.currentSequence = MusicEngine.generateSequence({
        clefMode: clefMode,
        length: length,
        allowAccidentals: allowAccidentals,
        noteStats: state.settings.noteStats
      });
    }
    state.userInputs = [];
    state.isAnswerRevealed = false;
    resetTimer(intervalSec);

    if (!state.isMinimized) {
      buildWidgetDOM();
      renderStave();
    }
  }

  function startTimer(intervalSec) {
    clearInterval(state.timerId);
    const stepMs = 100;
    const totalSteps = ((intervalSec || state.settings.intervalSeconds || 5) * 1000) / stepMs;
    let currentStep = totalSteps;

    state.timerId = setInterval(() => {
      if (state.isPaused) return;
      currentStep--;
      const percentage = (currentStep / totalSteps) * 100;

      const timerBar = shadow.getElementById('timer-bar');
      if (timerBar) {
        timerBar.style.width = `${Math.max(0, percentage)}%`;
      }

      const ring = shadow.getElementById('bubble-progress');
      if (ring) {
        const circumference = 2 * Math.PI * 27;
        const offset = circumference - (percentage / 100) * circumference;
        ring.style.strokeDashoffset = offset;
      }

      if (currentStep <= 0) {
        clearInterval(state.timerId);
        state.isAnswerRevealed = true;
        renderStave();
        setTimeout(() => {
          nextQuestion();
        }, 1500);
      }
    }, stepMs);
  }

  function resetTimer(intervalSec) {
    startTimer(intervalSec);
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

  // Keyboard Handler (supports Sharp # with Shift)
  let pendingKey = null;
  window.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
      return;
    }

    const key = e.key.toUpperCase();
    if ('CDEFGAB'.includes(key) && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.shiftKey) {
        // Shift + Note = Sharp Note (e.g. Shift + C = C#)
        handleNoteInput(key + '#');
      } else {
        handleNoteInput(key);
      }
    }
  });

  // Setup Web MIDI Controller
  function setupMidi() {
    if (window.MidiController) {
      window.MidiController.init();
      window.MidiController.onStateChange((info) => {
        state.isMidiConnected = info.isConnected;
        state.midiDeviceName = info.deviceName;
        buildWidgetDOM();
        renderStave();
      });
      window.MidiController.onNote((noteInfo) => {
        handleNoteInput(noteInfo.letter);
      });
    }
  }

  // Listen for storage changes from Popup
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes) => {
      let shouldRefresh = false;
      for (const [key, val] of Object.entries(changes)) {
        state.settings[key] = val.newValue;
        if (['clefMode', 'seqLength', 'allowAccidentals', 'gameMode'].includes(key)) {
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

  // Init
  loadSettings(() => {
    if (!state.settings.enabled) {
      root.style.display = 'none';
    }
    buildWidgetDOM();
    nextQuestion();
    setupMidi();
  });

})();
