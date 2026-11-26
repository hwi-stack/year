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

function scheduleSingleFirework(
  ctx: AudioContext,
  startOffsetSec: number,
  intensity = 1
): void {
  const start = ctx.currentTime + startOffsetSec;

  // 1. Brief ascending firework launch whistle
  const whistle = ctx.createOscillator();
  const whistleGain = ctx.createGain();
  whistle.type = 'sine';
  whistle.frequency.setValueAtTime(340, start);
  whistle.frequency.exponentialRampToValueAtTime(1050, start + 0.14);

  whistleGain.gain.setValueAtTime(0.001, start);
  whistleGain.gain.exponentialRampToValueAtTime(0.04 * intensity, start + 0.04);
  whistleGain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

  whistle.connect(whistleGain);
  whistleGain.connect(ctx.destination);
  whistle.start(start);
  whistle.stop(start + 0.16);

  // 2. Punchy burst pop ("펑!")
  const burstStart = start + 0.13;
  const thump = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.type = 'triangle';
  thump.frequency.setValueAtTime(170, burstStart);
  thump.frequency.exponentialRampToValueAtTime(42, burstStart + 0.18);

  thumpGain.gain.setValueAtTime(0.001, burstStart);
  thumpGain.gain.exponentialRampToValueAtTime(0.28 * intensity, burstStart + 0.01);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, burstStart + 0.22);

  thump.connect(thumpGain);
  thumpGain.connect(ctx.destination);
  thump.start(burstStart);
  thump.stop(burstStart + 0.24);

  // 3. Burst air-explosion whoosh (filtered noise)
  const explosionNoise = ctx.createBufferSource();
  explosionNoise.buffer = createNoiseBuffer(ctx, 0.55);
  const expFilter = ctx.createBiquadFilter();
  expFilter.type = 'bandpass';
  expFilter.frequency.setValueAtTime(1200, burstStart);
  expFilter.frequency.exponentialRampToValueAtTime(320, burstStart + 0.45);
  expFilter.Q.value = 0.9;

  const expGain = ctx.createGain();
  expGain.gain.setValueAtTime(0.001, burstStart);
  expGain.gain.exponentialRampToValueAtTime(0.26 * intensity, burstStart + 0.012);
  expGain.gain.exponentialRampToValueAtTime(0.001, burstStart + 0.5);

  explosionNoise.connect(expFilter);
  expFilter.connect(expGain);
  expGain.connect(ctx.destination);
  explosionNoise.start(burstStart);
  explosionNoise.stop(burstStart + 0.52);

  // 4. Crisp sparkling crackle pops ("타다닥!")
  const crackleCount = 8;
  for (let i = 0; i < crackleCount; i += 1) {
    const crackleTime = burstStart + 0.08 + i * 0.065 + (i % 2) * 0.02;
    const crackleSrc = ctx.createBufferSource();
    crackleSrc.buffer = createNoiseBuffer(ctx, 0.045);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2400 + (i % 3) * 700, crackleTime);

    const crackleGain = ctx.createGain();
    const vol = (0.09 - i * 0.007) * intensity;
    crackleGain.gain.setValueAtTime(0.001, crackleTime);
    crackleGain.gain.exponentialRampToValueAtTime(
      Math.max(0.02, vol),
      crackleTime + 0.004
    );
    crackleGain.gain.exponentialRampToValueAtTime(0.001, crackleTime + 0.04);

    crackleSrc.connect(hp);
    hp.connect(crackleGain);
    crackleGain.connect(ctx.destination);
    crackleSrc.start(crackleTime);
    crackleSrc.stop(crackleTime + 0.045);
  }
}

/** Play celebratory firework bursts ("폭죽 소리") when winning numbers finish revealing */
export function playCelebrationFanfare(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  scheduleSingleFirework(ctx, 0.0, 1.0);
  scheduleSingleFirework(ctx, 0.32, 0.85);
  scheduleSingleFirework(ctx, 0.68, 0.9);
}
