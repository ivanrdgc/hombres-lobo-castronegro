// Paisaje sonoro procedural del narrador (WebAudio, sin un solo fichero de
// audio): cada juego tiene su ESCENA, compuesta con unos pocos ladrillos
// sintetizados —lechos de ruido, drones, chispazos con envolvente— y eventos
// sueltos que se disparan a intervalos aleatorios. Suena en el dispositivo que
// narra, por debajo de la voz (se atenúa solo cuando el narrador habla).
//
// Añadir una escena = una entrada en SCENES. Nada de assets ni de descargas.
import { getEngine } from './engine';
import { onSpeaking } from './player';

const BASE_GAIN = 0.16;

/** Escenas disponibles. `night`/`day` son las del pueblo (Hombres Lobo, Una Noche). */
export type SceneId =
  | 'night' | 'day'
  | 'espia' | 'insider' | 'chameleon' | 'coup' | 'avalon' | 'secret_hitler'
  | 'two_rooms' | 'codenames' | 'decrypto' | 'good_cop' | 'shadow_hunters'
  | 'sonar' | 'wavelength' | 'skull' | 'love_letter';

let mode: SceneId | null = null;
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

// ——— Ladrillos ———

/** Ruido marrón (grave, tipo viento/casco) o blanco (agudo, tipo lluvia/estática). */
function noiseBuffer(ctx: AudioContext, seconds: number, brown: boolean): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    if (!brown) { d[i] = white * 0.6; continue; }
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
  timers.push(setTimeout(fn, minMs + Math.random() * (maxMs - minMs)));
}

/** Repite `fn` a intervalos aleatorios mientras no cambie la escena. */
function loop(scene: SceneId, minMs: number, maxMs: number, fn: () => void): void {
  const tick = (): void => {
    if (mode !== scene) return;
    fn();
    later(minMs, maxMs, tick);
  };
  later(minMs * 0.3, maxMs * 0.6, tick);
}

/** Un tono con envolvente: grillos, búhos, pájaros, campanas, pitidos… */
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

/** Golpe de ruido filtrado: chispas del fuego, papeles, monedas, teclas, estática. */
function burst(ctx: AudioContext, opts: { dur: number; gain: number; hp?: number; lp?: number; when?: number; brown?: boolean }): void {
  if (!gain) return;
  const { dur, gain: level, hp = 0, lp = 12000, when = 0, brown = false } = opts;
  const t0 = ctx.currentTime + when;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, Math.max(0.05, dur), brown);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(level, t0 + dur * 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node: AudioNode = src;
  if (hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; node.connect(f); node = f; }
  const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp;
  node.connect(f2); f2.connect(g); g.connect(gain);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

/** Lecho continuo de ruido con ráfagas lentas: viento, lluvia, casco, sala. */
function bed(ctx: AudioContext, opts: { level: number; lp: number; hp?: number; brown?: boolean; swell?: number }): void {
  if (!gain) return;
  const { level, lp, hp = 0, brown = true, swell = 0.5 } = opts;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 5, brown);
  src.loop = true;
  let node: AudioNode = src;
  if (hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; node.connect(f); node = f; }
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = lp;
  const g = ctx.createGain();
  g.gain.value = level;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05 + Math.random() * 0.05;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = level * swell;
  lfo.connect(lfoGain);
  lfoGain.connect(g.gain);
  node.connect(lpf);
  lpf.connect(g);
  g.connect(gain);
  src.start();
  lfo.start();
  stopFns.push(() => { try { src.stop(); lfo.stop(); } catch { /* ya parado */ } });
}

/** Notas graves sostenidas: la base emocional de cada escena. */
function drone(ctx: AudioContext, freqs: readonly (readonly [number, number])[], type: OscillatorType = 'triangle', vibrato = 0): void {
  if (!gain) return;
  for (const [f, level] of freqs) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = level;
    o.connect(g);
    g.connect(gain);
    o.start();
    stopFns.push(() => { try { o.stop(); } catch { /* ya parado */ } });
    if (vibrato) { // desafina muy despacio: sensación de «sintonizar»
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lg = ctx.createGain();
      lg.gain.value = vibrato;
      lfo.connect(lg);
      lg.connect(o.frequency);
      lfo.start();
      stopFns.push(() => { try { lfo.stop(); } catch { /* ya parado */ } });
    }
  }
}

