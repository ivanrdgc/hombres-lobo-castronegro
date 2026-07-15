// Motor de audio compartido: UN AudioContext para narración y ambientación,
// con buses de ganancia separados. iOS solo permite audio nacido de un gesto
// válido (click/touchend): unlockAudio() debe llamarse SÍNCRONAMENTE dentro
// del gesto; se reintenta en cada gesto hasta que una reproducción silenciosa
// funcione de verdad.

export interface AudioEngine {
  ctx: AudioContext;
  master: GainNode;
  narrationBus: GainNode;
  ambienceBus: GainNode;
}

let engine: AudioEngine | null = null;
let unlocked = false;
let speechPrimed = false;

type StateListener = (s: { unlocked: boolean; state: AudioContextState | 'sin-audio' }) => void;
const stateListeners = new Set<StateListener>();

function notifyState() {
  const snap = audioState();
  for (const fn of stateListeners) fn(snap);
}

export function audioState(): { unlocked: boolean; state: AudioContextState | 'sin-audio' } {
  return { unlocked, state: engine ? engine.ctx.state : 'sin-audio' };
}

export function onAudioState(fn: StateListener): () => void {
  stateListeners.add(fn);
  return () => stateListeners.delete(fn);
}

export function getEngine(): AudioEngine | null {
  if (engine) return engine;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    const narrationBus = ctx.createGain();
    narrationBus.gain.value = 1;
    narrationBus.connect(master);
    const ambienceBus = ctx.createGain();
    ambienceBus.gain.value = 1;
    ambienceBus.connect(master);
    ctx.onstatechange = () => notifyState();
    engine = { ctx, master, narrationBus, ambienceBus };
    return engine;
  } catch {
    return null;
  }
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

// Debe ejecutarse dentro de un gesto de usuario (click/touchend, nunca
// pointerdown: iOS no lo valida). Idempotente y con reintentos: si el contexto
// se suspende (bloqueo de pantalla, llamada), el siguiente gesto lo reanima.
export function unlockAudio(): void {
  try {
    const e = getEngine();
    if (!e) return;
    if (e.ctx.state !== 'running') e.ctx.resume().catch(() => { /* gesto no válido aún */ });
    if (!unlocked) {
      // Un buffer de 1 muestra: si suena (en silencio), el contexto queda
      // desbloqueado para todo lo que venga después.
      const buf = e.ctx.createBuffer(1, 1, e.ctx.sampleRate);
      const src = e.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(e.master);
      src.onended = () => {
        unlocked = true;
        notifyState();
      };
      src.start(0);
    }
    // Desbloquea la voz del dispositivo (fallback) SOLO UNA VEZ. En iOS, arrancar
    // speechSynthesis activa la sesión de audio del sistema y atenúa el audio
    // neuronal (WebAudio); hacerlo en cada toque bajaba el volumen a cada toque.
    if (!speechPrimed && typeof speechSynthesis !== 'undefined' && !speechSynthesis.speaking && !speechSynthesis.pending) {
      speechPrimed = true;
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    }
  } catch {
    /* sin audio disponible */
  }
}

let gesturesInstalled = false;

// Instala los reintentos de desbloqueo en cada gesto válido y la recuperación
// al volver a primer plano (iOS puede dejar el contexto en 'interrupted').
export function installUnlockGestures(): void {
  if (gesturesInstalled) return;
  gesturesInstalled = true;
  const retry = () => unlockAudio();
  document.addEventListener('click', retry, { capture: true });
  document.addEventListener('touchend', retry, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && engine && engine.ctx.state !== 'running') {
      engine.ctx.resume().catch(() => { /* se reintentará en el próximo gesto */ });
    }
  });
}
