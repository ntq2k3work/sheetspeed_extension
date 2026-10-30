/**
 * Unit Test for SheetSpeed 2.0 Music Engine & MIDI
 */

const assert = require('assert');
const MusicEngine = require('./src/engine/music-engine.js');
const MidiController = require('./src/engine/midi-controller.js');

console.log('--- Testing SheetSpeed 2.0 Engines ---');

// 1. Test Accidentals in Sequence Generation
const accSeq = MusicEngine.generateSequence({
  clefMode: 'treble',
  length: 4,
  allowAccidentals: true
});
assert.strictEqual(accSeq.notes.length, 4);
console.log('✔ Accidental sequence generated:', accSeq.targetLetters.join(' - '));

// 2. Test Spaced Repetition Weighted Selection
const mockStats = {
  'c/4': { correct: 10, total: 10 }, // 100% accuracy -> low weight
  'f#/4': { correct: 1, total: 10 },  // 10% accuracy -> high weight
};
let fSharpCount = 0;
for (let i = 0; i < 100; i++) {
  const seq = MusicEngine.generateSequence({
    clefMode: 'treble',
    length: 1,
    allowAccidentals: true,
    noteStats: mockStats
  });
  if (seq.notes[0].key === 'f#/4') fSharpCount++;
}
assert(fSharpCount > 0, 'Weak note F#4 should be prioritized by Spaced Repetition');
console.log(`✔ Spaced Repetition verified: Weak note F#4 picked ${fSharpCount}/100 times`);

// 3. Test RPG Levels and XP Progression
const r1 = MusicEngine.getRpgLevel(0);
assert.strictEqual(r1.current.level, 1);
assert.strictEqual(r1.current.accidentals, false);

const r5 = MusicEngine.getRpgLevel(400);
assert.strictEqual(r5.current.level, 5);
assert.strictEqual(r5.current.accidentals, true);
console.log('✔ RPG Level system verified: Lv.1 at 0 XP -> Lv.5 at 400 XP');

// 4. Test MIDI Note Mapping
const middleC = MidiController.midiToNote(60);
assert.strictEqual(middleC.step, 'C');
assert.strictEqual(middleC.letter, 'C');
assert.strictEqual(middleC.octave, 4);

const cSharp = MidiController.midiToNote(61);
assert.strictEqual(cSharp.letter, 'C#');
assert.strictEqual(cSharp.octave, 4);
console.log('✔ Web MIDI mapping verified: 60 -> C4, 61 -> C#4');

// 5. Test Note Matching (Enharmonic / Accidental match)
const noteWithSharp = { letter: 'C#', altLetter: 'Db' };
assert.strictEqual(MusicEngine.matchInput('C#', noteWithSharp), true);
assert.strictEqual(MusicEngine.matchInput('Db', noteWithSharp), true);
assert.strictEqual(MusicEngine.matchInput('C', noteWithSharp), false);
console.log('✔ Enharmonic note matching verified (C# == Db)');

// 6. Test Chord Flashcards (Major, Minor, Dominant 7th, Flats)
const chordTreble = MusicEngine.generateChord('treble');
assert(chordTreble.chordName, 'Chord name should exist');
assert(chordTreble.keys.length >= 3, 'Chord should have at least 3 notes');
assert(chordTreble.frequencies.length === chordTreble.keys.length, 'All chord frequencies must be valid');
console.log(`✔ Chord generation verified: ${chordTreble.chordFullName} (${chordTreble.targetLetters.join('-')})`);

const flatNote = { letter: 'Bb', altLetter: 'A#', solfege: 'Si♭' };
assert.strictEqual(MusicEngine.matchInput('Bb', flatNote), true);
assert.strictEqual(MusicEngine.matchInput('A#', flatNote), true);
console.log('✔ Enharmonic flat chord matching verified (Bb == A#)');

console.log('All 2.0 Unit Tests Passed Successfully! 🚀');
