// Gentle Web Audio API synthesizer for instant in-app alerts without external audio file dependencies
class NotificationAudioPlayer {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public playChime(type: 'baking' | 'shipped' | 'delivered' | 'cancelled' | 'default' = 'default') {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'delivered') {
        // Joyful 3-tone arpeggio (C5 -> E5 -> G5 -> C6)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + index * 0.08);

          gain.gain.setValueAtTime(0, now + index * 0.08);
          gain.gain.linearRampToValueAtTime(0.15, now + index * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + index * 0.08);
          osc.stop(now + index * 0.08 + 0.4);
        });
      } else if (type === 'shipped') {
        // Upbeat delivery chime (G4 -> C5 -> E5)
        const notes = [392.0, 523.25, 659.25];
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + index * 0.09);

          gain.gain.setValueAtTime(0, now + index * 0.09);
          gain.gain.linearRampToValueAtTime(0.18, now + index * 0.09 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.09 + 0.3);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + index * 0.09);
          osc.stop(now + index * 0.09 + 0.35);
        });
      } else if (type === 'baking') {
        // Warm double chime (E5 -> A5)
        const notes = [659.25, 880.0];
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + index * 0.1);

          gain.gain.setValueAtTime(0, now + index * 0.1);
          gain.gain.linearRampToValueAtTime(0.12, now + index * 0.1 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.25);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + index * 0.1);
          osc.stop(now + index * 0.1 + 0.3);
        });
      } else {
        // Standard notification chime (C5 -> G5)
        const notes = [523.25, 783.99];
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + index * 0.08);

          gain.gain.setValueAtTime(0, now + index * 0.08);
          gain.gain.linearRampToValueAtTime(0.12, now + index * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.25);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + index * 0.08);
          osc.stop(now + index * 0.08 + 0.3);
        });
      }
    } catch {
      // Audio playback fails silently if restricted
    }
  }
}

export const notificationAudio = new NotificationAudioPlayer();
