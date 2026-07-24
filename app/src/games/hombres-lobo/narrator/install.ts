// Instalación del narrador en la app real: conecta el secuenciador al store y
// gestiona los efectos laterales (relevo de narrador, repetir, explicación en
// el lobby, ambientación, wake lock y latido de presencia).
import { createNarrator } from '../../../core/narrator/sequencer';
import { narratorHook } from '../../../core/narrator/respawn-hook';
import { pauseMs, profileOf } from '../../../core/narrator/pacing';
import { e2eTestMode } from '../../../core/test-hooks';
import { lastUtterance, play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { matchView, onChange, state } from '../../../core/sync/store.svelte';
import * as A from '../actions';
import { amNarrator, gameIdOf, sceneOf, type Snap } from './scenes';

// El snapshot del narrador es la VISTA de la partida de Hombres Lobo que narra
// este dispositivo (la mesa puede tener varias partidas a la vez); sin partida
// propia que narrar, el grupo a secas (escena nula).
function snapshot(): Snap {
  const g = state.group;
  const pid = state.session?.pid;
  const mine = g && pid
    ? state.matches.find((m) => m.gameId === 'hombres_lobo' && m.masterId === pid && (m.members || []).includes(pid))
    : null;
  return { group: mine && g ? matchView(g, mine) : g, players: state.players, session: state.session };
}

let wakeLock: WakeLockSentinel | null = null;

async function requestWakeLock(): Promise<void> {
  try {
    if (!wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    }
  } catch {
    /* sin wake lock: la UI ya avisa de mantener la pantalla encendida */
  }
}

export function installNarrator(): void {
  const narrator = createNarrator<Snap>({
    getSnapshot: snapshot,
    sceneOf,
    gameIdOf,
    play: (u, opts) => play(u, opts),
    stopSpeech,
    profileOf: (s) => profileOf(s.group?.settings?.pacing),
    isMuted: () => !!state.ui.muted,
    // e2e: colchones mínimos (los intervalos de nag/filler NO pasan por aquí,
    // así que siguen enteros y ningún aviso se dispara antes de tiempo).
    pauseMsFor: (key, profile) => (e2eTestMode() ? 40 : pauseMs(key, profile)),
  });

  // El modal de voz re-arranca la escena al (de)silenciar: sin esto, cortar
  // el audio en plena locución mataba la escena y la noche quedaba atascada
  // en ese paso (la escena muerta nunca avanzaba el paso).
  narratorHook.respawn = () => narrator.respawn();

  let wasNarrator = false;
  let hadGame = false;
  let repeatSeen: number | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  onChange(() => {
    const s = snapshot();
    const g = s.group;
    const game = g?.game;
    const master = amNarrator(s);

    // Al arrancar la partida, TODO dispositivo corta su lectura local en curso
    // (explicación del lobby, detalle de un rol): si siguiera sonando, se
    // solaparía con la primera locución del narrador (B8). Tiene que ocurrir
    // ANTES del respawn de abajo: un stopSpeech posterior descartaría la
    // bienvenida recién encolada.
    if (game && !hadGame && state.ui.explainAudio) {
      stopSpeech('hard');
      state.ui.explainAudio = null;
    }
    hadGame = !!game;

    // Relevo de narrador en plena partida: quien toma el mando re-narra la
    // escena actual desde el principio (ledger a cero).
    if (master && !wasNarrator) narrator.respawn({ resetLedger: true });
    wasNarrator = master;

    // Repetir la última locución (repeatNonce: señal de flanco, no estado).
    const rn = game?.repeatNonce || 0;
    if (!game) repeatSeen = null;
    else if (repeatSeen === null) repeatSeen = rn;
    else if (rn !== repeatSeen) {
      repeatSeen = rn;
      if (master) {
        const last = lastUtterance();
        stopSpeech('hard');
        if (last) {
          // Pausa breve tras el corte (algún motor se traga un play inmediato).
          setTimeout(() => {
            play(last as Utterance, { muted: !!state.ui.muted }).catch(() => { /* nada */ });
          }, 250);
        } else {
          narrator.respawn(); // narrador recién recargado: re-narra el contexto
        }
      }
    }

    // (La explicación ya no se lee en el narrador: antes de empezar la partida
    // nunca se reproduce nada en él. La lectura es siempre local, en el
    // dispositivo que la pide, desde el lobby o su modal.)

    // El paisaje sonoro lo decide el director central (core/audio/ambience-director):
    // con varias partidas por mesa, cada narrador tirando por su cuenta se pisaba.
    if (master) requestWakeLock();

    // Latido de presencia: los demás dispositivos detectan un narrador caído.
    if (master && !heartbeatTimer) {
      A.heartbeat().catch(() => { /* mejor esfuerzo */ });
      heartbeatTimer = setInterval(() => A.heartbeat().catch(() => { /* nada */ }), 25000);
    } else if (!master && heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    narrator.tick();
  });
}
