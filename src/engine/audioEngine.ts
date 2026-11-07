export type AudioContextMode =
  | 'menu'
  | 'dashboard'
  | 'match_prep'
  | 'match_intro'
  | 'match'
  | 'auction'
  | 'victory'
  | 'trophy';

export interface AudioSettings {
  masterVolume: number; // 0 to 1
  musicVolume: number; // 0 to 1
  crowdVolume: number; // 0 to 1
  sfxVolume: number; // 0 to 1
  musicEnabled: boolean;
  crowdEnabled: boolean;
  sfxEnabled: boolean;
  masterMuted?: boolean;
}

const STORAGE_KEY = 'cricket_apex_audio_settings_v2';

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.8,
  musicVolume: 0.45,
  crowdVolume: 0.65,
  sfxVolume: 0.75,
  musicEnabled: true,
  crowdEnabled: true,
  sfxEnabled: true,
  masterMuted: false,
};

class StadiumAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private crowdSource: AudioBufferSourceNode | null = null;
  private crowdFilter: BiquadFilterNode | null = null;
  private crowdEnvelopeGain: GainNode | null = null;

  private musicInterval: number | null = null;
  private currentMode: AudioContextMode = 'dashboard';
  private isInitialized = false;
  private stepCounter = 0;
  private crowdIntensity = 0.25;
  private settings: AudioSettings = DEFAULT_SETTINGS;
  private listeners: Set<() => void> = new Set();

  constructor() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      this.settings = DEFAULT_SETTINGS;
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public getCrowdIntensity(): number {
    return this.crowdIntensity;
  }

  public getCurrentMode(): AudioContextMode {
    return this.currentMode;
  }

  public isAudioReady(): boolean {
    return this.isInitialized && this.ctx?.state === 'running';
  }

  public updateSettings(partial: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore storage quota errors
    }
    this.applyGainLevels();
    this.notify();
  }

  public ensureStarted() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.crowdGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.crowdGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.setupStadiumCrowdBed();
      this.startProceduralMusicLoop();
      this.isInitialized = true;
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.applyGainLevels();
    this.notify();
  }

  private applyGainLevels() {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.crowdGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const targetMaster = this.settings.masterMuted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(targetMaster, now, 0.05);

    const targetMusic = this.settings.musicEnabled ? this.settings.musicVolume : 0;
    this.musicGain.gain.setTargetAtTime(targetMusic, now, 0.15);

    const isStadiumActive =
      this.currentMode === 'match' ||
      this.currentMode === 'match_intro' ||
      this.currentMode === 'victory' ||
      this.currentMode === 'trophy';

    const targetCrowd = this.settings.crowdEnabled
      ? this.settings.crowdVolume * (isStadiumActive ? 1.0 : 0.14)
      : 0;
    this.crowdGain.gain.setTargetAtTime(targetCrowd, now, 0.25);

    const targetSfx = this.settings.sfxEnabled ? this.settings.sfxVolume : 0;
    this.sfxGain.gain.setTargetAtTime(targetSfx, now, 0.05);
  }

  public setMode(mode: AudioContextMode) {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.stepCounter = 0;
    if (mode === 'match' || mode === 'match_intro') {
      this.setCrowdBaseTension(0.38);
    } else if (mode === 'victory' || mode === 'trophy') {
      this.setCrowdBaseTension(0.82);
    } else if (mode === 'match_prep') {
      this.setCrowdBaseTension(0.22);
    } else {
      this.setCrowdBaseTension(0.14);
    }
    this.applyGainLevels();
    this.notify();
  }

  private setupStadiumCrowdBed() {
    if (!this.ctx || !this.crowdGain) return;

    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.025;
      b6 = white * 0.115926;
    }

    this.crowdSource = this.ctx.createBufferSource();
    this.crowdSource.buffer = buffer;
    this.crowdSource.loop = true;

    this.crowdFilter = this.ctx.createBiquadFilter();
    this.crowdFilter.type = 'bandpass';
    this.crowdFilter.frequency.value = 520;
    this.crowdFilter.Q.value = 0.7;

    this.crowdEnvelopeGain = this.ctx.createGain();
    this.crowdEnvelopeGain.gain.value = 0.25;

    this.crowdSource.connect(this.crowdFilter);
    this.crowdFilter.connect(this.crowdEnvelopeGain);
    this.crowdEnvelopeGain.connect(this.crowdGain);
    this.crowdSource.start();
  }

  public setCrowdBaseTension(level: number) {
    this.crowdIntensity = Math.max(0.1, Math.min(1, level));
    if (!this.ctx || !this.crowdEnvelopeGain || !this.crowdFilter) return;
    const now = this.ctx.currentTime;
    this.crowdEnvelopeGain.gain.setTargetAtTime(this.crowdIntensity * 0.55, now, 0.4);
    this.crowdFilter.frequency.setTargetAtTime(420 + this.crowdIntensity * 650, now, 0.4);
    this.notify();
  }

  public triggerCrowdReaction(
    type:
      | 'DOT'
      | 'SINGLE'
      | 'FOUR'
      | 'SIX'
      | 'WICKET'
      | 'APPEAL'
      | 'MATCH_INTRO'
      | 'INNINGS_BREAK'
      | 'LAST_OVER'
      | 'VICTORY'
      | 'DEFEAT'
  ) {
    this.ensureStarted();
    if (!this.ctx || !this.crowdEnvelopeGain || !this.crowdFilter) return;

    const now = this.ctx.currentTime;
    let peakGain = 0.35;
    let peakFreq = 650;
    let holdDuration = 0.8;

    switch (type) {
      case 'DOT':
        peakGain = 0.22;
        peakFreq = 480;
        holdDuration = 0.3;
        break;
      case 'SINGLE':
        peakGain = 0.38;
        peakFreq = 680;
        holdDuration = 0.6;
        break;
      case 'FOUR':
        peakGain = 0.78;
        peakFreq = 1150;
        holdDuration = 1.8;
        this.playBatCrack(true);
        this.playBroadcastSting([440, 554.37, 659.25]);
        break;
      case 'SIX':
        peakGain = 1.0;
        peakFreq = 1480;
        holdDuration = 2.6;
        this.playBatCrack(true);
        this.playBroadcastSting([523.25, 659.25, 783.99, 1046.5]);
        break;
      case 'WICKET':
        peakGain = 0.96;
        peakFreq = 1380;
        holdDuration = 2.4;
        this.playWicketTimber();
        this.playBroadcastSting([587.33, 440, 349.23]);
        break;
      case 'APPEAL':
        peakGain = 0.68;
        peakFreq = 980;
        holdDuration = 1.1;
        break;
      case 'MATCH_INTRO':
        peakGain = 0.85;
        peakFreq = 1220;
        holdDuration = 2.2;
        this.playBroadcastSting([392.0, 493.88, 587.33, 783.99]);
        break;
      case 'INNINGS_BREAK':
        peakGain = 0.55;
        peakFreq = 840;
        holdDuration = 1.5;
        this.playBroadcastSting([440, 523.25, 659.25]);
        break;
      case 'LAST_OVER':
        peakGain = 0.88;
        peakFreq = 1280;
        holdDuration = 2.0;
        this.playBroadcastSting([440, 466.16, 440, 587.33]);
        break;
      case 'VICTORY':
        peakGain = 1.0;
        peakFreq = 1600;
        holdDuration = 3.5;
        this.playTrophyFanfare();
        break;
      case 'DEFEAT':
        peakGain = 0.45;
        peakFreq = 540;
        holdDuration = 1.8;
        this.playBroadcastSting([392.0, 349.23, 293.66]);
        break;
    }

    this.crowdIntensity = peakGain;
    this.notify();

    this.crowdEnvelopeGain.gain.cancelScheduledValues(now);
    this.crowdEnvelopeGain.gain.setValueAtTime(this.crowdEnvelopeGain.gain.value, now);
    this.crowdEnvelopeGain.gain.linearRampToValueAtTime(peakGain, now + 0.18);
    this.crowdEnvelopeGain.gain.exponentialRampToValueAtTime(0.28, now + holdDuration + 1.2);

    this.crowdFilter.frequency.cancelScheduledValues(now);
    this.crowdFilter.frequency.setValueAtTime(this.crowdFilter.frequency.value, now);
    this.crowdFilter.frequency.linearRampToValueAtTime(peakFreq, now + 0.2);
    this.crowdFilter.frequency.exponentialRampToValueAtTime(520, now + holdDuration + 1.2);

    setTimeout(() => {
      this.crowdIntensity = this.currentMode === 'match' ? 0.35 : 0.15;
      this.notify();
    }, (holdDuration + 0.8) * 1000);
  }

  private startProceduralMusicLoop() {
    if (this.musicInterval) window.clearInterval(this.musicInterval);

    this.musicInterval = window.setInterval(() => {
      if (
        !this.ctx ||
        this.ctx.state !== 'running' ||
        !this.settings.musicEnabled ||
        this.settings.masterMuted ||
        !this.musicGain
      ) {
        return;
      }

      const step = this.stepCounter % 16;
      this.stepCounter++;

      switch (this.currentMode) {
        case 'dashboard':
        case 'menu': {
          // 1. Main Dashboard: Warm ambient management pad
          const padNotes = [146.83, 164.81, 196.0, 220.0];
          if (step % 4 === 0) {
            const freq = padNotes[(step / 4) % padNotes.length];
            this.playAmbientPadNote(freq, 1.6, 0.08);
          }
          if (step % 8 === 0) {
            this.playAmbientPadNote(73.42, 2.2, 0.1);
          }
          break;
        }
        case 'match_prep': {
          // 2. Match Preparation: Focused tactical war-room pulse
          const prepArp = [196.0, 246.94, 293.66, 392.0];
          if (step % 2 === 0) {
            this.playPulsePluck(prepArp[(step / 2) % prepArp.length], 0.35, 0.07);
          }
          if (step % 8 === 0) {
            this.playAmbientPadNote(98.0, 1.9, 0.09);
          }
          break;
        }
        case 'match_intro': {
          // 3. Match Introduction: Heroic broadcast anthem chord progression
          const anthemNotes = [261.63, 329.63, 392.0, 523.25];
          if (step % 2 === 0) {
            this.playPulsePluck(anthemNotes[(step / 2) % anthemNotes.length], 0.4, 0.1);
          }
          if (step % 4 === 0) {
            this.playAmbientPadNote(130.81, 1.5, 0.11);
          }
          break;
        }
        case 'match': {
          // 4. Live Match: Subtle low broadcast sub-bed beneath stadium crowd
          if (step % 8 === 0) {
            this.playAmbientPadNote(130.81, 1.8, 0.045);
          }
          break;
        }
        case 'auction': {
          // 5. Auction Room: High-stakes rhythmic bidding suspense
          const tensionArp = [220, 261.63, 293.66, 329.63, 293.66, 261.63, 220, 196];
          const freq = tensionArp[step % tensionArp.length];
          this.playPulsePluck(freq, 0.28, 0.09);
          if (step % 4 === 0) {
            this.playAmbientPadNote(110, 0.9, 0.11);
          }
          break;
        }
        case 'victory':
        case 'trophy': {
          // 6 & 7. Victory Celebration / Trophy Ceremony: Uplifting major fanfare arpeggio
          const victoryArp = [293.66, 369.99, 440.0, 587.33, 440.0, 587.33, 739.99, 880.0];
          const freq = victoryArp[step % victoryArp.length];
          this.playPulsePluck(freq, 0.35, 0.09);
          if (step % 4 === 0) {
            this.playAmbientPadNote(146.83, 1.4, 0.1);
          }
          break;
        }
      }
    }, 450);
  }

  private playAmbientPadNote(freq: number, duration: number, volume: number) {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  private playPulsePluck(freq: number, duration: number, volume: number) {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playClick() {
    this.ensureStarted();
    if (!this.ctx || !this.sfxGain || !this.settings.sfxEnabled || this.settings.masterMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.045);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playCoinFlip() {
    this.ensureStarted();
    if (!this.ctx || !this.sfxGain || !this.settings.sfxEnabled || this.settings.masterMuted) return;
    const now = this.ctx.currentTime;
    [1318.5, 1760.0, 2637.0].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.18, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.38);
    });
  }

  public playNavigate() {
    this.ensureStarted();
    if (!this.ctx || !this.sfxGain || !this.settings.sfxEnabled || this.settings.masterMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playAuctionBid(aggressive = false) {
    this.ensureStarted();
    if (!this.ctx || !this.sfxGain || !this.settings.sfxEnabled || this.settings.masterMuted) return;
    const now = this.ctx.currentTime;
    const notes = aggressive ? [587.33, 880, 1174.66] : [523.25, 783.99];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = aggressive ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.16, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.2);
    });
  }

  public playGavelSold() {
    this.ensureStarted();
    if (!this.ctx || !this.sfxGain || !this.settings.sfxEnabled || this.settings.masterMuted) return;
    const now = this.ctx.currentTime;
    [0, 0.18].forEach((offset) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, now + offset);
      osc.frequency.exponentialRampToValueAtTime(55, now + offset + 0.11);

      gain.gain.setValueAtTime(0.45, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.13);
    });
    this.playBroadcastSting([440, 554.37, 659.25, 880]);
  }

  public playBatCrack(sweetSpot = false) {
    if (!this.ctx || !this.sfxGain || !this.settings.sfxEnabled || this.settings.masterMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(sweetSpot ? 320 : 240, now);
    osc.frequency.exponentialRampToValueAtTime(68, now + 0.075);

    gain.gain.setValueAtTime(sweetSpot ? 0.42 : 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playWicketTimber() {
    if (!this.ctx || !this.sfxGain || !this.settings.sfxEnabled || this.settings.masterMuted) return;
    const now = this.ctx.currentTime;
    [390, 460, 310].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.045);
      osc.frequency.exponentialRampToValueAtTime(110, now + i * 0.045 + 0.09);

      gain.gain.setValueAtTime(0.24, now + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.045);
      osc.stop(now + i * 0.045 + 0.11);
    });
  }

  public playBroadcastSting(frequencies: number[]) {
    if (!this.ctx || !this.sfxGain || !this.settings.sfxEnabled || this.settings.masterMuted) return;
    const now = this.ctx.currentTime;
    frequencies.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.14, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.48);
    });
  }

  public playTrophyFanfare() {
    this.playBroadcastSting([440, 554.37, 659.25, 880, 1108.73]);
  }
}

export const audioEngine = new StadiumAudioEngine();
