import './styles/base.css';
import './styles/app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { installUnlockGestures } from './core/audio/engine';
import { loadClipManifest } from './core/audio/clips';
import { initDeviceVoice } from './core/audio/device-voice';
import { applyRoute, state } from './core/sync/store.svelte';
import { installPresence } from './core/sync/presence';
import { installUiHygiene } from './shell/ui-hygiene';
import { installNarrator } from './games/hombres-lobo/narrator/install';
import { installEspiaNarrator } from './games/espia/narrator/install';

installUnlockGestures();
loadClipManifest(); // biblioteca de clips pre-generados (F6); sin ella, síntesis en vivo
initDeviceVoice();
installUiHygiene();
installNarrator();
installEspiaNarrator();
installPresence();

window.addEventListener('popstate', applyRoute);
applyRoute();

const app = mount(App, { target: document.getElementById('app-root')! });

// Referencia de solo lectura para depuración y para los e2e (window.__hlc).
(window as unknown as { __hlc: unknown }).__hlc = state;

export default app;
