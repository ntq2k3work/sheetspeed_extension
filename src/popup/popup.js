/**
 * SheetSpeed - Popup Controller
 * Manages extension settings, statistics, and in-popup focus practice mode.
 */

(function () {
  'use strict';

  const DEFAULT_SETTINGS = {
    enabled: true,
    intervalSeconds: 5,
    clefMode: 'mixed',
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
    isAnswerRevealed: false
  };

  // DOM Elements
  const toggleEnabled = document.getElementById('toggle-enabled');
  const toggleSound = document.getElementById('toggle-sound');
  const statStreak = document.getElementById('stat-streak');
  const statBest = document.getElementById('stat-best');
  const statAccuracy = document.getElementById('stat-accuracy');
  const statTotal = document.getElementById('stat-total');
  const btnResetStats = document.getElementById('btn-reset-stats');

  const popupClefTag = document.getElementById('popup-clef-tag');
  const popupTimerBar = document.getElementById('popup-timer-bar');
  const popupStaveContainer = document.getElementById('popup-stave-container');
  const popupSlotsContainer = document.getElementById('popup-slots-container');

  function init() {
    loadSettings(() => {
      updateUIWithSettings();
      updateStatsUI();
      bindSettingsEvents();
      bindPracticeEvents();
      nextQuestion();
    });
  }

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
    updateStatsUI();
  }

  function updateUIWithSettings() {
    if (toggleEnabled) toggleEnabled.checked = state.settings.enabled;
    if (toggleSound) toggleSound.checked = !state.settings.isMuted;

    // Segmented controls
    setSegmentActive('control-clef', state.settings.clefMode);
    setSegmentActive('control-interval', String(state.settings.intervalSeconds));
    setSegmentActive('control-length', String(state.settings.seqLength));
  }

  function setSegmentActive(containerId, value) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const buttons = container.querySelectorAll('.segment');
    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-val') === value);
    });
  }

  function updateStatsUI() {
    const s = state.settings;
    if (statStreak) statStreak.textContent = s.streak || 0;
    if (statBest) statBest.textContent = s.bestStreak || 0;
    if (statTotal) statTotal.textContent = s.totalAnswered || 0;

    const acc = s.totalAnswered > 0 
      ? Math.round((s.totalCorrect / s.totalAnswered) * 100) 
      : 100;
    if (statAccuracy) statAccuracy.textContent = `${acc}%`;
  }

  function bindSettingsEvents() {
    if (toggleEnabled) {
      toggleEnabled.addEventListener('change', (e) => {
        saveSettings({ enabled: e.target.checked });
      });
    }

    if (toggleSound) {
      toggleSound.addEventListener('change', (e) => {
        const isMuted = !e.target.checked;
        saveSettings({ isMuted });
        if (window.AudioSynth) window.AudioSynth.setMuted(isMuted);
      });
    }

    // Clef mode segments
    setupSegmentGroup('control-clef', (val) => {
      saveSettings({ clefMode: val });
      nextQuestion();
    });

    // Interval segments
    setupSegmentGroup('control-interval', (val) => {
      saveSettings({ intervalSeconds: parseInt(val, 10) });
      resetTimer();
    });

    // Sequence length segments
    setupSegmentGroup('control-length', (val) => {
      saveSettings({ seqLength: parseInt(val, 10) });
      nextQuestion();
    });

    // Reset stats
    if (btnResetStats) {
      btnResetStats.addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn đặt lại toàn bộ thống kê chuỗi nốt?')) {
          saveSettings({
            streak: 0,
            bestStreak: 0,
            totalAnswered: 0,
            totalCorrect: 0
          });
        }
      });
    }
  }

  function setupSegmentGroup(containerId, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.segment');
      if (!btn) return;
      const val = btn.getAttribute('data-val');
      setSegmentActive(containerId, val);
      onSelect(val);
    });
  }

  // Focus Practice Engine inside Popup
  function bindPracticeEvents() {
    const keyButtons = document.querySelectorAll('.keys-grid .key-btn');
    keyButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        handleNoteInput(key);
      });
    });

    window.addEventListener('keydown', (e) => {
      const key = e.key.toUpperCase();
      if ('CDEFGAB'.includes(key) && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        handleNoteInput(key);
      }
    });
  }

  function nextQuestion() {
    if (!window.MusicEngine) return;
    state.currentSequence = MusicEngine.generateSequence(
      state.settings.clefMode,
      state.settings.seqLength || 3
    );
    state.userInputs = [];
    state.isAnswerRevealed = false;

    if (popupClefTag) {
      popupClefTag.textContent = state.currentSequence.clef === 'treble' 
        ? 'Khóa Sol 𝄞' 
        : 'Khóa Fa 𝄢';
    }

    renderStave();
    resetTimer();
  }

  function renderStave() {
    if (!popupStaveContainer || !state.currentSequence || !window.VexFlow) return;
    popupStaveContainer.innerHTML = '';

    const clef = state.currentSequence.clef;
    const notesData = state.currentSequence.notes;
    const width = 340;
    const height = 115;

    const renderer = new VexFlow.Renderer(popupStaveContainer, VexFlow.Renderer.Backends.SVG);
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

      if (i < state.userInputs.length) {
        if (state.userInputs[i] === n.letter) {
          note.setStyle({ fillStyle: '#10b981', strokeStyle: '#10b981' });
        } else {
          note.setStyle({ fillStyle: '#ef4444', strokeStyle: '#ef4444' });
        }
      } else if (state.isAnswerRevealed) {
        note.setStyle({ fillStyle: '#f59e0b', strokeStyle: '#f59e0b' });
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

  function renderSlots() {
    if (!popupSlotsContainer || !state.currentSequence) return;
    popupSlotsContainer.innerHTML = '';

    const notes = state.currentSequence.notes;
    notes.forEach((note, idx) => {
      const slot = document.createElement('div');
      slot.className = 'popup-slot';

      if (idx === state.userInputs.length && !state.isAnswerRevealed) {
        slot.classList.add('active');
        slot.innerHTML = `<span>?</span>`;
      } else if (idx < state.userInputs.length) {
        const isCorrect = state.userInputs[idx] === note.letter;
        slot.classList.add(isCorrect ? 'correct' : 'wrong');
        slot.innerHTML = `
          <span>${state.userInputs[idx]}</span>
          <span class="slot-solfege">${MusicEngine.NOTE_META[state.userInputs[idx].toLowerCase()].solfege}</span>
        `;
      } else if (state.isAnswerRevealed) {
        slot.classList.add('wrong');
        slot.innerHTML = `
          <span>${note.letter}</span>
          <span class="slot-solfege">${note.solfege}</span>
        `;
      } else {
        slot.innerHTML = `<span>_</span>`;
      }

      popupSlotsContainer.appendChild(slot);
    });
  }

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
      state.userInputs.push(letter);
      if (window.AudioSynth) {
        window.AudioSynth.playNote(currentNote.frequency, 0.4);
      }
      renderStave();

      if (state.userInputs.length === targetLetters.length) {
        // Complete!
        if (window.AudioSynth) window.AudioSynth.playSuccess();
        const newStreak = (state.settings.streak || 0) + 1;
        const bestStreak = Math.max(state.settings.bestStreak || 0, newStreak);
        saveSettings({
          streak: newStreak,
          bestStreak: bestStreak,
          totalAnswered: (state.settings.totalAnswered || 0) + 1,
          totalCorrect: (state.settings.totalCorrect || 0) + 1
        });
        setTimeout(nextQuestion, 700);
      }
    } else {
      // Wrong note
      if (window.AudioSynth) window.AudioSynth.playSoftMiss();
      state.userInputs.push(letter);
      renderStave();

      saveSettings({
        streak: 0,
        totalAnswered: (state.settings.totalAnswered || 0) + 1
      });

      state.isAnswerRevealed = true;
      setTimeout(nextQuestion, 1100);
    }
  }

  function startTimer() {
    clearInterval(state.timerId);
    const intervalSec = state.settings.intervalSeconds || 5;
    const stepMs = 100;
    const totalSteps = (intervalSec * 1000) / stepMs;
    let currentStep = totalSteps;

    state.timerId = setInterval(() => {
      currentStep--;
      const percentage = (currentStep / totalSteps) * 100;
      if (popupTimerBar) {
        popupTimerBar.style.width = `${Math.max(0, percentage)}%`;
      }

      if (currentStep <= 0) {
        if (state.userInputs.length === 0) {
          nextQuestion();
        } else {
          state.isAnswerRevealed = true;
          renderStave();
          setTimeout(nextQuestion, 900);
        }
      }
    }, stepMs);
  }

  function resetTimer() {
    startTimer();
  }

  // Start on load
  document.addEventListener('DOMContentLoaded', init);
})();
