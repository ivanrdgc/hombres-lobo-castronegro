// Pre-generación de la biblioteca de clips del narrador (F6).
// Sintetiza UNA VEZ cada pieza estática del corpus (y las 240 formas de las
// palabras clave) con la voz por defecto, y escribe app/public/clips/<voz>/
// (MP3s content-addressed + manifest.json). Los clips se committean: el deploy
// no necesita ni clave ni pipeline. Ejecutar manualmente cuando cambien los
// textos o la voz:  cd app && npm run clips
// La clave se lee de app/.env.local (VITE_TTS_KEY); como está restringida por
// referrer, la petición manda el Referer del site (CLIPS_REFERER en .env.local).
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allKeywordCombos } from '../src/games/hombres-lobo/roles';
import { allStaticPieces, corpusHash, kwClip } from '../src/games/hombres-lobo/texts/corpus';
import { allExplainStaticPieces } from '../src/games/hombres-lobo/texts/explain';
import { allEspiaStaticPieces } from '../src/games/espia/texts';
import { allUnaNocheStaticPieces } from '../src/games/una-noche/texts';
import { allAvalonStaticPieces } from '../src/games/avalon/texts';
import { allSecretHitlerStaticPieces } from '../src/games/secret-hitler/texts';
import { allChameleonStaticPieces } from '../src/games/chameleon/texts';
import { allInsiderStaticPieces } from '../src/games/insider/texts';
import { allCoupStaticPieces } from '../src/games/coup/texts';
import { allTwoRoomsStaticPieces } from '../src/games/two-rooms/texts';
import { allWavelengthStaticPieces } from '../src/games/wavelength/texts';
import { allCodenamesStaticPieces } from '../src/games/codenames/texts';
import { allSkullStaticPieces } from '../src/games/skull/texts';
import { allLoveLetterStaticPieces } from '../src/games/love-letter/texts';
import { allDecryptoStaticPieces } from '../src/games/decrypto/texts';
import { allGoodCopStaticPieces } from '../src/games/good-cop/texts';
import { allShadowHStaticPieces } from '../src/games/shadow-hunters/texts';
import { allSonarStaticPieces } from '../src/games/sonar/texts';
import { allDemoStaticPieces } from '../src/shell/demo/all-demos';
import { buildSsml, ttsCacheKey } from '../src/core/audio/tts';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');

