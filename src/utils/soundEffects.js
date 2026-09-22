/**
 * Web Audio API Sound Synthesizer
 * Zero-latency, harmonic pleasant audio cues for start, stop, and error.
 * Supports variable volume scaling (0% to 100%) and instant 100% mute.
 */

class SoundSynthesizer {
  constructor() {
    this.ctx = null;
  }

  getAudioContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playStart(volume = 0.4) {
    if (volume <= 0.01) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, now);

    // D5 -> A5 Rising Harmonic Chime
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.connect(gain);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.08);
    osc2.connect(gain);

    gain.gain.linearRampToValueAtTime(volume * 0.35, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc1.start(now);
    osc1.stop(now + 0.09);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.22);
  }

  playStop(volume = 0.4) {
    if (volume <= 0.01) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, now);

    // A5 -> D5 Falling Harmonic Chime
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880.0, now);
    osc1.connect(gain);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(587.33, now + 0.08);
    osc2.connect(gain);

    gain.gain.linearRampToValueAtTime(volume * 0.35, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc1.start(now);
    osc1.stop(now + 0.09);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.22);
  }

  playError(volume = 0.4) {
    if (volume <= 0.01) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(volume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.setValueAtTime(220, now + 0.1);
    osc.connect(gain);

    osc.start(now);
    osc.stop(now + 0.25);
  }
}

export const soundFx = new SoundSynthesizer();
