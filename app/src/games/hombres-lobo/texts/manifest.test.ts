// Completitud corpus ↔ biblioteca de clips: cada pieza estática (y cada forma
// de palabra clave) debe existir en el manifest pre-generado. Si se edita un
// texto sin regenerar (`npm run clips`), este test lo delata. Antes de la F6
// (sin manifest) se omite.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { allKeywordCombos } from '../roles';
import { allStaticPieces, corpusHash, kwClip } from './corpus';
import { ttsCacheKey } from '../../../core/audio/tts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_VOICE = 'es-ES-Studio-F';
const manifestPath = join(HERE, '../../../../public/clips', DEFAULT_VOICE, 'manifest.json');

interface Manifest {
  voice: string;
  ratePct: number;
  corpusHash: number;
  clips: Record<string, { d: number }>;
}

test.skipIf(!existsSync(manifestPath))('todas las piezas del corpus tienen clip pre-generado', async () => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  const kwTexts = allKeywordCombos().flatMap((kw) => [kwClip(kw, true), kwClip(kw, false)]);
  expect(manifest.corpusHash, 'corpus cambiado sin regenerar clips: ejecuta `npm run clips`').toBe(corpusHash(kwTexts));
  const texts = [...new Set([...allStaticPieces().map((p) => p.text), ...kwTexts])];
  const missing: string[] = [];
  for (const t of texts) {
    const id = await ttsCacheKey(manifest.voice, manifest.ratePct, t);
    if (!manifest.clips[id]) missing.push(t.slice(0, 60));
  }
  expect(missing, `faltan ${missing.length} clips (ejecuta \`npm run clips\`)`).toEqual([]);
});
