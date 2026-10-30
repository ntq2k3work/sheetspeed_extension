/**
 * SheetSpeed - Audio Synth 2.0
 * Pure Web Audio API synthesizer.
 * Supports:
 * - 12 chromatic notes per octave
 * - Success arpeggio, soft miss, Level-up fanfare, Fever combo sound
 */

(function (global) {
  'use strict';

  class AudioSynth {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
    }

    _getOrCreateContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    setMuted(muted) {
      this.isMuted = !!muted;
    }

    playNote(freq, duration = 0.5) {
      if (this.isMuted) return;
      const ctx = this._getOrCreateContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      gain2.gain.setValueAtTime(0.12, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + (duration * 0.7));

      osc1.connect(gain1);
      osc2.connect(gain2);

      gain1.connect(masterGain);
      gain2.connect(masterGain);

      osc1.start(now);
      osc2.start(now);

      osc1.stop(now + duration + 0.05);
      osc2.stop(now + duration + 0.05);
    }

    playChord(frequencies = [], duration = 0.8) {
      if (this.isMuted) return;
      frequencies.forEach(f => {
        this.playNote(f, duration);
      });
    }

    playSuccess() {
      if (this.isMuted) return;
      const baseNotes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      baseNotes.forEach((freq, idx) => {
        setTimeout(() => this.playNote(freq, 0.4), idx * 70);
      });
    }

    playLevelUp() {
      if (this.isMuted) return;
      const notes = [440, 554.37, 659.25, 880, 1108.73]; // A major fanfare
      notes.forEach((freq, idx) => {
        setTimeout(() => this.playNote(freq, 0.5), idx * 90);
      });
    }

    playFever() {
      if (this.isMuted) return;
      const notes = [587.33, 739.99, 880, 1174.66]; // D major sparkles
      notes.forEach((freq, idx) => {
        setTimeout(() => this.playNote(freq, 0.35), idx * 60);
      });
    }

    playSoftMiss() {
      if (this.isMuted) return;
      const ctx = this._getOrCreateContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.2);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.21);
    }
  }

  const SynthInstance = new AudioSynth();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SynthInstance;
  } else {
    global.AudioSynth = SynthInstance;
  }
})(typeof window !== 'undefined' ? window : this);