function readEnvLocal(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of readFileSync(join(APP, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch {
    /* sin .env.local */
  }
  return out;
}

const env = readEnvLocal();
const KEY = process.env.VITE_TTS_KEY || env.VITE_TTS_KEY;
const REFERER = process.env.CLIPS_REFERER || env.CLIPS_REFERER;
const VOICE = process.env.CLIPS_VOICE || 'es-ES-Studio-F';
const RATE_PCT = Number(process.env.CLIPS_RATE || 95);

if (!KEY) {
  console.error('Falta VITE_TTS_KEY en app/.env.local');
  process.exit(1);
}

interface Manifest {
  version: number;
  voice: string;
  ratePct: number;
  builtAt: string;
  corpusHash: number;
  clips: Record<string, { d: number; chars: number }>;
}

async function main(): Promise<void> {
  const kwTexts = allKeywordCombos().flatMap((kw) => [kwClip(kw, true), kwClip(kw, false)]);
  const texts = [...new Set([...allStaticPieces().map((p) => p.text), ...kwTexts, ...allExplainStaticPieces(), ...allEspiaStaticPieces(), ...allUnaNocheStaticPieces(), ...allAvalonStaticPieces(), ...allSecretHitlerStaticPieces(), ...allChameleonStaticPieces(), ...allInsiderStaticPieces(), ...allCoupStaticPieces(), ...allTwoRoomsStaticPieces(), ...allWavelengthStaticPieces(), ...allCodenamesStaticPieces(), ...allSkullStaticPieces(), ...allLoveLetterStaticPieces(), ...allDecryptoStaticPieces(), ...allGoodCopStaticPieces(), ...allShadowHStaticPieces(), ...allSonarStaticPieces(), ...allDemoStaticPieces()])];
  const outDir = join(APP, 'public', 'clips', VOICE);
  mkdirSync(outDir, { recursive: true });

  const manifestPath = join(outDir, 'manifest.json');
  const prev: Manifest | null = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest)
    : null;
  const prevOk = prev && prev.voice === VOICE && prev.ratePct === RATE_PCT;

  const wanted = new Map<string, string>(); // id → texto
  for (const t of texts) wanted.set(await ttsCacheKey(VOICE, RATE_PCT, t), t);

  const clips: Manifest['clips'] = {};
  const pending: [string, string][] = [];
  for (const [id, text] of wanted) {
    const fp = join(outDir, id + '.mp3');
    // Reutiliza cualquier MP3 ya en disco (aunque el manifest previo no cuadre):
    // así una regeneración cortada a medias RESUME sin re-sintetizar (ni pagar).
    if (existsSync(fp)) {
      const size = readFileSync(fp).length;
      clips[id] = (prevOk && prev!.clips[id]) || { d: Math.round((size * 8) / 32000 * 100) / 100, chars: text.length };
    } else {
      pending.push([id, text]);
    }
  }

  console.log(`Corpus: ${texts.length} piezas · ya generadas: ${Object.keys(clips).length} · a sintetizar: ${pending.length}`);
  if (pending.length) {
    // Sonda: si la clave/el referer/el SSML fallan, mejor un error YA que 800.
    const probeId = await ttsCacheKey(VOICE, RATE_PCT, 'Sonda de Castronegro.');
    await synthOne(probeId, 'Sonda de Castronegro.');
    delete clips[probeId];
    console.log('  sonda de síntesis: ok');
  }
  let done = 0;
  let failed = 0;
  const chars = pending.reduce((a, [, t]) => a + t.length, 0);
  if (pending.length) console.log(`(~${chars} caracteres de síntesis)`);

  async function synthOne(id: string, text: string): Promise<void> {
    const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(REFERER ? { Referer: REFERER } : {}) },
      body: JSON.stringify({
        input: { ssml: buildSsml(text, RATE_PCT) },
        voice: { languageCode: 'es-ES', name: VOICE },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 200);
      throw new Error(`tts ${res.status}: ${detail}`);
    }
    const data = (await res.json()) as { audioContent: string };
    const bytes = Buffer.from(data.audioContent, 'base64');
    writeFileSync(join(outDir, id + '.mp3'), bytes);
    clips[id] = { d: Math.round((bytes.length * 8) / 32000 * 100) / 100, chars: text.length };
  }

  const queue = pending.slice();
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (;;) {
      const item = queue.shift();
      if (!item) return;
      const [id, text] = item;
      try {
        await synthOne(id, text);
        done++;
        if (done % 50 === 0) console.log(`  ${done}/${pending.length}…`);
      } catch (e) {
        failed++;
        console.error('FALLO:', JSON.stringify(text.slice(0, 60)), String(e));
      }
    }
  }));

  // Huérfanos: clips de textos que ya no existen.
  let orphans = 0;
  for (const f of readdirSync(outDir)) {
    if (!f.endsWith('.mp3')) continue;
    const id = f.slice(0, -4);
    if (!wanted.has(id)) {
      unlinkSync(join(outDir, f));
      orphans++;
    }
  }

  const manifest: Manifest = {
    version: 2,
    voice: VOICE,
    ratePct: RATE_PCT,
    builtAt: new Date().toISOString(),
    corpusHash: corpusHash(kwTexts),
    clips,
  };
  writeFileSync(manifestPath, JSON.stringify(manifest));
  const totalMb = readdirSync(outDir).filter((f) => f.endsWith('.mp3'))
    .reduce((a, f) => a + statSync(join(outDir, f)).size, 0) / 1024 / 1024;
  console.log(`Hecho: ${Object.keys(clips).length} clips (${totalMb.toFixed(1)} MB) · sintetizados ${done} · fallidos ${failed} · huérfanos borrados ${orphans}`);
  if (failed) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
