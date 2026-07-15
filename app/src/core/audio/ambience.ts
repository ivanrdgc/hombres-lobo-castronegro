// Paisaje sonoro procedural del narrador (WebAudio, sin assets externos):
// noche = viento + grillos + búho ocasional + drone grave; día = brisa y
// pájaros. Port de la v1 sobre el AudioContext COMPARTIDO: la atenuación bajo
// la voz ahora es por eventos (onSpeaking), sin sondeo.
import { getEngine } from './engine';
import { onSpeaking } from './player';

const BASE_GAIN = 0.16;

let mode: 'night' | 'day' | null = null;
let timers: ReturnType<typeof setTimeout>[] = [];
let stopFns: (() => void)[] = [];
let gain: GainNode | null = null;
let duckUnsub: (() => void) | null = null;

function ensureNodes(): AudioContext | null {
  const engine = getEngine();
  if (!engine) return null;
  if (!gain) {
    gain = engine.ctx.createGain();
    gain.gain.value = BASE_GAIN;
    gain.connect(engine.ambienceBus);
    // Atenuación automática bajo la voz, dirigida por eventos.
    duckUnsub = onSpeaking((speaking) => {
      if (!gain) return;
      const target = speaking ? BASE_GAIN * 0.25 : BASE_GAIN;
      gain.gain.linearRampToValueAtTime(target, engine.ctx.currentTime + 0.4);
    });
  }
  if (engine.ctx.state === 'suspended') engine.ctx.resume().catch(() => { /* falta gesto */ });
  return engine.ctx;
}

function noiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { // ruido marrón (viento)
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

function clearTimers(): void {
  timers.forEach(clearTimeout);
  timers = [];
}

function later(minMs: number, maxMs: number, fn: () => void): void {
  const t = setTimeout(fn, minMs + Math.random() * (maxMs - minMs));
  timers.push(t);
}

// Un tono breve con envolvente (para grillos, búhos y pájaros).
function blip(ctx: AudioContext, opts: { freq: number; to?: number | null; dur: number; gain: number; type?: OscillatorType; when?: number }): void {
  if (!gain) return;
  const { freq, to = null, dur, gain: level, type = 'sine', when = 0 } = opts;
  const t0 = ctx.currentTime + when;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(level, t0 + dur * 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(gain);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function startWind(ctx: AudioContext, level: number, cutoff: number): void {
  if (!gain) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 5);
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = cutoff;
  const g = ctx.createGain();
  g.gain.value = level;
  // Ráfagas lentas de viento.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.06 + Math.random() * 0.04;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = level * 0.5;
  lfo.connect(lfoGain);
  lfoGain.connect(g.gain);
  src.connect(lp);
  lp.connect(g);
  g.connect(gain);
  src.start();
  lfo.start();
  stopFns.push(() => {
    try { src.stop(); lfo.stop(); } catch { /* ya parado */ }
  });
}

function startDrone(ctx: AudioContext): void {
  if (!gain) return;
  for (const [f, level] of [[55, 0.05], [55.7, 0.04]] as const) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = level;
    o.connect(g);
    g.connect(gain);
    o.start();
    stopFns.push(() => {
      try { o.stop(); } catch { /* ya parado */ }
    });
  }
}

function cricketLoop(ctx: AudioContext): void {
  if (mode !== 'night') return;
  // Trenecito de chirridos.
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    blip(ctx, { freq: 4200 + Math.random() * 400, dur: 0.05, gain: 0.012, type: 'square', when: i * 0.09 });
  }
  later(1200, 4000, () => cricketLoop(ctx));
}

function owlLoop(ctx: AudioContext): void {
  if (mode !== 'night') return;
  blip(ctx, { freq: 330, to: 255, dur: 0.5, gain: 0.05 });
  blip(ctx, { freq: 320, to: 245, dur: 0.7, gain: 0.045, when: 0.65 });
  later(18000, 45000, () => owlLoop(ctx));
}

function birdLoop(ctx: AudioContext): void {
  if (mode !== 'day') return;
  const base = 2200 + Math.random() * 1200;
  const n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    blip(ctx, { freq: base + Math.random() * 500, to: base * 0.75, dur: 0.12, gain: 0.02, when: i * 0.18 });
  }
  later(2500, 7000, () => birdLoop(ctx));
}

// Cambia (o mantiene) el modo del paisaje. null = silencio.
export function ensureAmbience(wanted: 'night' | 'day' | null): void {
  if (wanted === mode) {
    if (wanted) ensureNodes();
    return;
  }
  stopAmbience();
  if (!wanted) return;
  const ctx = ensureNodes();
  if (!ctx) return;
  mode = wanted;
  if (wanted === 'night') {
    startWind(ctx, 0.5, 320);
    startDrone(ctx);
    later(500, 2000, () => cricketLoop(ctx));
    later(4000, 15000, () => owlLoop(ctx));
  } else {
    startWind(ctx, 0.3, 900);
    later(500, 2000, () => birdLoop(ctx));
  }
}

export function stopAmbience(): void {
  mode = null;
  clearTimers();
  stopFns.forEach((fn) => fn());
  stopFns = [];
}

export function disposeAmbience(): void {
  stopAmbience();
  if (duckUnsub) {
    duckUnsub();
    duckUnsub = null;
  }
}
