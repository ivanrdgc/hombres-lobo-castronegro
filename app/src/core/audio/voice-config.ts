// Configuración de voz del dispositivo (persistida en localStorage).
// MISMA clave y forma que la v1 (hlc_voice_v4): el cambio a la v2 no debe
// resetear las preferencias de nadie.

export interface VoiceConfig {
  engine: 'cloud' | 'device';
  cloudVoice: string;
  voiceURI: string | null;
  rate: number;
  pitch: number;
  ambience: boolean;
}

const LS_KEY = 'hlc_voice_v4';

const DEFAULTS: VoiceConfig = {
  engine: 'cloud', // 'cloud' (neuronal, muy humana) o 'device' (la del móvil)
  cloudVoice: 'es-ES-Chirp3-HD-Charon', // la voz que mejor ha funcionado en mesa
  voiceURI: null,
  rate: 0.95,
  pitch: 0.9,
  ambience: true,
};

export const CLOUD_VOICES = [
  { id: 'es-ES-Chirp3-HD-Charon', label: '🎬 HD · masculina grave (recomendada)' },
  { id: 'es-ES-Chirp3-HD-Enceladus', label: '🎬 HD · masculina serena' },
  { id: 'es-ES-Chirp3-HD-Kore', label: '🎬 HD · femenina clara' },
  { id: 'es-ES-Chirp3-HD-Sulafat', label: '🎬 HD · femenina cálida' },
  { id: 'es-ES-Studio-F', label: '🎙️ Studio · masculina (locutor)' },
  { id: 'es-ES-Studio-C', label: '🎙️ Studio · femenina (locutora)' },
  { id: 'es-ES-Neural2-F', label: '⚡ Ágil · masculina' },
  { id: 'es-ES-Neural2-A', label: '⚡ Ágil · femenina' },
] as const;

let cfg: VoiceConfig = { ...DEFAULTS };
try {
  Object.assign(cfg, JSON.parse(localStorage.getItem(LS_KEY) || 'null') || {});
} catch {
  /* sin storage o JSON corrupto: valores por defecto */
}

type Listener = (cfg: VoiceConfig) => void;
const listeners = new Set<Listener>();

export function getVoiceConfig(): VoiceConfig {
  return { ...cfg };
}

export function setVoiceConfig(patch: Partial<VoiceConfig>): void {
  cfg = { ...cfg, ...patch };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  } catch {
    /* sin storage */
  }
  for (const fn of listeners) fn(getVoiceConfig());
}

export function onVoiceConfig(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
