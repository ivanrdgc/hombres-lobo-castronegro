/// <reference types="vitest/config" />
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Sello de versión visible en la app (para verificar deploys desde el móvil,
// como el APP_VERSION de la v1 pero automático: fecha y hora del build).
const stamp = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Madrid',
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date());
// Id único por build: la app lo compara con /version.json (servido no-cache)
// para recargar a todos los conectados cuando se despliega una versión nueva.
const buildId = String(Date.now());

// Emite /version.json en el build: lo lee version-check.ts para detectar releases.
function versionJson(): Plugin {
  return {
    name: 'hlc-version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId, version: `v2 · ${stamp}` }),
      });
    },
  };
}

export default defineConfig({
  plugins: [svelte(), versionJson()],
  define: {
    __APP_VERSION__: JSON.stringify(`v2 · ${stamp}`),
    __BUILD_ID__: JSON.stringify(buildId),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
