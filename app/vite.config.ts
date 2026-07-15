/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Sello de versión visible en la app (para verificar deploys desde el móvil,
// como el APP_VERSION de la v1 pero automático: fecha y hora del build).
const stamp = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Madrid',
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date());

export default defineConfig({
  plugins: [svelte()],
  define: {
    __APP_VERSION__: JSON.stringify(`v2 · ${stamp}`),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
