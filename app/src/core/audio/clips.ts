// Fuente de clips de audio: biblioteca pre-generada (manifest estático, F6)
// primero; si el clip no existe, síntesis en vivo (tts.ts). Decodificación a
// AudioBuffer bajo demanda con LRU acotada (los PCM decodificados pesan ~10×
// el MP3: no se decodifica la biblioteca entera).
import { getEngine } from './engine';
import { currentVoiceParams, prewarmSynth, synthesize, ttsCacheKey } from './tts';

interface ClipManifest {
  version: number;
  voice: string;
  ratePct: number;
  clips: Record<string, { d: number }>; // id → duración (s)
}

let manifest: ClipManifest | null = null;
let manifestLoaded = false;

/** Carga el manifest de clips pre-generados de la voz por defecto (F6). */
export async function loadClipManifest(): Promise<void> {
  if (manifestLoaded) return;
  manifestLoaded = true;
  try {
    const { voice } = currentVoiceParams();
    const res = await fetch(`/clips/${voice}/manifest.json`);
    if (res.ok) manifest = (await res.json()) as ClipManifest;
  } catch {
    manifest = null; // sin biblioteca: todo por síntesis en vivo
  }
}

class LruBuffers {
  private map = new Map<string, AudioBuffer>();
  constructor(private max = 24) {}

  get(key: string): AudioBuffer | undefined {
    const v = this.map.get(key);
    if (v) {
      this.map.delete(key);
      this.map.set(key, v); // refresca la posición
    }
    return v;
  }

  set(key: string, value: AudioBuffer): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value as string;
      this.map.delete(oldest);
    }
  }
}

const lru = new LruBuffers(24);
const pending = new Map<string, Promise<AudioBuffer>>();

/** ¿Existe el clip pre-generado para este texto (con la voz/rate actuales)? */
export async function hasStaticClip(text: string): Promise<boolean> {
  if (!manifest) return false;
  const { voice, ratePct } = currentVoiceParams();
  if (manifest.voice !== voice || manifest.ratePct !== ratePct) return false;
  const id = await ttsCacheKey(voice, ratePct, text);
  return id in manifest.clips;
}

/** Resuelve el AudioBuffer de un texto: LRU → biblioteca estática → síntesis. */
export function resolveClip(text: string): Promise<AudioBuffer> {
  const inFlight = pending.get(text);
  if (inFlight) return inFlight;
  const p = doResolve(text).finally(() => pending.delete(text));
  pending.set(text, p);
  return p;
}

async function doResolve(text: string): Promise<AudioBuffer> {
  const engine = getEngine();
  if (!engine) throw new Error('sin AudioContext');
  const { voice, ratePct } = currentVoiceParams();
  const id = await ttsCacheKey(voice, ratePct, text);
  const cached = lru.get(id);
  if (cached) return cached;

  let bytes: ArrayBuffer | null = null;
  if (manifest && manifest.voice === voice && manifest.ratePct === ratePct && id in manifest.clips) {
    try {
      const res = await fetch(`/clips/${voice}/${id}.mp3`);
      if (res.ok) bytes = await res.arrayBuffer();
    } catch {
      bytes = null; // biblioteca inaccesible: cae a síntesis
    }
  }
  if (!bytes) bytes = await synthesize(text);
  // decodeAudioData consume el ArrayBuffer: se le pasa una copia para que la
  // caché de síntesis (memCache) conserve el original.
  const buffer = await engine.ctx.decodeAudioData(bytes.slice(0));
  lru.set(id, buffer);
  return buffer;
}

/** Adelanta fetch+decode de las próximas locuciones (horizonte corto). */
export function prewarmBuffers(texts: (string | null | undefined)[]): void {
  for (const t of texts) {
    if (!t) continue;
    resolveClip(t).catch(() => { /* se resolverá al pedirlo */ });
  }
}

export { prewarmSynth };
