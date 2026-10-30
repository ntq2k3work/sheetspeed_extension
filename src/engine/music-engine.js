/**
 * SheetSpeed - Music Engine 2.0
 * Supports:
 * - Natural notes & Accidentals (Sharps ♯, Flats ♭)
 * - Spaced Repetition (Weighted selection based on user mistake history)
 * - RPG Level Progression System
 */

(function (global) {
  'use strict';

  // Solfege translation
  const NOTE_META = {
    c: { letter: 'C', solfege: 'Đô', semitone: 0 },
    'c#': { letter: 'C#', altLetter: 'Db', solfege: 'Đô♯', semitone: 1 },
    d: { letter: 'D', solfege: 'Rê', semitone: 2 },
    'd#': { letter: 'D#', altLetter: 'Eb', solfege: 'Rê♯', semitone: 3 },
    e: { letter: 'E', solfege: 'Mi', semitone: 4 },
    f: { letter: 'F', solfege: 'Fa', semitone: 5 },
    'f#': { letter: 'F#', altLetter: 'Gb', solfege: 'Fa♯', semitone: 6 },
    g: { letter: 'G', solfege: 'Sol', semitone: 7 },
    'g#': { letter: 'G#', altLetter: 'Ab', solfege: 'Sol♯', semitone: 8 },
    a: { letter: 'A', solfege: 'La', semitone: 9 },
    'a#': { letter: 'A#', altLetter: 'Bb', solfege: 'La♯', semitone: 10 },
    b: { letter: 'B', solfege: 'Si', semitone: 11 },
  };

  // Pools for Natural Notes
  const NATURAL_POOLS = {
    treble: [
      'c/4', 'd/4', 'e/4', 'f/4', 'g/4', 'a/4', 'b/4',
      'c/5', 'd/5', 'e/5', 'f/5', 'g/5', 'a/5'
    ],
    bass: [
      'e/2', 'f/2', 'g/2', 'a/2', 'b/2',
      'c/3', 'd/3', 'e/3', 'f/3', 'g/3', 'a/3', 'b/3',
      'c/4'
    ]
  };

  // Pools with Accidentals (Sharps)
  const ACCIDENTAL_POOLS = {
    treble: [
      'c/4', 'c#/4', 'd/4', 'd#/4', 'e/4', 'f/4', 'f#/4', 'g/4', 'g#/4', 'a/4', 'a#/4', 'b/4',
      'c/5', 'c#/5', 'd/5', 'd#/5', 'e/5', 'f/5', 'f#/5', 'g/5', 'g#/5', 'a/5'
    ],
    bass: [
      'e/2', 'f/2', 'f#/2', 'g/2', 'g#/2', 'a/2', 'a#/2', 'b/2',
      'c/3', 'c#/3', 'd/3', 'd#/3', 'e/3', 'f/3', 'f#/3', 'g/3', 'g#/3', 'a/3', 'a#/3', 'b/3',
      'c/4'
    ]
  };

  // RPG Progression Levels
  const RPG_LEVELS = [
    { level: 1, title: 'Nhập môn (Novice)', clef: 'treble', length: 2, interval: 8, accidentals: false, reqXp: 0 },
    { level: 2, title: 'Tập sự (Apprentice)', clef: 'treble', length: 3, interval: 5, accidentals: false, reqXp: 50 },
    { level: 3, title: 'Khám phá Khóa Fa (Bass Explorer)', clef: 'bass', length: 3, interval: 6, accidentals: false, reqXp: 120 },
    { level: 4, title: 'Nhạc sinh (Musician)', clef: 'mixed', length: 3, interval: 5, accidentals: false, reqXp: 220 },
    { level: 5, title: 'Thăng trầm (Accidentals)', clef: 'mixed', length: 3, interval: 5, accidentals: true, reqXp: 350 },
    { level: 6, title: 'Cao thủ (Virtuoso)', clef: 'mixed', length: 4, interval: 4, accidentals: true, reqXp: 520 },
    { level: 7, title: 'Bậc thầy (Maestro)', clef: 'mixed', length: 4, interval: 3, accidentals: true, reqXp: 750 }
  ];

  /**
   * Convert VexFlow key ('c#/4') to Frequency in Hz
   */
  function keyToFrequency(keyStr) {
    const [stepWithAcc, octStr] = keyStr.toLowerCase().split('/');
    const octave = parseInt(octStr, 10);
    const meta = NOTE_META[stepWithAcc];
    if (!meta || isNaN(octave)) return 440;
    const midi = (octave + 1) * 12 + meta.semitone;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Spaced Repetition weighted random selector
   * Increases probability for notes with lower accuracy.
   */
  function pickWeightedKey(pool, noteStats = {}) {
    if (!noteStats || Object.keys(noteStats).length === 0) {
      return pool[Math.floor(Math.random() * pool.length)];
    }

    const weights = pool.map(key => {
      const stats = noteStats[key];
      if (!stats || stats.total === 0) {
        return 2.0; // Moderate priority for unseen notes
      }
      const accuracy = stats.correct / stats.total;
      // If accuracy is low (e.g. 0.2), weight is high (1 + (1 - 0.2)*4 = 4.2)
      return 1.0 + Math.pow(1 - accuracy, 2) * 4.0;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;

    for (let i = 0; i < pool.length; i++) {
      rand -= weights[i];
      if (rand <= 0) {
        return pool[i];
      }
    }
    return pool[pool.length - 1];
  }

  /**
   * Generate a random sequence of notes
   * @param {Object} options
   *   clefMode: 'treble' | 'bass' | 'mixed'
   *   length: 3 | 4
   *   allowAccidentals: boolean
   *   noteStats: Object (for spaced repetition)
   */
  function generateSequence(options = {}) {
    const clefMode = options.clefMode || 'mixed';
    const length = options.length || 3;
    const allowAccidentals = !!options.allowAccidentals;
    const noteStats = options.noteStats || {};

    let activeClef = clefMode;
    if (clefMode === 'mixed') {
      activeClef = Math.random() < 0.5 ? 'treble' : 'bass';
    }

    const poolSource = allowAccidentals ? ACCIDENTAL_POOLS : NATURAL_POOLS;
    const pool = poolSource[activeClef] || poolSource.treble;
    const notes = [];

    for (let i = 0; i < length; i++) {
      const key = pickWeightedKey(pool, noteStats);
      const [stepWithAcc, octave] = key.split('/');
      const meta = NOTE_META[stepWithAcc.toLowerCase()];
      const hasSharp = stepWithAcc.includes('#');

      notes.push({
        index: i,
        key: key,                              // e.g. 'c#/4'
        step: stepWithAcc[0].toUpperCase(),     // e.g. 'C'
        accidental: hasSharp ? '#' : '',       // e.g. '#'
        letter: meta.letter,                   // e.g. 'C#'
        altLetter: meta.altLetter || meta.letter, // e.g. 'Db'
        solfege: meta.solfege,                 // e.g. 'Đô♯'
        octave: parseInt(octave, 10),
        frequency: keyToFrequency(key),
        duration: 'q'
      });
    }

    return {
      clef: activeClef,
      notes: notes,
      targetLetters: notes.map(n => n.letter)
    };
  }

  /**
   * Normalize user input note
   * Matches both 'C#' and 'Db', or matches step if non-accidental
   */
  function matchInput(input, targetNote) {
    if (!input || !targetNote) return false;
    const up = input.trim().toUpperCase();
    const target = targetNote.letter.toUpperCase();
    const alt = (targetNote.altLetter || '').toUpperCase();

    return up === target || (alt && up === alt);
  }

  /**
   * Get RPG level details from total XP
   */
  function getRpgLevel(xp = 0) {
    let current = RPG_LEVELS[0];
    let next = RPG_LEVELS[1] || null;

    for (let i = 0; i < RPG_LEVELS.length; i++) {
      if (xp >= RPG_LEVELS[i].reqXp) {
        current = RPG_LEVELS[i];
        next = RPG_LEVELS[i + 1] || null;
      } else {
        break;
      }
    }

    const currentReq = current.reqXp;
    const nextReq = next ? next.reqXp : currentReq + 500;
    const progress = Math.min(100, Math.max(0, Math.round(((xp - currentReq) / (nextReq - currentReq)) * 100)));

    return {
      current,
      next,
      progress,
      xp
    };
  }

  const MusicEngine = {
    NOTE_META,
    NATURAL_POOLS,
    ACCIDENTAL_POOLS,
    RPG_LEVELS,
    keyToFrequency,
    generateSequence,
    matchInput,
    getRpgLevel
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicEngine;
  } else {
    global.MusicEngine = MusicEngine;
  }
})(typeof window !== 'undefined' ? window : this);
