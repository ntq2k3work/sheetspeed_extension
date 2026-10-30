/**
 * Unit Test for SheetSpeed Music Engine
 */

const assert = require('assert');
const MusicEngine = require('./src/engine/music-engine.js');

console.log('--- Testing MusicEngine ---');

// 1. Test Treble Sequence Generation
const trebleSeq = MusicEngine.generateSequence('treble', 3);
assert.strictEqual(trebleSeq.clef, 'treble');
assert.strictEqual(trebleSeq.notes.length, 3);
assert.strictEqual(trebleSeq.targetLetters.length, 3);
trebleSeq.notes.forEach(note => {
  assert(MusicEngine.CLEF_POOLS.treble.includes(note.key), `Note ${note.key} should be in treble pool`);
  assert(note.frequency > 150 && note.frequency < 1000, `Freq ${note.frequency} out of range`);
});
console.log('✔ Treble sequence generation passed (3 notes):', trebleSeq.targetLetters.join(' - '));

// 2. Test Bass Sequence Generation (4 notes)
const bassSeq = MusicEngine.generateSequence('bass', 4);
assert.strictEqual(bassSeq.clef, 'bass');
assert.strictEqual(bassSeq.notes.length, 4);
bassSeq.notes.forEach(note => {
  assert(MusicEngine.CLEF_POOLS.bass.includes(note.key), `Note ${note.key} should be in bass pool`);
  assert(note.frequency > 50 && note.frequency < 400, `Freq ${note.frequency} out of range`);
});
console.log('✔ Bass sequence generation passed (4 notes):', bassSeq.targetLetters.join(' - '));

// 3. Test Mixed Sequence Generation (Multiple iterations)
const clefsFound = new Set();
for (let i = 0; i < 30; i++) {
  const seq = MusicEngine.generateSequence('mixed', 3);
  clefsFound.add(seq.clef);
}
assert(clefsFound.has('treble'), 'Should have generated treble in mixed mode');
assert(clefsFound.has('bass'), 'Should have generated bass in mixed mode');
console.log('✔ Mixed sequence generation verified (Treble & Bass both occur)');

// 4. Test validateProgress
const target = ['C', 'E', 'G'];

// Partial correct
const p1 = MusicEngine.validateProgress(['C'], target);
assert.strictEqual(p1.isCorrectSoFar, true);
assert.strictEqual(p1.isComplete, false);
assert.strictEqual(p1.currentIndex, 1);

// Wrong note
const p2 = MusicEngine.validateProgress(['C', 'F'], target);
assert.strictEqual(p2.isCorrectSoFar, false);
assert.strictEqual(p2.isComplete, false);
assert.strictEqual(p2.failedAtIndex, 1);

// Full complete
const p3 = MusicEngine.validateProgress(['C', 'E', 'G'], target);
assert.strictEqual(p3.isCorrectSoFar, true);
assert.strictEqual(p3.isComplete, true);
assert.strictEqual(p3.currentIndex, 3);

console.log('✔ validateProgress unit tests all passed');
console.log('All tests passed successfully! 🚀');
