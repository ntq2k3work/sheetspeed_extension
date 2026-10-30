/**
 * SheetSpeed - Popup Controller 2.0
 * Manages settings, RPG Level, Web MIDI API, Heatmap and Focus Practice Mode.
 */

(function () {
  'use strict';

  const DEFAULT_SETTINGS = {
    enabled: true,
    intervalSeconds: 5,
    clefMode: 'mixed',
    seqLength: 3,
    drillMode: 'notes', // 'notes' | 'chords'
    allowAccidentals: false,
    gameMode: 'custom',
    xp: 0,
    isMuted: false,
    streak: 0,
    bestStreak: 0,
    totalAnswered: 0,
    totalCorrect: 0,
    sprintBestScore: 0,
    sprintBestSpeed: '0.00',
    noteStats: {}
  };

  let state = {
    settings: { ...DEFAULT_SETTINGS },
    currentSequence: null,
    userInputs: [],
    timerId: null,
    isAnswerRevealed: false,
    isFever: false,
    sprint: {
      isActive: false,
      isFinished: false,
      timeLeft: '60.0',
      timerInterval: null,
      correctCount: 0,
      totalCount: 0,
      startTime: null,
      results: null
    }
  };

  // DOM Elements
  const toggleEnabled = document.getElementById('toggle-enabled');
  const toggleSound = document.getElementById('toggle-sound');
  const toggleAccidentals = document.getElementById('toggle-accidentals');
  const midiStatus = document.getElementById('midi-status');
  const customOptions = document.getElementById('custom-options');

  const intervalDisplayBadge = document.getElementById('interval-display-badge');
  const customIntervalWrap = document.getElementById('custom-interval-wrap');
  const inputCustomInterval = document.getElementById('input-custom-interval');

  const rpgLevelBadge = document.getElementById('rpg-level-badge');
  const rpgLevelTitle = document.getElementById('rpg-level-title');
  const rpgXpText = document.getElementById('rpg-xp-text');
  const rpgXpFill = document.getElementById('rpg-xp-fill');

  const statStreak = document.getElementById('stat-streak');
  const statBest = document.getElementById('stat-best');
  const statAccuracy = document.getElementById('stat-accuracy');
  const statTotal = document.getElementById('stat-total');
  const btnResetStats = document.getElementById('btn-reset-stats');

  const popupClefTag = document.getElementById('popup-clef-tag');
  const popupModeTag = document.getElementById('popup-mode-tag');
  const popupTimerBar = document.getElementById('popup-timer-bar');
  const popupStaveContainer = document.getElementById('popup-stave-container');
  const popupSlotsContainer = document.getElementById('popup-slots-container');
  const heatmapGrid = document.getElementById('heatmap-grid');
  const practiceCard = document.getElementById('practice-card');
  const sprintOverlayContainer = document.getElementById('sprint-overlay-container');
  const practiceMainContent = document.getElementById('practice-main-content');

  function init() {
    loadSettings(() => {
      updateUIWithSettings();
      updateStatsUI();
      updateRpgUI();
      renderHeatmap();
      bindSettingsEvents();
      bindPracticeEvents();
      setupMidi();
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
    updateRpgUI();
    renderHeatmap();
  }

  function updateUIWithSettings() {
    if (toggleEnabled) toggleEnabled.checked = state.settings.enabled;
    if (toggleSound) toggleSound.checked = !state.settings.isMuted;
    if (toggleAccidentals) toggleAccidentals.checked = !!state.settings.allowAccidentals;

    setSegmentActive('control-gamemode', state.settings.gameMode);
    setSegmentActive('control-drillmode', state.settings.drillMode || 'notes');
    setSegmentActive('control-clef', state.settings.clefMode);
    
    const sec = state.settings.intervalSeconds || 5;
    if (intervalDisplayBadge) intervalDisplayBadge.textContent = `${sec}s`;
    if (inputCustomInterval) inputCustomInterval.value = sec;

    if ([3, 5, 10].includes(sec)) {
      setSegmentActive('control-interval', String(sec));
      if (customIntervalWrap) customIntervalWrap.style.display = 'none';
    } else {
      setSegmentActive('control-interval', 'custom');
      if (customIntervalWrap) customIntervalWrap.style.display = 'flex';
    }

    setSegmentActive('control-length', String(state.settings.seqLength));

    if (customOptions) {
      customOptions.style.display = state.settings.gameMode === 'custom' ? 'block' : 'none';
    }
  }

  function setSegmentActive(containerId, value) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const buttons = container.querySelectorAll('.segment');
    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-val') === value);
    });
  }

  function updateRpgUI() {
    const rpg = MusicEngine.getRpgLevel(state.settings.xp || 0);
    if (rpgLevelBadge) rpgLevelBadge.textContent = `Cấp độ ${rpg.current.level}`;
    if (rpgLevelTitle) rpgLevelTitle.textContent = rpg.current.title;
    if (rpgXpText) {
      const nextXp = rpg.next ? rpg.next.reqXp : 'MAX';
      rpgXpText.textContent = `${rpg.xp} / ${nextXp} XP`;
    }
    if (rpgXpFill) rpgXpFill.style.width = `${rpg.progress}%`;
    if (popupModeTag) {
      if (state.settings.gameMode === 'rpg') {
        popupModeTag.textContent = `Lv.${rpg.current.level}`;
      } else if (state.settings.gameMode === 'sprint') {
        popupModeTag.textContent = state.sprint.isActive 
          ? `⏱️ ${state.sprint.timeLeft}s | 🎯 ${state.sprint.correctCount}`
          : '⏱️ 60s Sprint';
      } else {
        popupModeTag.textContent = 'Tự do';
      }
    }
  }

  function updateStatsUI() {
    const s = state.settings;
    if (statStreak) statStreak.textContent = s.streak || 0;
    if (statBest) statBest.textContent = s.bestStreak || 0;
    if (statTotal) statTotal.textContent = s.totalAnswered || 0;

    const statSprint = document.getElementById('stat-sprint');
    if (statSprint) {
      statSprint.textContent = s.sprintBestScore || 0;
      statSprint.title = `Kỷ lục: ${s.sprintBestScore || 0} câu (${s.sprintBestSpeed || '0.00'}s/câu)`;
    }

    const acc = s.totalAnswered > 0 
      ? Math.round((s.totalCorrect / s.totalAnswered) * 100) 
      : 100;
    if (statAccuracy) statAccuracy.textContent = `${acc}%`;

    if (practiceCard) {
      practiceCard.classList.toggle('fever', state.isFever);
    }
  }

  function renderHeatmap() {
    if (!heatmapGrid) return;
    heatmapGrid.innerHTML = '';

    // Sample set of primary natural notes
    const keys = [
      'c/4', 'd/4', 'e/4', 'f/4', 'g/4', 'a/4', 'b/4',
      'c/5', 'd/5', 'e/5', 'f/5', 'g/5', 'a/5', 'b/5'
    ];
    const stats = state.settings.noteStats || {};

    keys.forEach(k => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      const [step, oct] = k.split('/');
      const letter = step.toUpperCase() + oct;

      const noteStat = stats[k];
      let accText = '--%';

      if (noteStat && noteStat.total > 0) {
        const acc = Math.round((noteStat.correct / noteStat.total) * 100);
        accText = `${acc}%`;
        if (acc >= 80) cell.classList.add('good');
        else if (acc >= 60) cell.classList.add('fair');
        else cell.classList.add('weak');
      }

      cell.innerHTML = `<span>${letter}</span><small>${accText}</small>`;
      heatmapGrid.appendChild(cell);
    });
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

    if (toggleAccidentals) {
      toggleAccidentals.addEventListener('change', (e) => {
        saveSettings({ allowAccidentals: e.target.checked });
        nextQuestion();
      });
    }

    // Game mode switch (Custom vs RPG vs Sprint)
    setupSegmentGroup('control-gamemode', (val) => {
      saveSettings({ gameMode: val });
      if (customOptions) customOptions.style.display = val === 'custom' ? 'block' : 'none';
      if (val !== 'sprint') {
        state.sprint.isActive = false;
        state.sprint.isFinished = false;
        clearInterval(state.sprint.timerInterval);
      }
      nextQuestion();
    });

    // Drill mode (Notes vs Chords)
    setupSegmentGroup('control-drillmode', (val) => {
      saveSettings({ drillMode: val });
      nextQuestion();
    });

    setupSegmentGroup('control-clef', (val) => {
      saveSettings({ clefMode: val });
      nextQuestion();
    });

    setupSegmentGroup('control-interval', (val) => {
      if (val === 'custom') {
        if (customIntervalWrap) customIntervalWrap.style.display = 'flex';
        const customVal = Math.max(1, Math.min(120, parseInt(inputCustomInterval.value, 10) || 5));
        if (intervalDisplayBadge) intervalDisplayBadge.textContent = `${customVal}s`;
        saveSettings({ intervalSeconds: customVal });
      } else {
        if (customIntervalWrap) customIntervalWrap.style.display = 'none';
        const numVal = parseInt(val, 10);
        if (intervalDisplayBadge) intervalDisplayBadge.textContent = `${numVal}s`;
        if (inputCustomInterval) inputCustomInterval.value = numVal;
        saveSettings({ intervalSeconds: numVal });
      }
      resetTimer();
    });

    if (inputCustomInterval) {
      inputCustomInterval.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val)) return;
        val = Math.max(1, Math.min(120, val));
        if (intervalDisplayBadge) intervalDisplayBadge.textContent = `${val}s`;
        saveSettings({ intervalSeconds: val });
        resetTimer();
      });
    }

    setupSegmentGroup('control-length', (val) => {
      saveSettings({ seqLength: parseInt(val, 10) });
      nextQuestion();
    });

    if (btnResetStats) {
      btnResetStats.addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn đặt lại toàn bộ Level, XP và Heatmap thống kê?')) {
          saveSettings({
            streak: 0,
            bestStreak: 0,
            xp: 0,
            totalAnswered: 0,
            totalCorrect: 0,
            noteStats: {}
          });
          nextQuestion();
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

  function bindPracticeEvents() {
    const keyButtons = document.querySelectorAll('.piano-wrapper .key-btn');
    keyButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        handleNoteInput(key);
      });
    });

    window.addEventListener('keydown', (e) => {
      const key = e.key.toUpperCase();
      if ('CDEFGAB'.includes(key) && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.shiftKey) {
          handleNoteInput(key + '#');
        } else {
          handleNoteInput(key);
        }
      }
    });
  }

  function setupMidi() {
    if (window.MidiController) {
      window.MidiController.init();
      window.MidiController.onStateChange((info) => {
        if (midiStatus) {
          if (info.isConnected) {
            midiStatus.textContent = `🎹 ${info.deviceName || 'MIDI ON'}`;
            midiStatus.classList.add('connected');
          } else {
            midiStatus.textContent = '🎹 MIDI: Off';
            midiStatus.classList.remove('connected');
          }
        }
      });
      window.MidiController.onNote((noteInfo) => {
        handleNoteInput(noteInfo.letter);
      });
    }
  }

  function nextQuestion() {
    if (!window.MusicEngine) return;

    if (state.settings.gameMode === 'sprint') {
      if (!state.sprint.isActive) {
        renderSprintOverlay();
        return;
      }
    }

    let clefMode = state.settings.clefMode;
    let length = state.settings.seqLength || 3;
    let intervalSec = state.settings.intervalSeconds || 5;
    let allowAccidentals = !!state.settings.allowAccidentals;

    if (state.settings.gameMode === 'rpg') {
      const rpg = MusicEngine.getRpgLevel(state.settings.xp || 0).current;
      clefMode = rpg.clef;
      length = rpg.length;
      intervalSec = rpg.interval;
      allowAccidentals = rpg.accidentals;
    } else if (state.settings.gameMode === 'sprint') {
      length = 1; // 1 note at a time for high speed sprint
    }

    if (state.settings.gameMode !== 'rpg' && state.settings.gameMode !== 'sprint' && state.settings.drillMode === 'chords') {
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

    if (popupClefTag) {
      const clefName = state.currentSequence.clef === 'treble' ? 'Khóa Sol 𝄞' : 'Khóa Fa 𝄢';
      if (state.currentSequence.type === 'chord') {
        popupClefTag.textContent = `${clefName} (${state.currentSequence.chordName})`;
      } else {
        popupClefTag.textContent = clefName;
      }
    }

    renderStave();

    if (state.settings.gameMode === 'sprint') {
      renderSprintOverlay();
    } else {
      resetTimer(intervalSec);
    }
  }

  function renderStave() {
    if (!popupStaveContainer || !state.currentSequence || !window.VexFlow) return;
    popupStaveContainer.innerHTML = '';

    const clef = state.currentSequence.clef;
    const notesData = state.currentSequence.notes;
    const width = 360;
    const height = 115;

    const renderer = new VexFlow.Renderer(popupStaveContainer, VexFlow.Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();
    context.setFont('Arial', 10, '').setBackgroundFillStyle('#ffffff');

    const stave = new VexFlow.Stave(5, 5, width - 10);
    stave.addClef(clef);
    stave.setContext(context).draw();

    if (state.currentSequence.type === 'chord') {
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
    if (!popupSlotsContainer || !state.currentSequence) return;
    popupSlotsContainer.innerHTML = '';

    const notes = state.currentSequence.notes;
    notes.forEach((note, idx) => {
      const slot = document.createElement('div');
      slot.className = 'popup-slot';

      if (state.isAnswerRevealed) {
        if (idx < state.userInputs.length && MusicEngine.matchInput(state.userInputs[idx], note)) {
          slot.classList.add('correct');
          slot.innerHTML = `
            <span>${note.letter}</span>
            <span class="slot-solfege">${note.solfege}</span>
          `;
        } else {
          slot.classList.add('revealed');
          const wrongInput = idx < state.userInputs.length ? state.userInputs[idx] : '';
          slot.innerHTML = `
            <span>${note.letter}</span>
            <span class="slot-solfege">${note.solfege}</span>
            ${wrongInput ? `<span style="font-size:7px;color:#f87171;text-decoration:line-through;margin-top:-2px;">${wrongInput}</span>` : ''}
          `;
        }
      } else if (idx < state.userInputs.length) {
        const isCorrect = MusicEngine.matchInput(state.userInputs[idx], note);
        slot.classList.add(isCorrect ? 'correct' : 'wrong');
        slot.innerHTML = `
          <span>${state.userInputs[idx]}</span>
          <span class="slot-solfege">${note.solfege}</span>
        `;
      } else if (idx === state.userInputs.length) {
        slot.classList.add('active');
        slot.innerHTML = `<span>?</span>`;
      } else {
        slot.innerHTML = `<span>_</span>`;
      }

      popupSlotsContainer.appendChild(slot);
    });
  }

  function handleNoteInput(inputNote) {
    if (!state.currentSequence || state.isAnswerRevealed) return;

    // Sprint Mode Branch
    if (state.settings.gameMode === 'sprint') {
      if (!state.sprint.isActive) return;
      const notes = state.currentSequence.notes;
      const currentNote = notes[0];
      const isCorrect = MusicEngine.matchInput(inputNote, currentNote);

      const noteStats = { ...(state.settings.noteStats || {}) };
      if (!noteStats[currentNote.key]) {
        noteStats[currentNote.key] = { correct: 0, total: 0 };
      }
      noteStats[currentNote.key].total += 1;
      state.sprint.totalCount += 1;

      if (isCorrect) {
        noteStats[currentNote.key].correct += 1;
        state.sprint.correctCount += 1;
        state.userInputs = [inputNote];

        if (window.AudioSynth) {
          window.AudioSynth.playNote(currentNote.frequency, 0.25);
        }
        renderStave();

        if (popupModeTag) {
          popupModeTag.textContent = `⏱️ ${state.sprint.timeLeft.toFixed(1)}s (${state.sprint.correctCount})`;
        }

        saveSettings({ noteStats });
        setTimeout(nextQuestion, 40);
      } else {
        state.userInputs = [inputNote];
        if (window.AudioSynth) window.AudioSynth.playSoftMiss();
        renderStave();

        saveSettings({ noteStats });
        state.isAnswerRevealed = true;
        setTimeout(() => {
          renderStave();
          setTimeout(nextQuestion, 180);
        }, 120);
      }
      return;
    }

    const currentIndex = state.userInputs.length;
    const notes = state.currentSequence.notes;
    if (currentIndex >= notes.length) return;

    const currentNote = notes[currentIndex];
    const isCorrect = MusicEngine.matchInput(inputNote, currentNote);

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
      // 1. Show user wrong answer in red
      state.userInputs.push(inputNote);
      if (window.AudioSynth) window.AudioSynth.playSoftMiss();
      renderStave();

      state.isFever = false;
      saveSettings({
        streak: 0,
        noteStats,
        totalAnswered: (state.settings.totalAnswered || 0) + 1
      });
      clearInterval(state.timerId);

      // 2. Reveal correct answer and play sound after 450ms
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

        // 3. Keep correct answer for 1.6s so user can learn
        setTimeout(nextQuestion, 1600);
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

    setTimeout(nextQuestion, 700);
  }

  function renderSprintOverlay() {
    if (!sprintOverlayContainer || !practiceMainContent) return;

    if (state.settings.gameMode !== 'sprint') {
      sprintOverlayContainer.innerHTML = '';
      sprintOverlayContainer.style.display = 'none';
      practiceMainContent.style.display = 'block';
      return;
    }

    if (!state.sprint.isActive && !state.sprint.isFinished) {
      practiceMainContent.style.display = 'none';
      sprintOverlayContainer.style.display = 'block';
      const bestScore = state.settings.sprintBestScore || 0;
      const bestSpeed = state.settings.sprintBestSpeed || '0.00';

      sprintOverlayContainer.innerHTML = `
        <div class="sprint-ready-overlay">
          <div class="sprint-ready-icon">⚡⏱️</div>
          <h3>Thử Thách Tốc Độ 60 Giây</h3>
          <p>Giải nốt liên tục trong 1 phút! Hệ thống tính tổng số câu đúng và tốc độ phản xạ trung bình (giây/câu).</p>
          <div class="sprint-record-pill">
            🏆 Kỷ lục: <strong>${bestScore} câu</strong> (${bestSpeed}s/câu)
          </div>
          <button type="button" class="sprint-start-btn" id="sprint-start-action-btn">BẮT ĐẦU 60S 🚀</button>
        </div>
      `;

      const startBtn = document.getElementById('sprint-start-action-btn');
      if (startBtn) {
        startBtn.addEventListener('click', startSprint);
      }
    } else if (state.sprint.isActive) {
      sprintOverlayContainer.innerHTML = '';
      sprintOverlayContainer.style.display = 'none';
      practiceMainContent.style.display = 'block';
      if (popupModeTag) {
        popupModeTag.textContent = `⏱️ ${state.sprint.timeLeft.toFixed(1)}s (${state.sprint.correctCount})`;
      }
    } else if (state.sprint.isFinished) {
      practiceMainContent.style.display = 'none';
      sprintOverlayContainer.style.display = 'block';

      const total = state.sprint.totalCount;
      const correct = state.sprint.correctCount;
      const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
      const avgSpeed = (60.0 / Math.max(1, total)).toFixed(2);
      const isNewRecord = correct > (state.settings.sprintBestScore || 0) && correct > 0;

      sprintOverlayContainer.innerHTML = `
        <div class="sprint-result-overlay">
          <div class="sprint-result-badge">HẾT GIỜ 60S!</div>
          ${isNewRecord ? '<div class="sprint-new-record">🎉 KỶ LỤC MỚI ĐƯỢC THIẾT LẬP! 🎉</div>' : ''}
          <div class="sprint-result-grid">
            <div class="result-cell highlight">
              <span class="result-num">${correct}</span>
              <span class="result-label">Số câu đúng</span>
            </div>
            <div class="result-cell">
              <span class="result-num">${avgSpeed}s</span>
              <span class="result-label">Tốc độ TB / câu</span>
            </div>
            <div class="result-cell">
              <span class="result-num">${acc}%</span>
              <span class="result-label">Độ chính xác</span>
            </div>
          </div>
          <div class="sprint-action-row">
            <button type="button" class="sprint-retry-btn" id="sprint-retry-action-btn">Thử lại 60s 🔄</button>
            <button type="button" class="sprint-exit-btn" id="sprint-exit-action-btn">Về Tự do</button>
          </div>
        </div>
      `;

      const retryBtn = document.getElementById('sprint-retry-action-btn');
      if (retryBtn) retryBtn.addEventListener('click', startSprint);

      const exitBtn = document.getElementById('sprint-exit-action-btn');
      if (exitBtn) {
        exitBtn.addEventListener('click', () => {
          saveSettings({ gameMode: 'custom' });
          updateUIWithSettings();
          if (customOptions) customOptions.style.display = 'block';
          state.sprint.isActive = false;
          state.sprint.isFinished = false;
          sprintOverlayContainer.innerHTML = '';
          sprintOverlayContainer.style.display = 'none';
          practiceMainContent.style.display = 'block';
          nextQuestion();
        });
      }
    }
  }

  function startSprint() {
    state.sprint.isActive = true;
    state.sprint.isFinished = false;
    state.sprint.timeLeft = 60.0;
    state.sprint.correctCount = 0;
    state.sprint.totalCount = 0;
    renderSprintOverlay();
    startSprintTimer();
    nextQuestion();
  }

  function startSprintTimer() {
    clearInterval(state.sprint.timerInterval);
    clearInterval(state.timerId);
    const totalDurationMs = 60000;
    const startTime = Date.now();

    state.sprint.timerInterval = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      const remainingMs = Math.max(0, totalDurationMs - elapsedMs);
      state.sprint.timeLeft = remainingMs / 1000;

      if (popupTimerBar) {
        popupTimerBar.style.width = `${(remainingMs / totalDurationMs) * 100}%`;
      }
      if (popupModeTag) {
        popupModeTag.textContent = `⏱️ ${state.sprint.timeLeft.toFixed(1)}s (${state.sprint.correctCount})`;
      }

      if (remainingMs <= 0) {
        finishSprint();
      }
    }, 100);
  }

  function finishSprint() {
    clearInterval(state.sprint.timerInterval);
    state.sprint.isActive = false;
    state.sprint.isFinished = true;
    state.sprint.timeLeft = 0;

    const total = state.sprint.totalCount;
    const correct = state.sprint.correctCount;
    const avgSpeed = (60.0 / Math.max(1, total)).toFixed(2);

    const oldBestScore = state.settings.sprintBestScore || 0;
    const isNewRecord = correct > oldBestScore;
    const newBestScore = Math.max(oldBestScore, correct);
    const newBestSpeed = isNewRecord ? avgSpeed : (state.settings.sprintBestSpeed || avgSpeed);

    const newTotalAnswered = (state.settings.totalAnswered || 0) + total;
    const newTotalCorrect = (state.settings.totalCorrect || 0) + correct;

    if (window.AudioSynth) {
      if (isNewRecord) window.AudioSynth.playLevelUp();
      else window.AudioSynth.playSuccess();
    }

    saveSettings({
      sprintBestScore: newBestScore,
      sprintBestSpeed: newBestSpeed,
      totalAnswered: newTotalAnswered,
      totalCorrect: newTotalCorrect
    });

    renderSprintOverlay();
  }

  function startTimer(intervalSec) {
    clearInterval(state.timerId);
    const stepMs = 100;
    const totalSteps = ((intervalSec || state.settings.intervalSeconds || 5) * 1000) / stepMs;
    let currentStep = totalSteps;

    state.timerId = setInterval(() => {
      currentStep--;
      const percentage = (currentStep / totalSteps) * 100;
      if (popupTimerBar) {
        popupTimerBar.style.width = `${Math.max(0, percentage)}%`;
      }

      if (currentStep <= 0) {
        clearInterval(state.timerId);
        state.isAnswerRevealed = true;
        renderStave();
        setTimeout(nextQuestion, 1500);
      }
    }, stepMs);
  }

  function resetTimer(intervalSec) {
    startTimer(intervalSec);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
