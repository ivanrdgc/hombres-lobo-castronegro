// B23 · Guardia de los audios: ninguna frase que la app llegue a leer en voz
// alta puede depender de un emoji para entenderse. `cleanForSpeech` los quita
// (si no, la voz diría «policía policía villano»), así que una frase como
// «Tus cartas: 👮 👮 🦹» se oye «Tus cartas:» y la mesa se queda sin la
// información. Este test recorre TODAS las piezas habladas de TODOS los juegos
// —intro del lobby, «cómo se juega» y los tutoriales— y falla si alguna se
// queda coja. Arreglo: redactar la frase para que se sostenga sola en voz
// («Tus cartas: 👮 👮 🦹 — dos honestas y una corrupta»), sin quitar el emoji
// de la pantalla.
import { describe, expect, it } from 'vitest';
import { ALL_DEMOS } from '../../shell/demo/all-demos';
import { stepSpeech } from '../../shell/demo/types';
import { cleanForSpeech } from './speech';

// Las dos formas históricas de sección de ayuda: {heading, items} y {title, body}.
interface Section { heading?: string; title?: string; items?: string[]; body?: string[] }
interface TextsModule { INTRO_LOBBY?: string[]; HOW_TO?: Section[] }

const modules = import.meta.glob<TextsModule>('../../games/*/texts.ts', { eager: true });

/** Todo lo que la app puede pronunciar, agrupado por origen. */
function spokenByGroup(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [path, mod] of Object.entries(modules)) {
    const game = path.split('/').at(-2) ?? path;
    out[game] = [
      ...(mod.INTRO_LOBBY ?? []),
      ...(mod.HOW_TO ?? []).flatMap((s) => [s.heading ?? s.title ?? '', ...(s.items ?? s.body ?? [])]),
    ].filter(Boolean);
  }
  for (const d of ALL_DEMOS) {
    out[`tutorial:${d.id}`] = d.steps.flatMap(stepSpeech);
  }
  return out;
}

/** Un emoji o una ristra de ellos, con los espacios que arrastran. */
const RUN_G = /(?:\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}])*(?:‍\p{Extended_Pictographic}️?)*\s*)+/gu;
/** Palabra que pide algo detrás: si va justo antes del emoji, el emoji ERA ese algo. */
const NEEDS_MORE = /(?:^|[\s(«"¡¿])(el|la|los|las|un|una|unos|unas|del|al|de|con|en|sin|por|para|y|o|u|es|era|son|eran|tu|tus|su|sus|lleva|llevan|muestra|muestran|marca|marcan|sale|salen|dice|dicen|pone|ponen|queda|quedan|toca|tocas)\s+$/i;
/** Y detrás del emoji ya no viene nada que rellene el hueco. */
/** Determinante + emoji + palabra que no puede ser el sustantivo: «consulta tu
 *  🎴 siempre que dudes» se oye «consulta tu siempre que dudes». */
const DET_EMOJI = /\b(el|la|los|las|un|una|tu|tus|su|sus|mi|mis|al|del)\s+(\p{Extended_Pictographic}️?)\s+(?:siempre|cuando|para|si|que|y|o|en|con|más|muy|también|ahí|aquí|ya|no|sí|desde|hasta|antes|después|solo|sólo)\b/iu;
const NOTHING_AFTER = /^\s*(?:[,.;:!?)»\]]|→|$)/;

function problem(raw: string): string | null {
  const voz = cleanForSpeech(raw);
  if (!voz) return 'la pieza se queda VACÍA al leerla';
  const survivor = voz.match(/\p{Extended_Pictographic}/u);
  if (survivor) return `el símbolo «${survivor[0]}» llega al sintetizador`;
  if (/\(\s*[,;.]/.test(voz)) return 'un paréntesis arranca con un signo suelto';
  if (/\(\s*(?:[yoeu]|,)\s*\)/.test(voz)) return 'un paréntesis se queda sin contenido';
  const asNoun = raw.match(DET_EMOJI);
  if (asNoun) return `«${asNoun[1]} ${asNoun[2]}» usa el emoji de sustantivo`;
  for (const m of raw.matchAll(RUN_G)) {
    const before = raw.slice(0, m.index);
    if (!NOTHING_AFTER.test(raw.slice(m.index + m[0].length))) continue;
    const emoji = m[0].trim();
    const word = before.match(NEEDS_MORE);
    if (word) return `«${word[1]} ${emoji}» se queda sin sustantivo`;
    if (/:\s*$/.test(before)) return `«: ${emoji}» deja los dos puntos sin respuesta`;
    if (/\d\s*$/.test(before)) return `«${emoji}» era la unidad de la cifra`;
  }
  return null;
}

describe('B23 · las frases habladas no pueden depender de un emoji', () => {
  const groups = spokenByGroup();

  it('cubre los tutoriales y las ayudas de todos los juegos', () => {
    expect(Object.keys(groups).length).toBeGreaterThanOrEqual(30);
  });

  for (const [group, pieces] of Object.entries(groups)) {
    it(`${group}: todas las piezas se entienden sin ver la pantalla`, () => {
      const bad = pieces
        .map((raw) => ({ raw, why: problem(raw) }))
        .filter((x) => x.why)
        .map((x) => `  ${x.why}\n    RAW: ${x.raw}\n    VOZ: ${cleanForSpeech(x.raw)}`);
      expect(bad.join('\n'), `\n${bad.length} frase(s) cojas en ${group}:\n`).toBe('');
    });
  }
});
