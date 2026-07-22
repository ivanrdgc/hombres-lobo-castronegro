// Pantalla de PRIMER ACCESO para activar y configurar el audio. En el móvil el
// sonido solo nace de un gesto del usuario; si no se activa al entrar, la
// primera locución (tras navegar los ajustes y dar a ▶️) sale cortada o muda.
// Por eso, la primera vez que este dispositivo abre la app le mostramos una
// pantalla que desbloquea, prueba y deja configurar el sonido — SALVO que ya
// haya una partida en curso cuyo ALTAVOZ sea otro dispositivo: en ese caso este
// solo juega, no le toca sonar, y no hay que entretenerlo.
import { state } from '../core/sync/store.svelte';
import { e2eTestMode } from '../core/test-hooks';
import type { MatchDoc } from '../core/sync/schema';

const LS_KEY = 'hlc_audio_setup_v1';

/** ¿Ya pasó este dispositivo por la pantalla de activación de audio? */
export function audioSetupDone(): boolean {
  try {
    return localStorage.getItem(LS_KEY) === '1';
  } catch {
    return false;
  }
}

/** Marca la activación como hecha: no se vuelve a mostrar en este dispositivo. */
export function markAudioSetupDone(): void {
  try {
    localStorage.setItem(LS_KEY, '1');
  } catch {
    /* sin storage: se volverá a preguntar, mal menor */
  }
}

/** ¿Hay una partida en curso cuyo altavoz es OTRO dispositivo (no este)? */
export function liveGameElsewhere(matches: MatchDoc[], myPid: string | null): boolean {
  return matches.some((m) => !!m.game && !!m.masterId && m.masterId !== myPid);
}

/**
 * ¿Mostrar la pantalla de activación de audio? Solo en el primer acceso real
 * (nunca en los e2e ni si ya se hizo), y nunca cuando el altavoz de una partida
 * en curso es otro dispositivo. En una ruta de mesa esperamos al primer snapshot
 * de partidas (matchesReady) para no parpadear entre «no sé» y «sí».
 */
export function shouldShowAudioSetup(o: {
  done: boolean;
  testMode: boolean;
  view: 'landing' | 'group';
  matchesReady: boolean;
  liveElsewhere: boolean;
}): boolean {
  if (o.done || o.testMode) return false;
  if (o.view === 'landing') return true;
  if (!o.matchesReady) return false;
  return !o.liveElsewhere;
}

/** Decisión lista para la vista, leyendo el estado global reactivo de la app. */
export function audioSetupVisible(done: boolean): boolean {
  return shouldShowAudioSetup({
    done,
    testMode: e2eTestMode(),
    view: state.route.view,
    matchesReady: state.matchesReady,
    liveElsewhere: liveGameElsewhere(state.matches, state.session?.pid ?? null),
  });
}
