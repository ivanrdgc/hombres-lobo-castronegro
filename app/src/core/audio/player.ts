// Reproductor de locuciones del narrador. Una locución (Utterance) es una
// secuencia de segmentos: clips de audio (pre-generados o sintetizados) y
// silencios programados. La reproducción es prácticamente sin huecos: mientras
// suena el segmento i se resuelve el i+1. El final se conoce por el propio
// buffer (onended + duración calculada como cinturón), no por sondeo.
import { getEngine } from './engine';
import { resolveClip } from './clips';
import { speakDevice, stopDevice } from './device-voice';
import { getVoiceConfig } from './voice-config';
import { cloudAvailable } from './tts';
import { e2eTestMode, logNarration } from '../test-hooks';

export type Segment =
  | { kind: 'clip'; text: string }
  | { kind: 'gap'; ms: number };

export interface Utterance {
  id: string;
  segments: Segment[];
  /** Texto exacto que muestra la UI (contrato pantalla=voz). */
  display?: string;
  /** 'low' (murmullos, avisos): si la voz está ocupada, se omite. */
  priority?: 'normal' | 'low';
}

export type PlayOutcome = 'completed' | 'aborted' | 'skipped-low' | 'fell-back' | 'muted' | 'empty';

export interface PlayOpts {
  signal?: AbortSignal;
  muted?: boolean;
  /** Callback por segmento iniciado (diagnóstico/medición). */
  onSegment?: (index: number) => void;
}

/** Silencio por defecto entre piezas de una misma locución. */
export const INTER_PIECE_GAP_MS = 120;

let speaking = false;
const speakingListeners = new Set<(s: boolean) => void>();
let lastU: Utterance | null = null;
let current: { abort: () => void; drain: () => void } | null = null;
let generation = 0;
let chain: Promise<unknown> = Promise.resolve();

function setSpeaking(s: boolean): void {
  if (speaking === s) return;
  speaking = s;
  for (const fn of speakingListeners) fn(s);
}

export function isSpeaking(): boolean {
  return speaking;
}

export function onSpeaking(fn: (s: boolean) => void): () => void {
  speakingListeners.add(fn);
  return () => speakingListeners.delete(fn);
}

export function lastUtterance(): Utterance | null {
  return lastU;
}

function utteranceText(u: Utterance): string {
  return u.display
    ?? u.segments.filter((s): s is Extract<Segment, { kind: 'clip' }> => s.kind === 'clip').map((s) => s.text).join(' ');
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('abortado', 'AbortError'));
    }, { once: true });
  });
}

function playBuffer(buffer: AudioBuffer, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const engine = getEngine();
    if (!engine) {
      reject(new Error('sin AudioContext'));
      return;
    }
    const src = engine.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(engine.narrationBus);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(belt);
      resolve();
    };
    // Cinturón: si onended no llegara (iOS caprichoso), el final se calcula
    // por la duración conocida del buffer + margen.
    const belt = setTimeout(finish, buffer.duration * 1000 + 1500);
    src.onended = finish;
    signal.addEventListener('abort', () => {
      if (done) return;
      done = true;
      clearTimeout(belt);
      try { src.stop(); } catch { /* ya parado */ }
      reject(new DOMException('abortado', 'AbortError'));
    }, { once: true });
    try {
      src.start(0);
    } catch (e) {
      done = true;
      clearTimeout(belt);
      reject(e);
    }
  });
}

/**
 * Reproduce una locución completa. Las llamadas se serializan (una locución no
 * interrumpe a la anterior); stopSpeech() vacía lo pendiente.
 */
export function play(u: Utterance, opts: PlayOpts = {}): Promise<PlayOutcome> {
  const gen = generation;
  const run = chain.then(() => (gen === generation ? doPlay(u, opts) : 'aborted' as const));
  chain = run.catch(() => { /* la cadena sigue viva tras un fallo */ });
  return run;
}

async function doPlay(u: Utterance, opts: PlayOpts): Promise<PlayOutcome> {
  const segments = u.segments.filter((s) => (s.kind === 'clip' ? !!s.text : s.ms > 0));
  if (!segments.length) return 'empty';
  // e2e: ni síntesis ni espera — se registra qué habría dicho la voz y se
  // resuelve al instante (nada de audio que ralentice el test). Va antes del
  // colchón mudo: en test manda esto, no `muted`.
  if (e2eTestMode()) {
    if (u.priority === 'low' && speaking) return 'skipped-low';
    if (opts.onSegment) opts.onSegment(0);
    logNarration({ id: u.id, text: utteranceText(u), priority: u.priority || 'normal' });
    return 'completed';
  }
  if (opts.muted) {
    await sleep(800);
    return 'muted';
  }
  if (u.priority === 'low' && speaking) return 'skipped-low';
  if (u.priority !== 'low') lastU = u;

  const cfg = getVoiceConfig();
  const useCloud = cfg.engine === 'cloud' && cloudAvailable() && !!getEngine();

  // Voz del dispositivo (elegida o sin nube): una sola locución de texto plano.
  if (!useCloud) {
    setSpeaking(true);
    try {
      if (opts.onSegment) opts.onSegment(0);
      await speakDevice(utteranceText(u));
      return 'completed';
    } finally {
      setSpeaking(false);
    }
  }

  const controller = new AbortController();
  const outer = opts.signal;
  const onOuterAbort = () => controller.abort();
  outer?.addEventListener('abort', onOuterAbort, { once: true });
  let drainRest = false;
  current = {
    abort: () => controller.abort(),
    drain: () => { drainRest = true; },
  };

  setSpeaking(true);
  try {
    for (let i = 0; i < segments.length; i++) {
      if (controller.signal.aborted) return 'aborted';
      if (drainRest && i > 0) return 'aborted';
      const seg = segments[i];
      if (seg.kind === 'gap') {
        await sleep(seg.ms, controller.signal);
        continue;
      }
      // Mientras suena este clip se resuelve el siguiente (sin huecos).
      const next = segments[i + 1];
      if (next && next.kind === 'clip') resolveClip(next.text).catch(() => { /* al pedirlo */ });
      const buffer = await resolveClip(seg.text);
      if (controller.signal.aborted) return 'aborted';
      if (opts.onSegment) opts.onSegment(i);
      await playBuffer(buffer, controller.signal);
      const after = segments[i + 1];
      if (after && after.kind === 'clip') await sleep(INTER_PIECE_GAP_MS, controller.signal);
    }
    return 'completed';
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'aborted';
    // Nube caída (sin red, cuota, reproducción bloqueada): voz del dispositivo.
    try {
      await speakDevice(utteranceText(u));
      return 'fell-back';
    } catch {
      return 'fell-back';
    }
  } finally {
    outer?.removeEventListener('abort', onOuterAbort);
    current = null;
    setSpeaking(false);
  }
}

/**
 * Detiene la narración. 'hard' corta en seco (pausa global, relevo, mute);
 * 'drain' deja terminar el segmento en curso y descarta el resto (cambio de
 * escena: nunca se corta una frase a medias).
 */
export function stopSpeech(mode: 'hard' | 'drain' = 'hard'): void {
  generation++; // las locuciones encoladas aún no iniciadas se descartan
  stopDevice();
  if (current) {
    if (mode === 'hard') current.abort();
    else current.drain();
  }
}
