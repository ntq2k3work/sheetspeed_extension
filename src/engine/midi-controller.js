/**
 * SheetSpeed - Web MIDI Controller
 * Listens for hardware USB Piano/MIDI keyboard inputs.
 */

(function (global) {
  'use strict';

  // MIDI note number to Note Name and Octave (60 = C4)
  const MIDI_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  class MidiController {
    constructor() {
      this.midiAccess = null;
      this.isConnected = false;
      this.deviceName = '';
      this.noteCallbacks = [];
      this.stateCallbacks = [];
      this.isSupported = typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess;
    }

    /**
     * Initialize MIDI access
     */
    async init() {
      if (!this.isSupported) {
        console.log('[SheetSpeed MIDI] Web MIDI API not supported in this environment.');
        return false;
      }

      try {
        this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
        this._setupInputs();
        this.midiAccess.onstatechange = (e) => this._onStateChange(e);
        return true;
      } catch (err) {
        console.warn('[SheetSpeed MIDI] Could not access MIDI devices:', err);
        return false;
      }
    }

    _setupInputs() {
      if (!this.midiAccess) return;
      const inputs = this.midiAccess.inputs.values();
      let hasDevice = false;

      for (const input of inputs) {
        hasDevice = true;
        this.deviceName = input.name || 'MIDI Keyboard';
        input.onmidimessage = (msg) => this._onMidiMessage(msg);
      }

      this.isConnected = hasDevice;
      this._notifyStateChange();
    }

    _onStateChange(event) {
      this._setupInputs();
    }

    _onMidiMessage(event) {
      const [status, noteNumber, velocity] = event.data;
      const command = status >> 4;

      // Command 9 is Note On (with velocity > 0)
      if (command === 9 && velocity > 0) {
        const noteInfo = this.midiToNote(noteNumber);
        this.noteCallbacks.forEach(cb => cb(noteInfo));
      }
    }

    /**
     * Convert MIDI note number to note details
     * Example: 60 -> { midi: 60, step: 'C', accidental: '', letter: 'C', octave: 4, fullKey: 'c/4' }
     * Example: 61 -> { midi: 61, step: 'C', accidental: '#', letter: 'C#', octave: 4, fullKey: 'c#/4' }
     */
    midiToNote(midiNumber) {
      const noteNameWithAcc = MIDI_NOTE_NAMES[midiNumber % 12];
      const octave = Math.floor(midiNumber / 12) - 1;
      const hasSharp = noteNameWithAcc.includes('#');
      const step = noteNameWithAcc[0];

      return {
        midi: midiNumber,
        step: step,
        accidental: hasSharp ? '#' : '',
        letter: noteNameWithAcc,
        octave: octave,
        fullKey: `${step.toLowerCase()}${hasSharp ? '#' : ''}/${octave}`
      };
    }

    onNote(callback) {
      this.noteCallbacks.push(callback);
    }

    onStateChange(callback) {
      this.stateCallbacks.push(callback);
      callback({ isConnected: this.isConnected, deviceName: this.deviceName });
    }

    _notifyStateChange() {
      this.stateCallbacks.forEach(cb => cb({
        isConnected: this.isConnected,
        deviceName: this.deviceName
      }));
    }
  }

  const instance = new MidiController();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = instance;
  } else {
    global.MidiController = instance;
  }
})(typeof window !== 'undefined' ? window : this);
