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
    'db': { letter: 'Db', altLetter: 'C#', solfege: 'Rê♭', semitone: 1 },
    d: { letter: 'D', solfege: 'Rê', semitone: 2 },
    'd#': { letter: 'D#', altLetter: 'Eb', solfege: 'Rê♯', semitone: 3 },
    'eb': { letter: 'Eb', altLetter: 'D#', solfege: 'Mi♭', semitone: 3 },
    e: { letter: 'E', solfege: 'Mi', semitone: 4 },
    f: { letter: 'F', solfege: 'Fa', semitone: 5 },
    'f#': { letter: 'F#', altLetter: 'Gb', solfege: 'Fa♯', semitone: 6 },
    'gb': { letter: 'Gb', altLetter: 'F#', solfege: 'Sol♭', semitone: 6 },
    g: { letter: 'G', solfege: 'Sol', semitone: 7 },
    'g#': { letter: 'G#', altLetter: 'Ab', solfege: 'Sol♯', semitone: 8 },
    'ab': { letter: 'Ab', altLetter: 'G#', solfege: 'La♭', semitone: 8 },
    a: { letter: 'A', solfege: 'La', semitone: 9 },
    'a#': { letter: 'A#', altLetter: 'Bb', solfege: 'La♯', semitone: 10 },
    'bb': { letter: 'Bb', altLetter: 'A#', solfege: 'Si♭', semitone: 10 },
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
      const hasFlat = stepWithAcc.length > 1 && stepWithAcc.endsWith('b');

      notes.push({
        index: i,
        key: key,                              // e.g. 'c#/4'
        step: stepWithAcc[0].toUpperCase(),     // e.g. 'C'
        accidental: hasSharp ? '#' : (hasFlat ? 'b' : ''),
        letter: meta ? meta.letter : stepWithAcc.toUpperCase(),
        altLetter: meta ? (meta.altLetter || meta.letter) : '',
        solfege: meta ? meta.solfege : '',
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

  // Comprehensive Chord Definitions for Treble & Bass
  // Includes:
  // - Hợp âm Trưởng (Major: C, D, E, F, G, A, B, Bb, Eb)
  // - Hợp âm Thứ (Minor: Cm, Dm, Em, Fm, Gm, Am, Bm)
  // - Hợp âm 7 át / Dominant 7th (C7, D7, E7, F7, G7, A7, B7, Bb7 - có bậc 7 giáng)
  // - Hợp âm Thứ 7 (Minor 7th: Dm7, Em7, Am7, Cm7, Gm7)
  // - Hợp âm Trưởng 7 (Major 7th: Cmaj7, Fmaj7)
  const CHORD_DEFINITIONS = {
    treble: [
      // 1. Trưởng (Major)
      { name: 'C', fullName: 'Đô trưởng (C Major)', keys: ['c/4', 'e/4', 'g/4'], notes: ['C', 'E', 'G'] },
      { name: 'D', fullName: 'Rê trưởng (D Major)', keys: ['d/4', 'f#/4', 'a/4'], notes: ['D', 'F#', 'A'] },
      { name: 'E', fullName: 'Mi trưởng (E Major)', keys: ['e/4', 'g#/4', 'b/4'], notes: ['E', 'G#', 'B'] },
      { name: 'F', fullName: 'Fa trưởng (F Major)', keys: ['f/4', 'a/4', 'c/5'], notes: ['F', 'A', 'C'] },
      { name: 'G', fullName: 'Sol trưởng (G Major)', keys: ['g/4', 'b/4', 'd/5'], notes: ['G', 'B', 'D'] },
      { name: 'A', fullName: 'La trưởng (A Major)', keys: ['a/4', 'c#/5', 'e/5'], notes: ['A', 'C#', 'E'] },
      { name: 'B', fullName: 'Si trưởng (B Major)', keys: ['b/4', 'd#/5', 'f#/5'], notes: ['B', 'D#', 'F#'] },
      { name: 'Bb', fullName: 'Si giáng trưởng (B♭ Major)', keys: ['bb/3', 'd/4', 'f/4'], notes: ['Bb', 'D', 'F'] },
      { name: 'Eb', fullName: 'Mi giáng trưởng (E♭ Major)', keys: ['eb/4', 'g/4', 'bb/4'], notes: ['Eb', 'G', 'Bb'] },

      // 2. Thứ (Minor)
      { name: 'Cm', fullName: 'Đô thứ (C Minor)', keys: ['c/4', 'eb/4', 'g/4'], notes: ['C', 'Eb', 'G'] },
      { name: 'Dm', fullName: 'Rê thứ (D Minor)', keys: ['d/4', 'f/4', 'a/4'], notes: ['D', 'F', 'A'] },
      { name: 'Em', fullName: 'Mi thứ (E Minor)', keys: ['e/4', 'g/4', 'b/4'], notes: ['E', 'G', 'B'] },
      { name: 'Fm', fullName: 'Fa thứ (F Minor)', keys: ['f/4', 'ab/4', 'c/5'], notes: ['F', 'Ab', 'C'] },
      { name: 'Gm', fullName: 'Sol thứ (G Minor)', keys: ['g/4', 'bb/4', 'd/5'], notes: ['G', 'Bb', 'D'] },
      { name: 'Am', fullName: 'La thứ (A Minor)', keys: ['a/4', 'c/5', 'e/5'], notes: ['A', 'C', 'E'] },
      { name: 'Bm', fullName: 'Si thứ (B Minor)', keys: ['b/4', 'd/5', 'f#/5'], notes: ['B', 'D', 'F#'] },

      // 3. Hợp âm 7 át / Dominant 7th (chứa bậc 7 giáng)
      { name: 'C7', fullName: 'Đô 7 (C Dominant 7)', keys: ['c/4', 'e/4', 'g/4', 'bb/4'], notes: ['C', 'E', 'G', 'Bb'] },
      { name: 'D7', fullName: 'Rê 7 (D Dominant 7)', keys: ['d/4', 'f#/4', 'a/4', 'c/5'], notes: ['D', 'F#', 'A', 'C'] },
      { name: 'E7', fullName: 'Mi 7 (E Dominant 7)', keys: ['e/4', 'g#/4', 'b/4', 'd/5'], notes: ['E', 'G#', 'B', 'D'] },
      { name: 'F7', fullName: 'Fa 7 (F Dominant 7)', keys: ['f/4', 'a/4', 'c/5', 'eb/5'], notes: ['F', 'A', 'C', 'Eb'] },
      { name: 'G7', fullName: 'Sol 7 (G Dominant 7)', keys: ['g/4', 'b/4', 'd/5', 'f/5'], notes: ['G', 'B', 'D', 'F'] },
      { name: 'A7', fullName: 'La 7 (A Dominant 7)', keys: ['a/4', 'c#/5', 'e/5', 'g/5'], notes: ['A', 'C#', 'E', 'G'] },
      { name: 'B7', fullName: 'Si 7 (B Dominant 7)', keys: ['b/4', 'd#/5', 'f#/5', 'a/5'], notes: ['B', 'D#', 'F#', 'A'] },
      { name: 'Bb7', fullName: 'Si giáng 7 (B♭ Dominant 7)', keys: ['bb/3', 'd/4', 'f/4', 'ab/4'], notes: ['Bb', 'D', 'F', 'Ab'] },

      // 4. Hợp âm Thứ 7 (Minor 7th)
      { name: 'Dm7', fullName: 'Rê thứ 7 (D Minor 7)', keys: ['d/4', 'f/4', 'a/4', 'c/5'], notes: ['D', 'F', 'A', 'C'] },
      { name: 'Em7', fullName: 'Mi thứ 7 (E Minor 7)', keys: ['e/4', 'g/4', 'b/4', 'd/5'], notes: ['E', 'G', 'B', 'D'] },
      { name: 'Am7', fullName: 'La thứ 7 (A Minor 7)', keys: ['a/4', 'c/5', 'e/5', 'g/5'], notes: ['A', 'C', 'E', 'G'] },
      { name: 'Cm7', fullName: 'Đô thứ 7 (C Minor 7)', keys: ['c/4', 'eb/4', 'g/4', 'bb/4'], notes: ['C', 'Eb', 'G', 'Bb'] },
      { name: 'Gm7', fullName: 'Sol thứ 7 (G Minor 7)', keys: ['g/4', 'bb/4', 'd/5', 'f/5'], notes: ['G', 'Bb', 'D', 'F'] },

      // 5. Hợp âm Trưởng 7 (Major 7th)
      { name: 'Cmaj7', fullName: 'Đô trưởng 7 (C Major 7)', keys: ['c/4', 'e/4', 'g/4', 'b/4'], notes: ['C', 'E', 'G', 'B'] },
      { name: 'Fmaj7', fullName: 'Fa trưởng 7 (F Major 7)', keys: ['f/4', 'a/4', 'c/5', 'e/5'], notes: ['F', 'A', 'C', 'E'] }
    ],
    bass: [
      // 1. Trưởng (Major)
      { name: 'C', fullName: 'Đô trưởng (C Major)', keys: ['c/3', 'e/3', 'g/3'], notes: ['C', 'E', 'G'] },
      { name: 'D', fullName: 'Rê trưởng (D Major)', keys: ['d/3', 'f#/3', 'a/3'], notes: ['D', 'F#', 'A'] },
      { name: 'E', fullName: 'Mi trưởng (E Major)', keys: ['e/3', 'g#/3', 'b/3'], notes: ['E', 'G#', 'B'] },
      { name: 'F', fullName: 'Fa trưởng (F Major)', keys: ['f/2', 'a/2', 'c/3'], notes: ['F', 'A', 'C'] },
      { name: 'G', fullName: 'Sol trưởng (G Major)', keys: ['g/2', 'b/2', 'd/3'], notes: ['G', 'B', 'D'] },
      { name: 'A', fullName: 'La trưởng (A Major)', keys: ['a/2', 'c#/3', 'e/3'], notes: ['A', 'C#', 'E'] },
      { name: 'Bb', fullName: 'Si giáng trưởng (B♭ Major)', keys: ['bb/2', 'd/3', 'f/3'], notes: ['Bb', 'D', 'F'] },

      // 2. Thứ (Minor)
      { name: 'Cm', fullName: 'Đô thứ (C Minor)', keys: ['c/3', 'eb/3', 'g/3'], notes: ['C', 'Eb', 'G'] },
      { name: 'Dm', fullName: 'Rê thứ (D Minor)', keys: ['d/3', 'f/3', 'a/3'], notes: ['D', 'F', 'A'] },
      { name: 'Em', fullName: 'Mi thứ (E Minor)', keys: ['e/3', 'g/3', 'b/3'], notes: ['E', 'G', 'B'] },
      { name: 'Fm', fullName: 'Fa thứ (F Minor)', keys: ['f/2', 'ab/2', 'c/3'], notes: ['F', 'Ab', 'C'] },
      { name: 'Gm', fullName: 'Sol thứ (G Minor)', keys: ['g/2', 'bb/2', 'd/3'], notes: ['G', 'Bb', 'D'] },
      { name: 'Am', fullName: 'La thứ (A Minor)', keys: ['a/2', 'c/3', 'e/3'], notes: ['A', 'C', 'E'] },

      // 3. Hợp âm 7 át / Dominant 7th
      { name: 'C7', fullName: 'Đô 7 (C Dominant 7)', keys: ['c/3', 'e/3', 'g/3', 'bb/3'], notes: ['C', 'E', 'G', 'Bb'] },
      { name: 'D7', fullName: 'Rê 7 (D Dominant 7)', keys: ['d/3', 'f#/3', 'a/3', 'c/4'], notes: ['D', 'F#', 'A', 'C'] },
      { name: 'E7', fullName: 'Mi 7 (E Dominant 7)', keys: ['e/3', 'g#/3', 'b/3', 'd/4'], notes: ['E', 'G#', 'B', 'D'] },
      { name: 'G7', fullName: 'Sol 7 (G Dominant 7)', keys: ['g/2', 'b/2', 'd/3', 'f/3'], notes: ['G', 'B', 'D', 'F'] },
      { name: 'A7', fullName: 'La 7 (A Dominant 7)', keys: ['a/2', 'c#/3', 'e/3', 'g/3'], notes: ['A', 'C#', 'E', 'G'] },

      // 4. Hợp âm Thứ 7 (Minor 7th)
      { name: 'Dm7', fullName: 'Rê thứ 7 (D Minor 7)', keys: ['d/3', 'f/3', 'a/3', 'c/4'], notes: ['D', 'F', 'A', 'C'] },
      { name: 'Em7', fullName: 'Mi thứ 7 (E Minor 7)', keys: ['e/3', 'g/3', 'b/3', 'd/4'], notes: ['E', 'G', 'B', 'D'] },
      { name: 'Am7', fullName: 'La thứ 7 (A Minor 7)', keys: ['a/2', 'c/3', 'e/3', 'g/3'], notes: ['A', 'C', 'E', 'G'] }
    ]
  };

  /**
   * Generate a random chord question
   */
  function generateChord(clefMode = 'mixed') {
    let activeClef = clefMode;
    if (clefMode === 'mixed') {
      activeClef = Math.random() < 0.5 ? 'treble' : 'bass';
    }

    const pool = CHORD_DEFINITIONS[activeClef] || CHORD_DEFINITIONS.treble;
    const chord = pool[Math.floor(Math.random() * pool.length)];

    const noteDetails = chord.keys.map((k, idx) => {
      const [step, oct] = k.split('/');
      const meta = NOTE_META[step.toLowerCase()];
      return {
        key: k,
        letter: chord.notes[idx],
        altLetter: meta ? (meta.altLetter || meta.letter) : chord.notes[idx],
        solfege: meta ? meta.solfege : '',
        frequency: keyToFrequency(k)
      };
    });

    return {
      type: 'chord',
      clef: activeClef,
      chordName: chord.name,
      chordFullName: chord.fullName,
      keys: chord.keys,
      notes: noteDetails,
      targetLetters: chord.notes,
      frequencies: noteDetails.map(n => n.frequency)
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
    CHORD_DEFINITIONS,
    RPG_LEVELS,
    keyToFrequency,
    generateSequence,
    generateChord,
    matchInput,
    getRpgLevel
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicEngine;
  } else {
    global.MusicEngine = MusicEngine;
  }
})(typeof window !== 'undefined' ? window : this);
