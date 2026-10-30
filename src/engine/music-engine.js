/**
 * SheetSpeed - Music Engine
 * Handles note generation, clef ranges, frequency calculations, and sequence validation.
 */

(function (global) {
  'use strict';

  // Solfege translation
  const NOTE_META = {
    c: { letter: 'C', solfege: 'Đô', semitone: 0 },
    d: { letter: 'D', solfege: 'Rê', semitone: 2 },
    e: { letter: 'E', solfege: 'Mi', semitone: 4 },
    f: { letter: 'F', solfege: 'Fa', semitone: 5 },
    g: { letter: 'G', solfege: 'Sol', semitone: 7 },
    a: { letter: 'A', solfege: 'La', semitone: 9 },
    b: { letter: 'B', solfege: 'Si', semitone: 11 },
  };

  // Note pools for each clef (in VexFlow key format: 'step/octave')
  const CLEF_POOLS = {
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

  /**
   * Convert VexFlow key ('c/4') to MIDI number and Frequency in Hz
   */
  function keyToFrequency(keyStr) {
    const [step, octStr] = keyStr.toLowerCase().split('/');
    const octave = parseInt(octStr, 10);
    const meta = NOTE_META[step];
    if (!meta || isNaN(octave)) return 440;
    // MIDI number: C4 is 60 (octave 4, semitone 0 -> (4+1)*12 = 60)
    const midi = (octave + 1) * 12 + meta.semitone;
    // Frequency = 440 * 2^((midi - 69) / 12)
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Generate a random sequence of notes
   * @param {string} clefMode - 'treble' | 'bass' | 'mixed'
   * @param {number} length - Number of notes (e.g., 3 or 4)
   */
  function generateSequence(clefMode = 'mixed', length = 3) {
    let activeClef = clefMode;
    if (clefMode === 'mixed') {
      activeClef = Math.random() < 0.5 ? 'treble' : 'bass';
    }

    const pool = CLEF_POOLS[activeClef] || CLEF_POOLS.treble;
    const notes = [];
    let lastIndex = -1;

    for (let i = 0; i < length; i++) {
      let nextIndex;
      // Generate pleasing interval (steps or gentle leaps within 4 steps)
      if (lastIndex === -1) {
        nextIndex = Math.floor(Math.random() * pool.length);
      } else {
        const step = (Math.floor(Math.random() * 7) - 3); // -3 to +3
        nextIndex = Math.max(0, Math.min(pool.length - 1, lastIndex + (step === 0 ? 1 : step)));
      }
      lastIndex = nextIndex;

      const key = pool[nextIndex];
      const [step, octave] = key.split('/');
      const meta = NOTE_META[step.toLowerCase()];

      notes.push({
        index: i,
        key: key,               // e.g. 'c/4'
        letter: meta.letter,     // e.g. 'C'
        solfege: meta.solfege,   // e.g. 'Đô'
        octave: parseInt(octave, 10),
        frequency: keyToFrequency(key),
        duration: 'q'            // Quarter note
      });
    }

    return {
      clef: activeClef,
      notes: notes,
      targetLetters: notes.map(n => n.letter)
    };
  }

  /**
   * Validate the user's progress against the current sequence
   * @param {Array<string>} userInputs - Array of letters user entered, e.g. ['C', 'E']
   * @param {Array<string>} targetLetters - Target letters, e.g. ['C', 'E', 'G']
   * @returns {Object} { isComplete: boolean, isCorrectSoFar: boolean, currentIndex: number, failedAtIndex: number | null }
   */
  function validateProgress(userInputs, targetLetters) {
    for (let i = 0; i < userInputs.length; i++) {
      if (userInputs[i].toUpperCase() !== targetLetters[i]) {
        return {
          isComplete: false,
          isCorrectSoFar: false,
          currentIndex: i,
          failedAtIndex: i
        };
      }
    }

    const isComplete = userInputs.length === targetLetters.length;
    return {
      isComplete: isComplete,
      isCorrectSoFar: true,
      currentIndex: userInputs.length,
      failedAtIndex: null
    };
  }

  const MusicEngine = {
    NOTE_META,
    CLEF_POOLS,
    keyToFrequency,
    generateSequence,
    validateProgress
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicEngine;
  } else {
    global.MusicEngine = MusicEngine;
  }
})(typeof window !== 'undefined' ? window : this);
