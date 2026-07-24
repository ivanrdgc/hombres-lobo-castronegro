// Sanidad de los tutoriales + cobertura de clips: cada guion cuadra con su
// juego y cada pieza de voz del tutorial existe en el manifest pregenerado
// (si se edita un texto sin regenerar con `npm run clips`, esto lo delata).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { ALL_DEMOS, allDemoStaticPieces } from './all-demos';
import { GAME_DEFS } from '../../games/registry';
import { ttsCacheKey } from '../../core/audio/tts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_VOICE = 'es-ES-Studio-F';
const manifestPath = join(HERE, '../../../public/clips', DEFAULT_VOICE, 'manifest.json');

test('hay un tutorial por juego y sus pasos están completos', () => {
  const gameIds = GAME_DEFS.map((g) => g.id).sort();
  expect(ALL_DEMOS.map((d) => d.id).sort()).toEqual(gameIds);
  for (const d of ALL_DEMOS) {
    expect(d.steps.length, `${d.id}: pasos`).toBeGreaterThanOrEqual(5);
    for (const s of d.steps) {
      expect(s.title.trim(), `${d.id}: título`).toBeTruthy();
      expect(s.text.length, `${d.id}: «${s.title}» sin texto`).toBeGreaterThan(0);
      for (const c of s.ask?.choices || []) expect(c.reply.trim(), `${d.id}: respuesta vacía`).toBeTruthy();
    }
    // Al menos una pregunta interactiva por tutorial.
    expect(d.steps.some((s) => s.ask), `${d.id}: sin pregunta interactiva`).toBe(true);
  }
});

interface Manifest { voice: string; ratePct: number; clips: Record<string, { d: number }> }

test.skipIf(!existsSync(manifestPath))('las piezas de los tutoriales tienen clip pre-generado', async () => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  const missing: string[] = [];
  for (const t of allDemoStaticPieces()) {
    const id = await ttsCacheKey(manifest.voice, manifest.ratePct, t);
    if (!manifest.clips[id]) missing.push(t.slice(0, 60));
  }
  expect(missing, `faltan ${missing.length} clips (ejecuta \`npm run clips\`)`).toEqual([]);
});
