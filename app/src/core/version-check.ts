// Recarga la página a TODOS los conectados cuando se despliega una versión
// nueva. Cada build hornea un `__BUILD_ID__` único y emite `/version.json` con
// ese mismo id; Hosting lo sirve `no-cache`. La app compara periódicamente el
// id del servidor con el suyo: si difieren, hay release nuevo → recarga.
//
// Va SOLO con cada `firebase deploy` de hosting (version.json viaja en el
// build): sin Firestore, sin reglas, sin credenciales. Mata de paso la caché
// rancia del móvil (una pestaña vieja se actualiza al volver a ella).
//
// Anti-bucle: tras recargar, el bundle nuevo trae el id nuevo y ya coincide.
// Si por una carrera de CDN el reload trajera aún el bundle viejo, un guardián
// de tiempo en sessionStorage evita recargar más de una vez cada GUARD_MS.

const CURRENT = __BUILD_ID__;
const GUARD_KEY = 'hlc_reload_at';
const GUARD_MS = 20000;
const INTERVAL_MS = 5 * 60 * 1000;

async function serverBuildId(): Promise<string | null> {
  try {
    const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { buildId?: unknown };
    return typeof data.buildId === 'string' ? data.buildId : null;
  } catch {
    return null; // sin red o en dev (no hay version.json): no pasa nada
  }
}

function reloadedRecently(): boolean {
  try {
    return Date.now() - Number(sessionStorage.getItem(GUARD_KEY) || 0) < GUARD_MS;
  } catch {
    return false;
  }
}

async function check(): Promise<void> {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  const server = await serverBuildId();
  if (!server || server === CURRENT || reloadedRecently()) return;
  try {
    sessionStorage.setItem(GUARD_KEY, String(Date.now()));
  } catch {
    /* sessionStorage no disponible: recargamos igual */
  }
  location.reload();
}

export function installVersionCheck(): void {
  if (typeof window === 'undefined') return;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check();
  });
  window.addEventListener('focus', () => void check());
  window.setInterval(() => void check(), INTERVAL_MS);
  // Chequeo inicial poco después de cargar: pilla una pestaña vieja que el
  // usuario reactiva justo cuando acabamos de desplegar.
  window.setTimeout(() => void check(), 15000);
}
