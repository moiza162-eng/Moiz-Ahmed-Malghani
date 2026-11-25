import { AlertSoundId } from '../types/schedule';

export interface SoundProfileMeta {
  id: AlertSoundId;
  name: string;
  character: string;
  recommendedFor: string;
  patternSummary: string;
}

export const SOUND_PROFILES: SoundProfileMeta[] = [
  {
    id: 'urgent-beacon',
    name: 'Urgent Two-Tone Beacon',
    character: 'High-contrast alternating dual pitch',
    recommendedFor: 'Urgent deadlines & critical meetings',
    patternSummary: '880 Hz / 1175 Hz · 3-cycle pulse',
  },
  {
    id: 'sharp-pulse',
    name: 'Sharp Pulse Alarm',
    character: 'Crisp staccato triple chime',
    recommendedFor: 'Immediate start warnings',
    patternSummary: '1046 Hz · Rapid triple burst',
  },
  {
    id: 'executive-chime',
    name: 'Executive Chord Chime',
    character: 'Balanced harmonic tone',
    recommendedFor: 'Important meetings & transitions',
    patternSummary: 'C5 Major 7 · Resonant chime',
  },
  {
    id: 'cascade-bell',
    name: 'Crisp Bell Cascade',
    character: 'Ascending four-note acoustic bell',
    recommendedFor: 'Preparation & 10-minute lead reminders',
    patternSummary: 'D5 – F#5 – A5 – D6 · Ascending',
  },
];

class AudioAlertEngine {
  private ctx: AudioContext | null = null;
  private loopTimer: number | null = null;
  private activeNodes: AudioNode[] = [];
  private isLooping = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }

  public getState(): 'unlocked' | 'locked' | 'unsupported' {
    if (typeof window === 'undefined') return 'unsupported';
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return 'unsupported';
    if (!this.ctx) return 'locked';
    return this.ctx.state === 'running' ? 'unlocked' : 'locked';
  }

  public async unlock(): Promise<boolean> {
    const ctx = this.getContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    return ctx.state === 'running';
  }

  private scheduleTone(
    ctx: AudioContext,
    freq: number,
    startOffset: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
    peakGainMultiplier = 1
  ) {
    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    const safeVolume = Math.max(0.02, Math.min(1, volume)) * 0.36 * peakGainMultiplier;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(safeVolume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.03);

    this.activeNodes.push(osc, gain);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // ignore cleanup errors
      }
    };
  }

  public async playOnce(soundId: AlertSoundId, volume = 0.85): Promise<boolean> {
    const unlocked = await this.unlock();
    const ctx = this.getContext();
    if (!unlocked || !ctx) return false;

    switch (soundId) {
      case 'urgent-beacon': {
        // Urgent unmistakable dual-tone alternating beacon (3 cycles)
        for (let i = 0; i < 3; i++) {
          const base = i * 0.38;
          this.scheduleTone(ctx, 880, base, 0.16, volume, 'triangle', 1.0);
          this.scheduleTone(ctx, 1174.66, base + 0.17, 0.18, volume, 'triangle', 1.05);
        }
        break;
      }
      case 'sharp-pulse': {
        // High-priority triple staccato pulse twice
        const offsets = [0, 0.15, 0.3, 0.62, 0.77, 0.92];
        offsets.forEach((offset) => {
          this.scheduleTone(ctx, 1046.5, offset, 0.11, volume, 'triangle', 1.0);
          this.scheduleTone(ctx, 1567.98, offset, 0.09, volume, 'sine', 0.45);
        });
        break;
      }
      case 'executive-chime': {
        // Balanced two-step harmonic chord chime
        this.scheduleTone(ctx, 523.25, 0, 0.55, volume, 'sine', 0.85);
        this.scheduleTone(ctx, 659.25, 0.04, 0.55, volume, 'sine', 0.75);
        this.scheduleTone(ctx, 783.99, 0.08, 0.65, volume, 'sine', 0.7);
        this.scheduleTone(ctx, 1046.5, 0.22, 0.85, volume, 'sine', 0.9);
        break;
      }
      case 'cascade-bell': {
        // Ascending crystal bell cascade
        const notes = [587.33, 739.99, 880, 1174.66];
        notes.forEach((freq, idx) => {
          this.scheduleTone(ctx, freq, idx * 0.13, 0.52, volume, 'sine', 0.9);
        });
        break;
      }
    }
    return true;
  }

  public async startUrgentLoop(soundId: AlertSoundId, volume = 0.85): Promise<boolean> {
    this.stopLoop();
    this.isLooping = true;
    const played = await this.playOnce(soundId, volume);
    if (!this.isLooping) return played;

    this.loopTimer = window.setInterval(() => {
      if (!this.isLooping) return;
      void this.playOnce(soundId, volume);
    }, 3200);

    return played;
  }

  public stopLoop(): void {
    this.isLooping = false;
    if (this.loopTimer !== null) {
      window.clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    this.activeNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // already stopped
      }
    });
    this.activeNodes = [];
  }
}

export const audioEngine = new AudioAlertEngine();
