// Lint de VOZ: revisa los textos ORIGINALES que la app llega a leer en voz alta
// (intro del lobby, «cómo se juega», tutoriales) y avisa cuando la limpieza para
// audio (cleanForSpeech) se lleva por delante algo que HACÍA falta: emojis que
// son el contenido de la frase («Tus cartas: 👮 👮 🦹»), signos que quedan
// colgando o un artículo sin su sustantivo.
//   cd app && npx tsx scripts/lint-speech.mts
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_DEMOS } from '../src/shell/demo/all-demos';
import { whoLine } from '../src/shell/demo/types';
import { cleanForSpeech } from '../src/core/util/speech';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'games');

// Dos formas históricas de sección: {heading, items} y {title, body} (El Espía).
interface Section { heading?: string; title?: string; items?: string[]; body?: string[] }
const GROUPS: Record<string, string[]> = {};

for (const dir of readdirSync(SRC).sort()) {
  let mod: { INTRO_LOBBY?: string[]; HOW_TO?: Section[] };
  try {
    mod = (await import(join(SRC, dir, 'texts.ts'))) as typeof mod;
  } catch {
    continue;
  }
  GROUPS[dir] = [
    ...(mod.INTRO_LOBBY ?? []),
    ...(mod.HOW_TO ?? []).flatMap((s) => [s.heading ?? s.title ?? '', ...(s.items ?? s.body ?? [])]),
  ].filter(Boolean);
}
for (const d of ALL_DEMOS) {
  GROUPS[`demo:${d.id}`] = d.steps.flatMap((s) => [s.title, ...(s.who ? [whoLine(s.who)] : []), ...s.text]);
}

const EMOJI = /\p{Extended_Pictographic}/u;
const RUN = /(?:\p{Extended_Pictographic}️?[\u{1F3FB}-\u{1F3FF}]?\s*){2,}/u;
const ART = /\b(el|la|los|las|un|una|unos|unas|de|del|con|tu|tus|su|sus|al|y|o|es|era|son|eran)\s+\p{Extended_Pictographic}/iu;

function reasons(raw: string): string[] {
  const out: string[] = [];
  const clean = cleanForSpeech(raw);
  if (RUN.test(raw)) out.push('run de emojis (contenido)');
  if (/[:(«¿¡+→➔,-]\s*$/.test(clean) || /^\s*[):,.»!?]/.test(clean)) out.push('signo colgando');
  if (/\(\s*\)|«\s*»|:\s*[,.;]|\s,\s*[,.]|¡\s*!|¿\s*\?|\s+[.,;:]\s|\s+[.,;:]$/.test(clean)) out.push('puntuación vacía');
  const m = raw.match(new RegExp(ART.source + '(?:️)?(\\s*)(.|$)', 'iu'));
  if (m && (!m[3] || /[.,;:!?)»]/.test(m[3]))) out.push(`«${m[1]}» sin sustantivo`);
  if (EMOJI.test(raw) && !clean) out.push('pieza VACÍA tras limpiar');
  return out;
}

let flagged = 0;
let withEmoji = 0;
let total = 0;
for (const [g, pieces] of Object.entries(GROUPS)) {
  const hits: string[] = [];
  for (const raw of pieces) {
    total++;
    if (EMOJI.test(raw)) withEmoji++;
    const r = reasons(raw);
    if (r.length) { flagged++; hits.push(`  · [${r.join(' + ')}]\n    RAW : ${raw}\n    VOZ : ${cleanForSpeech(raw)}`); }
  }
  if (hits.length) console.log(`\n### ${g} (${hits.length}/${pieces.length})\n${hits.join('\n')}`);
}
console.log(`\n— ${total} piezas, ${withEmoji} con emoji, ${flagged} señaladas —`);
