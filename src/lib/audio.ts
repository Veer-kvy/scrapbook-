export type SfxName = 'click' | 'page' | 'envelope' | 'pop' | 'chime' | 'seal';

type Prefs = { music: boolean; sfx: boolean; volume: number };

/**
 * Tiny synthesised audio system — no external files, works offline.
 * The context is only created after a user gesture (never autoplays).
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private padGain: GainNode | null = null;
  private padVoices: OscillatorNode[] = [];
  private padFilter: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  private chordTimer: number | null = null;
  private prefs: Prefs = { music: false, sfx: true, volume: 0.6 };
  private chordIndex = 0;

  setPrefs(prefs: Prefs) {
    this.prefs = prefs;
    if (this.master) {
      this.master.gain.setTargetAtTime(this.gainValue(), this.ctx!.currentTime, 0.2);
    }
    if (this.padGain) {
      const level = prefs.music ? 0.1 : 0;
      this.padGain.gain.setTargetAtTime(level, this.ctx!.currentTime, 0.6);
    }
    if (prefs.music && this.ctx) this.startMusic();
    else this.stopMusic();
  }

  async unlock(): Promise<void> {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.gainValue();
      this.master.connect(ctx.destination);
      this.buildPad();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.prefs.music) this.startMusic();
  }

  private gainValue(): number {
    return 0.9 * Math.max(0, Math.min(1, this.prefs.volume));
  }

  private buildPad() {
    const ctx = this.ctx!;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0;
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 1100;
    this.padFilter.Q.value = 0.4;
    this.padFilter.connect(this.padGain);
    this.padGain.connect(this.master!);

    const chord = [130.81, 196.0, 261.63];
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = i === 1 ? 3 : i === 2 ? -4 : 0;
      const voice = ctx.createGain();
      voice.gain.value = i === 0 ? 0.5 : 0.22;
      osc.connect(voice);
      voice.connect(this.padFilter!);
      osc.start();
      this.padVoices.push(osc);
    });

    // A whisper of air for texture.
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    noise.loop = true;
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'bandpass';
    airFilter.frequency.value = 700;
    airFilter.Q.value = 0.5;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.02;
    noise.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(this.padGain);
    noise.start();

    this.noise = buf;
  }

  private startMusic() {
    if (!this.ctx || !this.prefs.music) return;
    if (!this.padGain) return;
    this.padGain.gain.setTargetAtTime(0.1, this.ctx.currentTime, 1.2);
    if (this.chordTimer !== null) return;
    const progression = [
      [130.81, 196.0, 261.63],
      [146.83, 220.0, 293.66],
      [123.47, 185.0, 246.94],
      [110.0, 174.61, 261.63],
    ];
    this.chordTimer = window.setInterval(() => {
      if (!this.ctx || !this.prefs.music) return;
      this.chordIndex = (this.chordIndex + 1) % progression.length;
      const chord = progression[this.chordIndex];
      this.padVoices.forEach((osc, i) => {
        osc.frequency.setTargetAtTime(chord[i], this.ctx!.currentTime, 2.4);
      });
    }, 12000);
  }

  private stopMusic() {
    if (this.padGain && this.ctx) {
      this.padGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    }
    if (this.chordTimer !== null) {
      window.clearInterval(this.chordTimer);
      this.chordTimer = null;
    }
  }

  private playNoise(
    duration: number,
    type: BiquadFilterType,
    from: number,
    to: number,
    gain: number,
    q = 0.8,
  ) {
    if (!this.ctx || !this.noise || !this.master) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 1.2;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime;
    filter.frequency.setValueAtTime(from, now);
    filter.frequency.exponentialRampToValueAtTime(to, now + duration);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + duration * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(now);
    src.stop(now + duration + 0.05);
  }

  private blip(freqFrom: number, freqTo: number, duration: number, gain: number, type: OscillatorType = 'sine') {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, now);
    osc.frequency.exponentialRampToValueAtTime(freqTo, now + duration);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  sfx(name: SfxName) {
    if (!this.prefs.sfx) return;
    void this.unlock().then(() => {
      switch (name) {
        case 'click':
          this.blip(620, 500, 0.07, 0.05, 'triangle');
          break;
        case 'page':
          this.playNoise(0.55, 'bandpass', 420, 1800, 0.16, 0.6);
          this.blip(180, 90, 0.18, 0.04, 'sine');
          break;
        case 'envelope':
          this.playNoise(0.38, 'highpass', 900, 2400, 0.12, 0.4);
          this.playNoise(0.22, 'bandpass', 1600, 700, 0.08, 1.4);
          break;
        case 'pop':
          this.blip(320, 880, 0.13, 0.12, 'sine');
          break;
        case 'chime':
          this.blip(880, 880, 0.7, 0.05, 'sine');
          window.setTimeout(() => this.blip(1320, 1320, 0.9, 0.035, 'sine'), 90);
          break;
        case 'seal':
          this.blip(150, 65, 0.22, 0.14, 'sine');
          this.playNoise(0.12, 'lowpass', 300, 160, 0.1, 0.7);
          break;
      }
    });
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended' && this.prefs.music) void this.ctx.resume();
  }
}

export const audio = new AudioEngine();
