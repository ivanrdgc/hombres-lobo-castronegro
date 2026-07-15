// Voz del dispositivo (Web Speech API): el fallback cuando no hay clave TTS,
// el usuario la elige, o la síntesis neuronal falla. Port de la v1.
import { getVoiceConfig } from './voice-config';

let watchdog: ReturnType<typeof setInterval> | null = null;

export function initDeviceVoice(): void {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.getVoices(); // fuerza la carga inicial
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  // Chrome tiene un bug que congela la síntesis en locuciones largas (~15 s):
  // un resume() periódico la mantiene viva y evita que la cola se bloquee.
  if (!watchdog) {
    watchdog = setInterval(() => {
      try {
        if (speechSynthesis.speaking) speechSynthesis.resume();
      } catch {
        /* sin voz */
      }
    }, 4000);
  }
}

// Voces en español disponibles, de mejor a peor calidad estimada.
export function listSpanishVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return [];
  return speechSynthesis.getVoices()
    .filter((v) => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith('es'))
    .sort((a, b) => rankVoice(b) - rankVoice(a));
}

// Heurística de calidad: las voces "naturales/neuronales" (Edge), las de Google
// (Chrome/Android) y las mejoradas (iOS) suenan mucho mejor que las locales básicas.
function rankVoice(v: SpeechSynthesisVoice): number {
  const name = `${v.name} ${v.voiceURI || ''}`.toLowerCase();
  const lang = v.lang.toLowerCase().replace('_', '-');
  let s = 0;
  if (lang.startsWith('es-es')) s += 30;
  else if (lang.startsWith('es')) s += 15;
  if (/natural|neural|online/.test(name)) s += 60;
  if (/google/.test(name)) s += 40;
  if (/premium|enhanced|mejorada|plus/.test(name)) s += 25;
  if (/siri/.test(name)) s += 20;
  if (/espeak|eloquence|compact|robot/.test(name)) s -= 80;
  return s;
}

function currentVoice(): SpeechSynthesisVoice | null {
  const voices = listSpanishVoices();
  if (!voices.length) return null;
  const uri = getVoiceConfig().voiceURI;
  if (uri) {
    const v = voices.find((x) => x.voiceURI === uri);
    if (v) return v;
  }
  return voices[0];
}

export interface DeviceSpeakOpts {
  onstart?: () => void;
  onend?: () => void;
}

// Habla con la voz del dispositivo. Devuelve una promesa que resuelve al
// terminar (con cinturones de seguridad: algunos navegadores no disparan
// onend/onstart).
export function speakDevice(text: string, opts: DeviceSpeakOpts = {}): Promise<void> {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined' || !text) {
      if (opts.onstart) opts.onstart();
      setTimeout(() => {
        if (opts.onend) opts.onend();
        resolve();
      }, 800);
      return;
    }
    try {
      const cfg = getVoiceConfig();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-ES';
      const v = currentVoice();
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      }
      u.rate = cfg.rate;
      u.pitch = cfg.pitch;
      u.volume = 1;
      let done = false;
      let started = false;
      const start = () => {
        if (!started) {
          started = true;
          if (opts.onstart) opts.onstart();
        }
      };
      const finish = () => {
        if (!done) {
          done = true;
          if (opts.onend) opts.onend();
          resolve();
        }
      };
      u.onstart = start;
      u.onend = finish;
      u.onerror = finish;
      // Cinturón de seguridad: algunos navegadores no disparan onend.
      setTimeout(finish, Math.max(4000, text.length * 110));
      speechSynthesis.speak(u);
      setTimeout(start, 300); // por si el navegador no dispara onstart
    } catch {
      if (opts.onstart) opts.onstart();
      setTimeout(() => {
        if (opts.onend) opts.onend();
        resolve();
      }, 800);
    }
  });
}

export function stopDevice(): void {
  try {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  } catch {
    /* nada */
  }
}
