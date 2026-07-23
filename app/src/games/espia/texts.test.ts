// Completitud del guion de El Espía ↔ biblioteca de clips: cada pieza estática
// debe existir en el manifest pre-generado (si se edita un texto sin regenerar
// con `npm run clips`, este test lo delata). Sin manifest, se omite.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { allEspiaStaticPieces, cleanSpeech } from './texts';
import { ttsCacheKey } from '../../core/audio/tts';

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
