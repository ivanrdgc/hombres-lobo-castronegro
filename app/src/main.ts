import './styles/base.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { installUnlockGestures } from './core/audio/engine';
import { loadClipManifest } from './core/audio/clips';

installUnlockGestures();
loadClipManifest(); // biblioteca de clips pre-generados (F6); sin ella, síntesis en vivo

const app = mount(App, { target: document.getElementById('app')! });

export default app;