// ——— Eventos con carácter ———

const crickets = (ctx: AudioContext): void => {
  for (let i = 0, n = 3 + Math.floor(Math.random() * 3); i < n; i++) {
    blip(ctx, { freq: 4200 + Math.random() * 400, dur: 0.05, gain: 0.012, type: 'square', when: i * 0.09 });
  }
};
const owl = (ctx: AudioContext): void => {
  blip(ctx, { freq: 330, to: 255, dur: 0.5, gain: 0.05 });
  blip(ctx, { freq: 320, to: 245, dur: 0.7, gain: 0.045, when: 0.65 });
};
const birds = (ctx: AudioContext): void => {
  const base = 2200 + Math.random() * 1200;
  for (let i = 0, n = 2 + Math.floor(Math.random() * 3); i < n; i++) {
    blip(ctx, { freq: base + Math.random() * 500, to: base * 0.75, dur: 0.12, gain: 0.02, when: i * 0.18 });
  }
};
/** Aullido lejano: la firma de Castronegro. */
const howl = (ctx: AudioContext): void => {
  blip(ctx, { freq: 180, to: 300, dur: 0.9, gain: 0.035, type: 'sawtooth' });
  blip(ctx, { freq: 300, to: 165, dur: 1.1, gain: 0.03, type: 'sawtooth', when: 0.85 });
};
const crow = (ctx: AudioContext): void => {
  for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
    burst(ctx, { dur: 0.16, gain: 0.03, hp: 900, lp: 2600, when: i * 0.28 });
  }
};
/** Campana lejana (pueblo, catedral, castillo). */
const bell = (ctx: AudioContext, f = 440): void => {
  blip(ctx, { freq: f, dur: 3.2, gain: 0.028 });
  blip(ctx, { freq: f * 2.01, dur: 2.2, gain: 0.014 });
  blip(ctx, { freq: f * 2.99, dur: 1.4, gain: 0.008 });
};
/** Murmullo: dos o tres «voces» sin palabras al fondo de una sala. */
const murmur = (ctx: AudioContext): void => {
  for (let i = 0, n = 2 + Math.floor(Math.random() * 3); i < n; i++) {
    burst(ctx, { dur: 0.25 + Math.random() * 0.4, gain: 0.012, hp: 260, lp: 900, when: i * (0.3 + Math.random() * 0.5) });
  }
};
const tick = (ctx: AudioContext): void => burst(ctx, { dur: 0.035, gain: 0.02, hp: 1800, lp: 6000 });
const fire = (ctx: AudioContext): void => {
  for (let i = 0, n = 1 + Math.floor(Math.random() * 3); i < n; i++) {
    burst(ctx, { dur: 0.05, gain: 0.018, hp: 1200, lp: 7000, when: i * 0.12 });
  }
};
const paper = (ctx: AudioContext): void => burst(ctx, { dur: 0.22, gain: 0.016, hp: 1500, lp: 9000 });
const coins = (ctx: AudioContext): void => {
  for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
    blip(ctx, { freq: 2400 + Math.random() * 900, dur: 0.12, gain: 0.016, type: 'triangle', when: i * 0.07 });
  }
};
const keys = (ctx: AudioContext): void => {
  for (let i = 0, n = 3 + Math.floor(Math.random() * 5); i < n; i++) {
    burst(ctx, { dur: 0.03, gain: 0.01, hp: 2200, lp: 8000, when: i * (0.08 + Math.random() * 0.07) });
  }
};
/** Ping de sonar con cola larga: el corazón de un submarino. */
const ping = (ctx: AudioContext): void => {
  blip(ctx, { freq: 1180, to: 1060, dur: 2.6, gain: 0.05 });
};
const drip = (ctx: AudioContext): void => blip(ctx, { freq: 1500, to: 700, dur: 0.14, gain: 0.02 });
/** Telegrafía: unos cuantos puntos y rayas. */
const morse = (ctx: AudioContext): void => {
  let t = 0;
  for (let i = 0, n = 4 + Math.floor(Math.random() * 6); i < n; i++) {
    const long = Math.random() < 0.4;
    blip(ctx, { freq: 720, dur: long ? 0.2 : 0.07, gain: 0.018, type: 'sine', when: t });
    t += (long ? 0.2 : 0.07) + 0.07;
  }
};
/** Radio de comisaría: chasquido, dos tonos y estática. */
const radio = (ctx: AudioContext): void => {
  burst(ctx, { dur: 0.06, gain: 0.02, hp: 900, lp: 5000 });
  blip(ctx, { freq: 980, dur: 0.1, gain: 0.02, type: 'square', when: 0.08 });
  blip(ctx, { freq: 1240, dur: 0.1, gain: 0.018, type: 'square', when: 0.2 });
  burst(ctx, { dur: 0.5, gain: 0.012, hp: 700, lp: 3500, when: 0.32 });
};
/** Arpa de palacio: tres notas ascendentes muy suaves. */
const harp = (ctx: AudioContext): void => {
  const root = [392, 440, 523.25][Math.floor(Math.random() * 3)];
  for (let i = 0; i < 3; i++) {
    blip(ctx, { freq: root * [1, 1.25, 1.5][i], dur: 1.6, gain: 0.016, type: 'triangle', when: i * 0.18 });
  }
};
/** Jarras de taberna. */
const mugs = (ctx: AudioContext): void => {
  blip(ctx, { freq: 620 + Math.random() * 300, dur: 0.3, gain: 0.018, type: 'triangle' });
};

