// Presencia de dispositivos: cada dispositivo con sesión escribe un latido
// (heartbeatAt) en su doc de jugador mientras la pestaña está visible. Con él,
// las listas marcan 💤 a los dispositivos dormidos, la pantalla de inicio
// des-preselecciona a los ausentes y (ya desde antes) se detecta al narrador
// caído. Es «mejor esfuerzo»: si un latido falla, no molesta a nadie.
import { db, doc, updateDoc } from './fb';
import { state } from './store.svelte';

/** Cada cuánto late un dispositivo visible. */
export const HEARTBEAT_MS = 30000;
/** Un latido más viejo que esto marca el dispositivo como inactivo (💤). */
export const PRESENCE_STALE_MS = 75000;

/** Forma mínima que necesita la comprobación de presencia. */
export interface Heartbeatish {
  heartbeatAt?: number;
}

// ¿El dispositivo dio señales de vida hace poco? Los docs sin latido (jugadores
// de antes de esta versión que no han vuelto a abrir la app) cuentan como
// inactivos: cualquier dispositivo vivo late nada más entrar.
export function isActiveDevice(p: Heartbeatish, now: number): boolean {
  return !!p.heartbeatAt && now - p.heartbeatAt < PRESENCE_STALE_MS;
}

async function beat(): Promise<void> {
  const slug = state.route.slug;
  const sess = state.session;
  if (!slug || !sess) return;
  // Solo si mi doc sigue existiendo y la sesión es mía: un expulsado o un
  // dispositivo suplantado no debe re-escribir nada.
  const p = state.players.find((x) => x.id === sess.pid);
  if (!p || p.deviceToken !== sess.token) return;
  try {
    await updateDoc(doc(db, 'groups', slug, 'players', sess.pid), { heartbeatAt: Date.now() });
  } catch {
    /* mejor esfuerzo */
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function installPresence(): void {
  const arm = () => {
    if (timer) return;
    void beat(); // latido inmediato al volver: la frescura se nota al instante
    timer = setInterval(() => void beat(), HEARTBEAT_MS);
  };
  const disarm = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') arm();
    else disarm();
  });
  if (document.visibilityState === 'visible') arm();
}
