// Quién pone el ambiente y cuál (B30). Antes solo lo decidían los narradores de
// Hombres Lobo y Una Noche —los otros 15 juegos se jugaban en silencio—, y cada
// uno llamaba a `ensureAmbience` por su cuenta: dos narradores tirando del mismo
// hilo se pisaban (el que no aplicaba mandaba `null` y cortaba el del otro).
// Aquí se decide UNA vez, mirando la partida en contexto:
//   · suena solo en el dispositivo que narra ESA partida (masterId),
//   · solo si el ajuste de ambiente está activo y el móvil no está silenciado,
//   · nunca en pausa, ni con la partida terminada, ni en los e2e.
import { ensureAmbience, type SceneId } from './ambience';
import { getVoiceConfig } from './voice-config';
import { e2eTestMode } from '../test-hooks';
import { ctxMatch, onChange, state } from '../sync/store.svelte';

/** Juego (y fase, cuando importa) → escena. */
function sceneFor(gameId: string, game: { phase?: string }): SceneId | null {
  switch (gameId) {
    case 'hombres_lobo':
    case 'una_noche':
      return game.phase === 'day' ? 'day' : 'night';
    case 'espia': return 'espia';
    case 'insider': return 'insider';
    case 'chameleon': return 'chameleon';
    case 'coup': return 'coup';
    case 'avalon': return 'avalon';
    case 'secret_hitler': return 'secret_hitler';
    case 'two_rooms': return 'two_rooms';
    case 'codenames': return 'codenames';
    case 'decrypto': return 'decrypto';
    case 'good_cop': return 'good_cop';
    case 'shadow_hunters': return 'shadow_hunters';
    case 'sonar': return 'sonar';
    case 'wavelength': return 'wavelength';
    case 'skull': return 'skull';
    case 'love_letter': return 'love_letter';
    default: return null;
  }
}

export function installAmbienceDirector(): void {
  onChange(() => {
    if (e2eTestMode()) return; // en los e2e, sin audio que interfiera
    const m = ctxMatch();
    const game = m?.game as { phase?: string; paused?: unknown } | undefined;
    const pid = state.session?.pid;
    const narrates = !!m && !!pid && m.masterId === pid;
    const ok = narrates && !!game && !game.paused && game.phase !== 'end'
      && getVoiceConfig().ambience && !state.ui.muted;
    ensureAmbience(ok ? sceneFor(m!.gameId, game!) : null);
  });
}
