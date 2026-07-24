import './styles/base.css';
import './styles/app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { installUnlockGestures, onAudioState, audioState } from './core/audio/engine';
import { e2eTestMode } from './core/test-hooks';
import { loadClipManifest } from './core/audio/clips';
import { initDeviceVoice } from './core/audio/device-voice';
import { applyRoute, state, viewGroup } from './core/sync/store.svelte';
import { installPresence } from './core/sync/presence';
import { installAmbienceDirector } from './core/audio/ambience-director';
import { installUiHygiene } from './shell/ui-hygiene';
import { installVersionCheck } from './core/version-check';
import { installNarrator } from './games/hombres-lobo/narrator/install';
import { installEspiaNarrator } from './games/espia/narrator/install';
import { installUnaNocheNarrator } from './games/una-noche/narrator/install';
import { installAvalonNarrator } from './games/avalon/narrator/install';
import { installSecretHitlerNarrator } from './games/secret-hitler/narrator/install';
import { installChameleonNarrator } from './games/chameleon/narrator/install';
import { installInsiderNarrator } from './games/insider/narrator/install';
import { installCoupNarrator } from './games/coup/narrator/install';
import { installTwoRoomsNarrator } from './games/two-rooms/narrator/install';
import { installWavelengthNarrator } from './games/wavelength/narrator/install';
import { installCodenamesNarrator } from './games/codenames/narrator/install';
import { installSkullNarrator } from './games/skull/narrator/install';
import { installLoveLetterNarrator } from './games/love-letter/narrator/install';
import { installDecryptoNarrator } from './games/decrypto/narrator/install';
import { installGoodCopNarrator } from './games/good-cop/narrator/install';
import { installShadowHNarrator } from './games/shadow-hunters/narrator/install';
import { installSonarNarrator } from './games/sonar/narrator/install';

installUnlockGestures();
// Refleja en el estado global si el audio SUENA ya (AudioContext 'running'):
// así las pantallas piden activar la voz SOLO cuando de verdad está en silencio,
// no según una bandera manual. Cualquier gesto (installUnlockGestures) lo reanuda.
// En los e2e (sin audio) se da por listo, para no alterar las pantallas.
const testAudio = e2eTestMode();
const syncAudioReady = (s: { state: string }) => { state.ui.audioReady = testAudio || s.state === 'running'; };
syncAudioReady(audioState());
onAudioState(syncAudioReady);
loadClipManifest(); // biblioteca de clips pre-generados (F6); sin ella, síntesis en vivo
initDeviceVoice();
installUiHygiene();
installVersionCheck(); // recarga a todos cuando se despliega una versión nueva
installNarrator();
installEspiaNarrator();
installUnaNocheNarrator();
installAvalonNarrator();
installSecretHitlerNarrator();
installChameleonNarrator();
installInsiderNarrator();
installCoupNarrator();
installTwoRoomsNarrator();
installWavelengthNarrator();
installCodenamesNarrator();
installSkullNarrator();
installLoveLetterNarrator();
installDecryptoNarrator();
installGoodCopNarrator();
installShadowHNarrator();
installSonarNarrator();
installPresence();
installAmbienceDirector();

window.addEventListener('popstate', applyRoute);
applyRoute();

const app = mount(App, { target: document.getElementById('app-root')! });

// Referencia de solo lectura para depuración y para los e2e (window.__hlc).
// Lo que lleva SECRETOS (la partida, las cartas de los jugadores) solo se
// publica en modo test: en una mesa de verdad, un curioso abría la consola y
// leía los roles de todos de un vistazo. Los datos siguen viajando en el doc
// (la secrecía es de interfaz, no criptográfica), pero ya no están servidos.
// `group` es la VISTA del dispositivo (su partida superpuesta, si está en
// una): así los e2e siguen leyendo group.game aunque la mesa tenga varias
// partidas; el doc crudo queda en rawGroup y las partidas en matches.
const debugBase = {
  get route() { return state.route; },
  get groupMissing() { return state.groupMissing; },
  get session() { return state.session; },
  get flash() { return state.flash; },
  get ui() { return state.ui; },
};
(window as unknown as { __hlc: unknown }).__hlc = e2eTestMode()
  ? {
    ...debugBase,
    get group() { return viewGroup(); },
    get rawGroup() { return state.group; },
    get players() { return state.players; },
    get matches() { return state.matches; },
    // Transcript de la voz: qué habría dicho el narrador, en orden. Permite
    // verificar el contrato pantalla=voz sin audio.
    get narration() { return (window as unknown as { __hlcNarration?: unknown[] }).__hlcNarration || []; },
  }
  : debugBase;

export default app;
