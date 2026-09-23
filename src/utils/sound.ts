// Web Audio API synthesized sound notifications for file transfers
// Zero external network requests, ultra-lightweight, and soft/subtle audio design

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (e) {
    console.warn('AudioContext not supported or blocked', e);
    return null;
  }
}

export function isSoundEnabled(): boolean {
  try {
    const setting = localStorage.getItem('peerdrop_sound_enabled');
    return setting === null ? true : setting === 'true';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('peerdrop_sound_enabled', enabled ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to save sound preference', e);
  }
}

/**
 * Plays a gentle, pleasant ascending two-tone chime when transfer is initiated
 */
export function playInitiatedSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // First tone (523.25 Hz - C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.25);

    // Second tone (659.25 Hz - E5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.1);

    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.09, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);
  } catch (e) {
    console.warn('Could not play initiated sound', e);
  }
}

/**
 * Plays an upbeat, soothing 3-note harmonic chime when transfer completes
 */
export function playCompletedSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, time: 0.0, duration: 0.35, gain: 0.08 }, // C5
      { freq: 659.25, time: 0.12, duration: 0.35, gain: 0.09 }, // E5
      { freq: 783.99, time: 0.24, duration: 0.55, gain: 0.11 }, // G5
      { freq: 1046.50, time: 0.36, duration: 0.7, gain: 0.07 }, // C6
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      gain.gain.setValueAtTime(0, now + note.time);
      gain.gain.linearRampToValueAtTime(note.gain, now + note.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.duration);
    });
  } catch (e) {
    console.warn('Could not play completed sound', e);
  }
}

/**
 * Plays a soft, subtle descending double-tap error tone
 */
export function playErrorSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Tone 1 (349.23 Hz - F4)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(349.23, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.09, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.18);

    // Tone 2 (261.63 Hz - C4)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(261.63, now + 0.12);

    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.12);
    osc2.stop(now + 0.32);
  } catch (e) {
    console.warn('Could not play error sound', e);
  }
}
