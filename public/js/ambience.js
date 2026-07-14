// Paisaje sonoro procedural del narrador (WebAudio, sin assets externos):
// noche = viento + grillos + búho ocasional + drone grave; día = brisa y pájaros.
// Se atenúa solo mientras suena la narración.
import { isNarratorSpeaking } from './narration.js';

let ctx = null;
let master = null;
let mode = null; // 'night' | 'day' | null
let timers = [];
let duckTimer = null;
const BASE_GAIN = 0.16;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = BASE_GAIN;
    master.connect(ctx.destination);
    // Atenuación automática bajo la voz.
    duckTimer = setInterval(() => {
      if (!ctx || !master) return;
      const target = isNarratorSpeaking() ? BASE_GAIN * 0.25 : BASE_GAIN;
      master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.4);
    }, 300);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => { /* falta gesto */ });
  return true;
}

function noiseBuffer(seconds = 4) {
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

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function later(minMs, maxMs, fn) {
  const t = setTimeout(() => { fn(); }, minMs + Math.random() * (maxMs - minMs));
  timers.push(t);
}

// Un tono breve con envolvente (para grillos, búhos y pájaros).
function blip({ freq, to = null, dur, gain, type = 'sine', when = 0 }) {
  const t0 = ctx.currentTime + when;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

let stopFns = [];

function startWind(level, cutoff) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(5);
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
  lfo.connect(lfoGain); lfoGain.connect(g.gain);
  src.connect(lp); lp.connect(g); g.connect(master);
  src.start(); lfo.start();
  stopFns.push(() => { try { src.stop(); lfo.stop(); } catch { /* ya parado */ } });
}

function startDrone() {
  for (const [f, level] of [[55, 0.05], [55.7, 0.04]]) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = level;
    o.connect(g); g.connect(master);
    o.start();
    stopFns.push(() => { try { o.stop(); } catch { /* ya parado */ } });
  }
}

function cricketLoop() {
  if (mode !== 'night') return;
  // Trenecito de chirridos.
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    blip({ freq: 4200 + Math.random() * 400, dur: 0.05, gain: 0.012, type: 'square', when: i * 0.09 });
  }
  later(1200, 4000, cricketLoop);
}

function owlLoop() {
  if (mode !== 'night') return;
  blip({ freq: 330, to: 255, dur: 0.5, gain: 0.05 });
  blip({ freq: 320, to: 245, dur: 0.7, gain: 0.045, when: 0.65 });
  later(18000, 45000, owlLoop);
}

function birdLoop() {
  if (mode !== 'day') return;
  const base = 2200 + Math.random() * 1200;
  const n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    blip({ freq: base + Math.random() * 500, to: base * 0.75, dur: 0.12, gain: 0.02, when: i * 0.18 });
  }
  later(2500, 7000, birdLoop);
}

// Cambia (o mantiene) el modo del paisaje. null = silencio.
export function ensureAmbience(wanted) {
  if (wanted === mode) { if (wanted && ctx) ensureCtx(); return; }
  stopAmbience();
  if (!wanted) return;
  if (!ensureCtx()) return;
  mode = wanted;
  if (wanted === 'night') {
    startWind(0.5, 320);
    startDrone();
    later(500, 2000, cricketLoop);
    later(4000, 15000, owlLoop);
  } else {
    startWind(0.3, 900);
    later(500, 2000, birdLoop);
  }
}

export function stopAmbience() {
  mode = null;
  clearTimers();
  stopFns.forEach((fn) => fn());
  stopFns = [];
}

// Tras un gesto del usuario: despierta el contexto de audio.
export function kickAmbience() {
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => { /* nada */ });
}
