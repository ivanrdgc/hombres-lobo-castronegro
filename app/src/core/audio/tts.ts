// Síntesis neuronal en la nube (Google TTS) con doble caché: memoria y Cache
// API ('tts-v2'). La clave de caché es un hash SHA-256 del texto COMPLETO
// (más voz y rate): se acabó el riesgo de colisión del truncado de la v1.
// El rate va horneado en el SSML (<prosody rate>), no en la reproducción:
// así los clips pre-generados (F6) y la síntesis en vivo suenan idénticos.
import { getVoiceConfig } from './voice-config';

// (guard: bajo Node/tsx —script de pre-generación— import.meta.env no existe)
const TTS_KEY = ((import.meta as { env?: Record<string, string> }).env?.VITE_TTS_KEY as string | undefined) || null;

let lastCloudError: string | null = null;

export function cloudAvailable(): boolean {
  return !!TTS_KEY;
}

export function getLastCloudError(): string | null {
  return lastCloudError;
}

// Pausas de narrador DENTRO de cada locución: SSML con <break> entre oraciones
// (las voces neuronales leen las frases seguidas si no se les pide la pausa)
// y <prosody rate> para el ritmo. Determinista a partir del texto: la clave de
// caché sigue el texto plano y la pre-generación coincide siempre.
export function buildSsml(text: string, ratePct: number): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let parts: string[];
  try {
    parts = String(text).split(/(?<=[.!?…])\s+/u).map((s) => s.trim()).filter(Boolean);
  } catch {
    parts = [String(text)];
  }
  const body = parts.map(esc).join(' <break time="450ms"/> ');
  return `<speak><prosody rate="${ratePct}%">${body}</prosody></speak>`;
}

const memCache = new Map<string, ArrayBuffer>();

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Id estable de una locución para una voz y rate concretos (hash completo). */
export async function ttsCacheKey(voice: string, ratePct: number, text: string): Promise<string> {
  return sha256Hex(`${voice}|${ratePct}|${text}`);
}

export function currentVoiceParams(): { voice: string; ratePct: number } {
  const cfg = getVoiceConfig();
  return { voice: cfg.cloudVoice, ratePct: Math.round((cfg.rate || 1) * 100) };
}

/** Sintetiza (o recupera de caché) el MP3 de un texto con la voz configurada. */
export async function synthesize(text: string): Promise<ArrayBuffer> {
  if (!TTS_KEY) throw new Error('sin clave TTS');
  const { voice, ratePct } = currentVoiceParams();
  const key = await ttsCacheKey(voice, ratePct, text);
  const hit = memCache.get(key);
  if (hit) return hit;

  const cacheUrl = 'https://tts.cache.local/v2/' + key;
  let store: Cache | null = null;
  try {
    store = await caches.open('tts-v2');
  } catch {
    /* Cache API no disponible (p. ej. navegación privada): sigue sin caché */
  }
  if (store) {
    const cached = await store.match(cacheUrl).catch(() => null);
    if (cached) {
      const buf = await cached.arrayBuffer();
      memCache.set(key, buf);
      return buf;
    }
  }

  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + TTS_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { ssml: buildSsml(text, ratePct) },
      voice: { languageCode: 'es-ES', name: voice },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    lastCloudError = `síntesis ${res.status}: ${detail}`;
    throw new Error('tts ' + res.status);
  }
  const data = (await res.json()) as { audioContent: string };
  const bytes = Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0));
  const buf = bytes.buffer as ArrayBuffer;
  if (store) {
    await store
      .put(cacheUrl, new Response(buf.slice(0), { headers: { 'Content-Type': 'audio/mpeg' } }))
      .catch(() => { /* caché llena */ });
  }
  memCache.set(key, buf);
  return buf;
}

// Pre-generación: sintetiza en segundo plano (puebla las cachés) SIN
// reproducir. Cola con poca concurrencia para no competir con lo que suena.
let prewarmQueue: string[] = [];
let prewarmActive = 0;
const queued = new Set<string>();

export function prewarmSynth(texts: (string | null | undefined)[]): void {
  if (!TTS_KEY || getVoiceConfig().engine !== 'cloud') return;
  for (const t of texts) {
    if (!t || queued.has(t)) continue;
    queued.add(t);
    prewarmQueue.push(t);
  }
  pumpPrewarm();
}

function pumpPrewarm(): void {
  while (prewarmActive < 3 && prewarmQueue.length) {
    const t = prewarmQueue.shift()!;
    prewarmActive++;
    synthesize(t)
      .catch(() => { /* se sintetizará al pedirla */ })
      .finally(() => {
        queued.delete(t);
        prewarmActive--;
        pumpPrewarm();
      });
  }
}

export function clearPrewarmQueue(): void {
  prewarmQueue = [];
  queued.clear();
}

// Prueba integral del circuito neuronal (para el diagnóstico del modal Voz).
export async function testCloudSynth(text: string): Promise<{ ok: boolean; ms: number; error?: string }> {
  const t0 = performance.now();
  try {
    await synthesize(text);
    return { ok: true, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { ok: false, ms: Math.round(performance.now() - t0), error: lastCloudError || String(e) };
  }
}
