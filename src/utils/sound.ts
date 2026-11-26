let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/** Soft wooden/bell tick while digits are spinning */
export function playSpinTick(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(620, now + 0.035);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.032, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.045);
}

/** Warm holiday chime when each individual digit (ones, tens) locks in */
export function playDigitRevealChime(step: number, enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Bright ascending celesta intervals: C5 -> E5 -> G5
  const baseFreqs = [523.25, 659.25, 783.99];
  const freq = baseFreqs[Math.min(step - 1, baseFreqs.length - 1)] || 523.25;

  // Fundamental + gentle harmonic shimmer
  [1, 2].forEach((harmonic, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = idx === 0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq * harmonic, now);

    const peak = idx === 0 ? 0.16 : 0.045;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.58);
  });
}

/** Play a single sleigh-bell-like shimmer burst */
function scheduleSleighBell(ctx: AudioContext, startTime: number, volume = 0.03) {
  const freqs = [2637, 3136, 3520, 4186];
  freqs.forEach((f) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, startTime);

    gain.gain.setValueAtTime(0.0005, startTime);
    gain.gain.exponentialRampToValueAtTime(volume / freqs.length, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0005, startTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.15);
  });
}

/** Play a warm celesta/music-box note */
function scheduleWarmNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume = 0.13
) {
  // Main warm triangle tone
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, startTime);

  gain1.gain.setValueAtTime(0.001, startTime);
  gain1.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(startTime);
  osc1.stop(startTime + duration + 0.02);

  // Subtle octave overtone sparkle
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, startTime);

  gain2.gain.setValueAtTime(0.001, startTime);
  gain2.gain.exponentialRampToValueAtTime(volume * 0.25, startTime + 0.015);
  gain2.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.75);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(startTime);
  osc2.stop(startTime + duration + 0.02);
}

/**
 * Festive warm winter Christmas celebration music ("We Wish You a Merry Christmas" celebratory phrase + warm chord + sleigh bells)
 */
export function playCelebrationFanfare(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Celebratory Christmas melody phrase in G major / C major bright key:
  // "We wish you a Merry Christmas!" celebratory motif
  const melody: Array<{ freq: number; offset: number; dur: number; bell?: boolean }> = [
    { freq: 392.0, offset: 0.0, dur: 0.26, bell: true },   // G4
    { freq: 523.25, offset: 0.22, dur: 0.26 },              // C5
    { freq: 523.25, offset: 0.44, dur: 0.16 },              // C5
    { freq: 587.33, offset: 0.58, dur: 0.16 },              // D5
    { freq: 523.25, offset: 0.72, dur: 0.16 },              // C5
    { freq: 493.88, offset: 0.86, dur: 0.16 },              // B4
    { freq: 440.0, offset: 1.0, dur: 0.32, bell: true },    // A4
    { freq: 440.0, offset: 1.26, dur: 0.28 },               // A4
    { freq: 587.33, offset: 1.48, dur: 0.26, bell: true },  // D5
    { freq: 587.33, offset: 1.7, dur: 0.16 },               // D5
    { freq: 659.25, offset: 1.84, dur: 0.16 },              // E5
    { freq: 587.33, offset: 1.98, dur: 0.16 },              // D5
    { freq: 523.25, offset: 2.12, dur: 0.16 },              // C5
    { freq: 493.88, offset: 2.26, dur: 0.34, bell: true },  // B4
    { freq: 392.0, offset: 2.54, dur: 0.28 },               // G4
    { freq: 659.25, offset: 2.76, dur: 0.26, bell: true },  // E5
    { freq: 659.25, offset: 2.98, dur: 0.16 },              // E5
    { freq: 698.46, offset: 3.12, dur: 0.16 },              // F5
    { freq: 659.25, offset: 3.26, dur: 0.16 },              // E5
    { freq: 587.33, offset: 3.4, dur: 0.16 },               // D5
    { freq: 523.25, offset: 3.54, dur: 0.38, bell: true },  // C5
    { freq: 440.0, offset: 3.84, dur: 0.28 },               // A4
    { freq: 392.0, offset: 4.08, dur: 0.22 },               // G4
    { freq: 392.0, offset: 4.26, dur: 0.22 },               // G4
    { freq: 440.0, offset: 4.46, dur: 0.28, bell: true },   // A4
    { freq: 587.33, offset: 4.7, dur: 0.28 },               // D5
    { freq: 493.88, offset: 4.94, dur: 0.28 },              // B4
    { freq: 523.25, offset: 5.2, dur: 1.15, bell: true },   // C5 final resolve!
  ];

  // Warm supporting harmony chords (C major -> F major -> G7 -> C major)
  const chords: Array<{ freqs: number[]; offset: number; dur: number }> = [
    { freqs: [261.63, 329.63, 392.0], offset: 0.22, dur: 0.85 },
    { freqs: [220.0, 261.63, 349.23], offset: 1.0, dur: 0.85 },
    { freqs: [246.94, 293.66, 392.0], offset: 2.26, dur: 0.75 },
    { freqs: [261.63, 329.63, 392.0], offset: 3.54, dur: 0.8 },
    { freqs: [261.63, 329.63, 392.0, 523.25], offset: 5.2, dur: 1.3 },
  ];

  chords.forEach((chord) => {
    chord.freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + chord.offset);

      gain.gain.setValueAtTime(0.001, now + chord.offset);
      gain.gain.exponentialRampToValueAtTime(0.032, now + chord.offset + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + chord.offset + chord.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + chord.offset);
      osc.stop(now + chord.offset + chord.dur + 0.05);
    });
  });

  melody.forEach((note) => {
    scheduleWarmNote(ctx, note.freq, now + note.offset, note.dur, 0.13);
    if (note.bell) {
      scheduleSleighBell(ctx, now + note.offset, 0.035);
    }
  });
}
