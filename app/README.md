# Castronegro v2

Reescritura de la app en Svelte 5 + TypeScript + Vite. La v1 (en `../public/`) sigue siendo la
app en producción hasta completar la fase F7 del plan.

## Comandos (desde `app/`)

- `npm run dev` — servidor de desarrollo con HMR.
- `npm test` — tests (Vitest).
- `npm run check` — comprobación de tipos (svelte-check + tsc).
- `npm run lint` / `npm run format` — ESLint / Prettier.
- `npm run build` — build de producción a `dist/`.

## Deploy (desde la raíz del repo)

- `npm run deploy:v2` — build + deploy del site de pruebas (target `v2`).
- `npm run deploy:prod` — deploy de la v1 actual (target `prod`).

Siempre con `--project castronegro-zui5sg` (ya incluido en los scripts). Las URLs de los sites no
se documentan en el repo.

## Secretos

`app/.env.local` (gitignored) contiene `VITE_TTS_KEY` (clave de Google TTS restringida por
referrer). Nunca se committea.
