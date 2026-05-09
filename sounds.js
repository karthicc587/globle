// sounds.js — Programmatic SFX using Web Audio API

const SoundManager = {
  ctx: null,

  init() {
    // AudioContext must be resumed/created after a user gesture
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  /**
   * Play a simple oscillator tone
   * @param {number} freq - Frequency in Hz
   * @param {string} type - 'sine', 'square', 'sawtooth', 'triangle'
   * @param {number} duration - Seconds
   * @param {number} volume - 0.0 to 1.0
   */
  playTone(freq, type, duration, volume = 0.1) {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },

  // ─── Preset Sounds ────────────────────────────────────────────────────────

  playSuccess() {
    // A happy rising arpeggio
    const now = this.ctx?.currentTime || 0;
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.4, 0.1), i * 100);
    });
  },

  playMove() {
    // Neutral blip for a valid guess
    this.playTone(440, 'sine', 0.15, 0.1);
  },

  playError() {
    // Low buzz for invalid border/country
    this.playTone(110, 'sawtooth', 0.3, 0.05);
  },

  playGiveUp() {
    this.init();
    const now = this.ctx.currentTime;
    // A quick descending slide from 330Hz to 165Hz
    this.playTone(330, 'triangle', 0.6, 0.1);
    // You can also layer a second lower tone for a "thud" effect
    setTimeout(() => this.playTone(165, 'sawtooth', 0.4, 0.05), 50);
  }, 

  playOpponentMove() {
  this.playTone(660, 'sine', 0.1, 0.05); // Higher pitch, lower volume
}
};