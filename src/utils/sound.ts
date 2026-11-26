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

function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** Crisp ascending bell chime when each digit (ones -> tens) snaps into place */
export function playDigitRevealSound(step: number, enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Ascending bright pitches for step 1 (ones) -> step 2 (tens) -> step 3+
  const pitches = [783.99, 987.77, 1174.66]; // G5 -> B5 -> D6
  const freq = pitches[Math.min(Math.max(step - 1, 0), pitches.length - 1)];

  // Crisp bell fundamental
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, now);

  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.exponentialRampToValueAtTime(0.22, now + 0.012);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.44);

  // Bright chime overtone
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, now);

  gain2.gain.setValueAtTime(0.001, now);
  gain2.gain.exponentialRampToValueAtTime(0.09, now + 0.008);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now);
  osc2.stop(now + 0.27);
}

/**
 * Short, punchy, festive winter-Christmas stage impact sound (~1.2s):
 * Bright ascending sparkle arpeggio + warm celebratory chord + crisp firework sparkle pop
 */
export function playCelebrationFanfare(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. Punchy low-end celebratory pop impact
  const impactOsc = ctx.createOscillator();
  const impactGain = ctx.createGain();
  impactOsc.type = 'triangle';
  impactOsc.frequency.setValueAtTime(190, now);
  impactOsc.frequency.exponentialRampToValueAtTime(48, now + 0.16);

  impactGain.gain.setValueAtTime(0.001, now);
  impactGain.gain.exponentialRampToValueAtTime(0.28, now + 0.01);
  impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  impactOsc.connect(impactGain);
  impactGain.connect(ctx.destination);
  impactOsc.start(now);
  impactOsc.stop(now + 0.22);

  // 2. Short, crisp firework sparkle burst
  const burstNoise = ctx.createBufferSource();
  burstNoise.buffer = createNoiseBuffer(ctx, 0.38);
  const burstFilter = ctx.createBiquadFilter();
  burstFilter.type = 'bandpass';
  burstFilter.frequency.setValueAtTime(1800, now);
  burstFilter.frequency.exponentialRampToValueAtTime(650, now + 0.34);
  burstFilter.Q.value = 0.8;

  const burstGain = ctx.createGain();
  burstGain.gain.setValueAtTime(0.001, now);
  burstGain.gain.exponentialRampToValueAtTime(0.16, now + 0.012);
  burstGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

  burstNoise.connect(burstFilter);
  burstFilter.connect(burstGain);
  burstGain.connect(ctx.destination);
  burstNoise.start(now);
  burstNoise.stop(now + 0.38);

  // 3. Fast, uplifting 4-note festive fanfare arpeggio landing on a bright Christmas bell chord
  const fanfareNotes = [
    { freq: 523.25, offset: 0.0, dur: 0.16 },  // C5
    { freq: 659.25, offset: 0.07, dur: 0.16 }, // E5
    { freq: 783.99, offset: 0.14, dur: 0.16 }, // G5
    { freq: 1046.5, offset: 0.21, dur: 0.85 }, // C6 (bright peak)
  ];

  fanfareNotes.forEach(({ freq, offset, dur }) => {
    const start = now + offset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  });

  // 4. Warm ringing festive chord + sleigh-bell sparkle at peak (0.21s)
  const peakTime = now + 0.21;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, peakTime);

    gain.gain.setValueAtTime(0.001, peakTime);
    gain.gain.exponentialRampToValueAtTime(0.075, peakTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, peakTime + 0.92);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(peakTime);
    osc.stop(peakTime + 0.95);
  });

  // Crisp sleigh-bell shimmer on peak
  [2637, 3136, 3951].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, peakTime);

    gain.gain.setValueAtTime(0.0005, peakTime);
    gain.gain.exponentialRampToValueAtTime(0.02, peakTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0005, peakTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(peakTime);
    osc.stop(peakTime + 0.26);
  });
}
