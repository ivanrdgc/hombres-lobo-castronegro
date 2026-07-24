// Completitud del guion de El Espía ↔ biblioteca de clips: cada pieza estática
// debe existir en el manifest pre-generado (si se edita un texto sin regenerar
// con `npm run clips`, este test lo delata). Sin manifest, se omite.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { allEspiaStaticPieces, cleanSpeech, outcomeSpeech, voteFailLine, voteLine } from './texts';
import { ttsCacheKey } from '../../core/audio/tts';
import type { EspiaOutcome, EspiaState } from './types';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_VOICE = 'es-ES-Studio-F';
const manifestPath = join(HERE, '../../../public/clips', DEFAULT_VOICE, 'manifest.json');

interface Manifest {
  voice: string;
  ratePct: number;
  clips: Record<string, { d: number }>;
}

test.skipIf(!existsSync(manifestPath))('las piezas de El Espía tienen clip pre-generado', async () => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  const missing: string[] = [];
  for (const t of allEspiaStaticPieces()) {
    const id = await ttsCacheKey(manifest.voice, manifest.ratePct, t);
    if (!manifest.clips[id]) missing.push(t.slice(0, 60));
  }
  expect(missing, `faltan ${missing.length} clips (ejecuta \`npm run clips\`)`).toEqual([]);
});

test('cleanSpeech quita emojis y aplana espacios', () => {
  expect(cleanSpeech('🕵️ ¡Ana era   el espía! 🎉')).toBe('¡Ana era el espía!');
});

// R5: cantar «encabeza X» con dos personas a la misma puntuación era mentira.
describe('cierre de ronda: el marcador', () => {
  const outcome = { type: 'spy_caught', spyId: 'p-c', locationId: 'casino', delta: {}, txt: 'Fin.' } as EspiaOutcome;
  const mk = (scores: Record<string, number>): EspiaState => ({
    round: 2, scores, names: { 'p-a': 'Ana', 'p-b': 'Bea', 'p-c': 'Carlos' },
  } as unknown as EspiaState);

  test('con un líder claro, lo nombra', () => {
    expect(outcomeSpeech(outcome, mk({ 'p-a': 3, 'p-b': 1 }))).toContain('encabeza el marcador Ana con 3 puntos');
  });

  test('con empate, dice que empatan (y a cuántos puntos)', () => {
    const txt = outcomeSpeech(outcome, mk({ 'p-a': 2, 'p-b': 2, 'p-c': 1 }));
    expect(txt).toContain('empatan en cabeza Ana y Bea, con 2 puntos cada uno');
    expect(txt).not.toContain('encabeza');
  });
});

// V1: tras el tiempo no hay reloj que detener ni que devolver a la mesa.
test('las líneas de votación no nombran el reloj en la tanda de acusaciones', () => {
  expect(voteLine('Ana', 'Bea', true)).not.toContain('reloj');
  expect(voteFailLine('Bea', true)).not.toContain('reloj');
  expect(voteLine('Ana', 'Bea')).toContain('reloj');
  expect(voteFailLine('Bea')).toContain('reloj');
});
