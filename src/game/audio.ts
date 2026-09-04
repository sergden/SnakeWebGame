/* Tiny WebAudio synth for arcade blips. Context is created lazily on first
   user gesture so mobile browsers stay happy. */

type OscType = OscillatorType;

export class Sfx {
  muted = false;
  private ctx: AudioContext | null = null;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      try {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) this.ctx = new AC();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscType,
    vol: number,
    slideTo?: number,
    delay = 0,
  ) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    try {
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      }
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    } catch {
      /* never let audio break the game */
    }
  }

  unlock() {
    this.ensure();
  }

  eat() {
    this.tone(540, 0.09, "square", 0.11, 810);
  }

  bonus() {
    [660, 830, 1040].forEach((f, i) => this.tone(f, 0.09, "square", 0.1, f * 1.2, i * 0.065));
  }

  bonusFizzle() {
    this.tone(500, 0.16, "triangle", 0.06, 180);
  }

  turn() {
    this.tone(310, 0.028, "square", 0.03);
  }

  die() {
    this.tone(300, 0.45, "sawtooth", 0.13, 55);
    this.tone(150, 0.55, "square", 0.09, 40, 0.06);
  }

  start() {
    [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.08, "square", 0.09, undefined, i * 0.06));
  }

  pause() {
    this.tone(520, 0.07, "square", 0.07, 360);
  }

  resume() {
    this.tone(360, 0.07, "square", 0.07, 540);
  }

  best() {
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      this.tone(f, 0.13, "triangle", 0.11, undefined, i * 0.085),
    );
  }

  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.16, "triangle", 0.1, undefined, i * 0.11));
  }

  click() {
    this.tone(720, 0.04, "square", 0.05);
  }
}
