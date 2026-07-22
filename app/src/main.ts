import './styles/base.css';
import './styles/app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { installUnlockGestures } from './core/audio/engine';
import { loadClipManifest } from './core/audio/clips';
import { initDeviceVoice } from './core/audio/device-voice';
import { applyRoute, state, viewGroup } from './core/sync/store.svelte';
import { installPresence } from './core/sync/presence';
import { installUiHygiene } from './shell/ui-hygiene';
import { installVersionCheck } from './core/version-check';
import { installNarrator } from './games/hombres-lobo/narrator/install';
import { installEspiaNarrator } from './games/espia/narrator/install';

installUnlockGestures();
loadClipManifest(); // biblioteca de clips pre-generados (F6); sin ella, síntesis en vivo
initDeviceVoice();
installUiHygiene();
installVersionCheck(); // recarga a todos cuando se despliega una versión nueva
installNarrator();
installEspiaNarrator();
installPresence();

window.addEventListener('popstate', applyRoute);
applyRoute();

const app = mount(App, { target: document.getElementById('app-root')! });

// Referencia de solo lectura para depuración y para los e2e (window.__hlc).
// `group` es la VISTA del dispositivo (su partida superpuesta, si está en
// una): así los e2e siguen leyendo group.game aunque la mesa tenga varias
// partidas; el doc crudo queda en rawGroup y las partidas en matches.
(window as unknown as { __hlc: unknown }).__hlc = {
  get route() { return state.route; },
  get group() { return viewGroup(); },
  get rawGroup() { return state.group; },
  get groupMissing() { return state.groupMissing; },
  get players() { return state.players; },
  get matches() { return state.matches; },
  get session() { return state.session; },
  get flash() { return state.flash; },
  get ui() { return state.ui; },
  // Transcript de la voz en los e2e (window.__hlcTest): qué habría dicho el
  // narrador, en orden. Permite verificar el contrato pantalla=voz sin audio.
  get narration() { return (window as unknown as { __hlcNarration?: unknown[] }).__hlcNarration || []; },
};

export default app;