// ——— Escenas, una por juego ———

const SCENES: Record<SceneId, (ctx: AudioContext) => void> = {
  // Castronegro de noche: viento frío, grillos, un búho… y lobos a lo lejos.
  night: (ctx) => {
    bed(ctx, { level: 0.5, lp: 320 });
    drone(ctx, [[55, 0.05], [55.7, 0.04]]);
    loop('night', 1200, 4000, () => crickets(ctx));
    loop('night', 18000, 45000, () => owl(ctx));
    loop('night', 55000, 140000, () => howl(ctx));
  },
  // Y de día: brisa, pájaros y la campana del pueblo de vez en cuando.
  day: (ctx) => {
    bed(ctx, { level: 0.3, lp: 900 });
    loop('day', 2500, 7000, () => birds(ctx));
    loop('day', 90000, 210000, () => bell(ctx, 523.25));
  },
  // Un lugar público cualquiera: gente de fondo y un reloj que corre.
  espia: (ctx) => {
    bed(ctx, { level: 0.18, lp: 1400, hp: 200, brown: false, swell: 0.3 });
    loop('espia', 3500, 9000, () => murmur(ctx));
    loop('espia', 1000, 1000, () => tick(ctx));
    loop('espia', 40000, 90000, () => radio(ctx));
  },
  // Contrarreloj: dos notas tensas y el segundero encima.
  insider: (ctx) => {
    drone(ctx, [[73.4, 0.045], [110, 0.02]]);
    loop('insider', 1000, 1000, () => tick(ctx));
    loop('insider', 6000, 14000, () => murmur(ctx));
  },
  // Sala tranquila: solo el rumor de la mesa.
  chameleon: (ctx) => {
    bed(ctx, { level: 0.12, lp: 1100, hp: 180, brown: false, swell: 0.4 });
    loop('chameleon', 5000, 12000, () => murmur(ctx));
  },
  // Corte de intrigas: cuerdas graves, monedas y cuchicheos.
  coup: (ctx) => {
    drone(ctx, [[65.4, 0.045], [98, 0.025]]);
    loop('coup', 9000, 22000, () => coins(ctx));
    loop('coup', 5000, 13000, () => murmur(ctx));
  },
  // Castillo: piedra, antorchas y una campana lejana.
  avalon: (ctx) => {
    bed(ctx, { level: 0.22, lp: 420 });
    drone(ctx, [[87.3, 0.04], [130.8, 0.02]]);
    loop('avalon', 900, 2600, () => fire(ctx));
    loop('avalon', 70000, 160000, () => bell(ctx, 349.2));
  },
  // Sala de gobierno: fluorescente, reloj de pared y papeleo.
  secret_hitler: (ctx) => {
    drone(ctx, [[50, 0.035], [150, 0.012]], 'sine');
    loop('secret_hitler', 2000, 2000, () => tick(ctx));
    loop('secret_hitler', 8000, 20000, () => paper(ctx));
    loop('secret_hitler', 12000, 30000, () => murmur(ctx));
  },
  // Dos salas y una bomba: drone tenso y cuenta atrás.
  two_rooms: (ctx) => {
    drone(ctx, [[58.3, 0.05], [87.3, 0.022]]);
    loop('two_rooms', 1000, 1000, () => tick(ctx));
    loop('two_rooms', 7000, 18000, () => murmur(ctx));
  },
  // Cuartel de espías: silencio, y alguien tecleando al fondo.
  codenames: (ctx) => {
    bed(ctx, { level: 0.14, lp: 900, hp: 150, brown: false, swell: 0.3 });
    loop('codenames', 7000, 18000, () => keys(ctx));
    loop('codenames', 10000, 26000, () => murmur(ctx));
  },
  // Sala de radio: estática y telegrafía.
  decrypto: (ctx) => {
    bed(ctx, { level: 0.16, lp: 3200, hp: 700, brown: false, swell: 0.6 });
    drone(ctx, [[110, 0.018]], 'sine', 1.5);
    loop('decrypto', 9000, 24000, () => morse(ctx));
  },
  // Comisaría: zumbido, radio policial y voces.
  good_cop: (ctx) => {
    drone(ctx, [[50, 0.03], [100, 0.012]], 'sine');
    loop('good_cop', 14000, 38000, () => radio(ctx));
    loop('good_cop', 6000, 15000, () => murmur(ctx));
  },
  // Bosque de sombras: viento, cuervos y algo que respira debajo.
  shadow_hunters: (ctx) => {
    bed(ctx, { level: 0.42, lp: 380 });
    drone(ctx, [[43.7, 0.05], [65.4, 0.02]]);
    loop('shadow_hunters', 20000, 55000, () => crow(ctx));
    loop('shadow_hunters', 6000, 16000, () => drip(ctx));
  },
  // Submarino: el casco, el sonar y una gotera.
  sonar: (ctx) => {
    bed(ctx, { level: 0.45, lp: 220 });
    drone(ctx, [[41.2, 0.05], [82.4, 0.018]], 'sine');
    loop('sonar', 7000, 7000, () => ping(ctx));
    loop('sonar', 9000, 25000, () => drip(ctx));
  },
  // Sintonizando una frecuencia: un drone que ondula.
  wavelength: (ctx) => {
    drone(ctx, [[98, 0.035], [146.8, 0.02]], 'sine', 2.2);
    bed(ctx, { level: 0.1, lp: 2600, hp: 900, brown: false, swell: 0.8 });
  },
  // Taberna: chimenea, jarras y conversación.
  skull: (ctx) => {
    bed(ctx, { level: 0.2, lp: 700 });
    loop('skull', 700, 2200, () => fire(ctx));
    loop('skull', 6000, 16000, () => mugs(ctx));
    loop('skull', 5000, 14000, () => murmur(ctx));
  },
  // Palacio: silencio de salón y un arpa muy de vez en cuando.
  love_letter: (ctx) => {
    bed(ctx, { level: 0.12, lp: 800, swell: 0.3 });
    loop('love_letter', 22000, 60000, () => harp(ctx));
  },
};

/** Cambia (o mantiene) la escena. null = silencio. */
export function ensureAmbience(wanted: SceneId | null): void {
  if (wanted === mode) {
    if (wanted) ensureNodes();
    return;
  }
  stopAmbience();
  if (!wanted) return;
  const ctx = ensureNodes();
  if (!ctx) return;
  mode = wanted;
  SCENES[wanted](ctx);
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
