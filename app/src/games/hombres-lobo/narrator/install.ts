// Instalación del narrador en la app real: conecta el secuenciador al store y
// gestiona los efectos laterales (relevo de narrador, repetir, explicación en
// el lobby, ambientación, wake lock y latido de presencia).
import { createNarrator } from '../../../core/narrator/sequencer';
import { profileOf } from '../../../core/narrator/pacing';
import { lastUtterance, play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { ensureAmbience, stopAmbience } from '../../../core/audio/ambience';
import { getVoiceConfig } from '../../../core/audio/voice-config';
import { onChange, state } from '../../../core/sync/store.svelte';
import * as A from '../actions';
import { amNarrator, gameIdOf, sceneOf, type Snap } from './scenes';

function snapshot(): Snap {
  return { group: state.group, players: state.players, session: state.session };
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
  });

  let wasNarrator = false;
  let repeatSeen: number | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  onChange(() => {
    const s = snapshot();
    const g = s.group;
    const game = g?.game;
    const master = amNarrator(s);

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

    // Paisaje sonoro y pantalla encendida, solo en el dispositivo narrador.
    const wantAmbience = master && !!game && getVoiceConfig().ambience && !state.ui.muted
      && !game.paused && game.phase !== 'end';
    ensureAmbience(!wantAmbience ? null : game!.phase === 'day' ? 'day' : 'night');
    if (master) requestWakeLock();

    // Latido de presencia: los demás dispositivos detectan un narrador caído.
    if (master && !heartbeatTimer) {
      A.heartbeat().catch(() => { /* mejor esfuerzo */ });
      heartbeatTimer = setInterval(() => A.heartbeat().catch(() => { /* nada */ }), 25000);
    } else if (!master && heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (!master) stopAmbienceIfNotNarrating(game ? !!game.paused : false);

    narrator.tick();
  });

  function stopAmbienceIfNotNarrating(paused: boolean): void {
    void paused;
    stopAmbience();
  }
}
