// Golden masters: las salidas de la v1 (public/js), capturadas por
// app/scripts/capture-golden.mjs, deben reproducirse BIT A BIT en el port TS.
// De esta composición cuelgan el texto en pantalla, la voz y (en F6) los ids
// de los clips pre-generados: cualquier desviación rompería la caché de audio.
import { expect, test } from 'vitest';
import goldenJson from './golden-v1.json';
import { deathLine, loveDeathLine, narr, outro, NARRATION } from './corpus';
import { buildDeck, generateKeywords } from '../roles';
import type { RoleId } from '../roles';
import { buildExplainSpeech } from './explain';
import type { ExplainGroup } from './explain';

interface Golden {
  narr: Record<string, string>;
  outro: Record<string, string | null>;
  death: Record<string, string>;
  love: Record<string, string>;
  keywords: Record<string, string[]>;
  decks: Record<string, { deck: string[]; center: string[]; dropped: { id: string; reason: string }[] }>;
  explain: { group: ExplainGroup; speech: { text: string; segments: { text: string; ssml: string }[] } }[];
}
const golden = goldenJson as unknown as Golden;

// La MISMA matriz de sales que generó el fixture (ver capture-golden.mjs).
const COMPO_KEYS = [
  'bienvenida', 'noche_cae', 'ladron', 'cupido', 'enamorados', 'nino_salvaje', 'perro_lobo',
  'actor', 'defensor', 'vidente', 'zorro', 'cuervo', 'lobos_noche1', 'lobos', 'encantados',
  'lobo_feroz', 'lobo_albino', 'bruja', 'gaitero', 'gitana', 'amanecer_sin_muertes',
  'amanecer_con_muertes', 'dia_debate', 'dia_debate_tranquilo', 'fin_partida',
];
const OUTRO_KEYS = [
  'ladron', 'cupido', 'enamorados', 'nino_salvaje', 'perro_lobo', 'dos_hermanas', 'tres_hermanos',
  'actor', 'defensor', 'vidente', 'zorro', 'cuervo', 'lobos_reconocen', 'lobos', 'infecto_decision',
  'lobo_feroz', 'lobo_albino', 'bruja', 'gaitero', 'encantados', 'gitana',
];
const SALTS: string[] = [];
for (const seed of [7, 42, 12345]) {
  SALTS.push(String(seed));
  for (let night = 1; night <= 2; night++) {
    SALTS.push(`${seed}:n${night}`);
    for (let s = 0; s < 3; s++) SALTS.push(`${seed}:n${night}:s${s}:paso`);
  }
  SALTS.push(`${seed}:d1`, `${seed}:d1:1`, `${seed}:d2:1`);
}
for (let i = 0; i < 6; i++) SALTS.push('g' + i);

test('golden: narr() reproduce la v1 en todas las claves y sales', () => {
  let checked = 0;
  for (const key of [...COMPO_KEYS, ...Object.keys(NARRATION)]) {
    for (const salt of SALTS) {
      expect(narr(key, salt), `narr(${key}, ${salt})`).toBe(golden.narr[key + '|' + salt]);
      checked++;
    }
  }
  expect(checked).toBe(Object.keys(golden.narr).length);
});

test('golden: outro() reproduce la v1', () => {
  let checked = 0;
  for (const key of OUTRO_KEYS) {
    for (const salt of SALTS) {
      expect(outro(key, salt), `outro(${key}, ${salt})`).toBe(golden.outro[key + '|' + salt]);
      checked++;
    }
  }
  expect(checked).toBe(Object.keys(golden.outro).length);
});

test('golden: deathLine() y loveDeathLine() reproducen la v1', () => {
  for (const name of ['Ana', 'Bruno', 'Carmen García']) {
    for (const role of ['La Vidente', null]) {
      for (const salt of ['7:d1', '42:d2']) {
        expect(deathLine(name, role, salt)).toBe(golden.death[[name, role || '', salt].join('|')]);
      }
    }
  }
  for (const [a, b] of [['Ana', 'Bruno'], ['Bruno', 'Ana'], [null, 'Carmen']] as [string | null, string][]) {
    for (const salt of ['d1', 'd2']) {
      expect(loveDeathLine(a, b, salt)).toBe(golden.love[[a || '', b, salt].join('|')]);
    }
  }
});

test('golden: generateKeywords() y buildDeck() reproducen la v1 (mulberry32/shuffled idénticos)', () => {
  for (const seed of [7, 42, 43]) {
    expect(generateKeywords(18, seed)).toEqual(golden.keywords[`18:${seed}`]);
  }
  const DECK_CASES: [number, RoleId[], number, (number | null)?, (number | null)?][] = [
    [8, ['vidente', 'bruja', 'cazador', 'cupido'], 50],
    [8, ['ladron', 'vidente', 'bruja'], 11],
    [12, ['lobo_feroz', 'infecto', 'lobo_albino', 'vidente', 'dos_hermanas'], 7],
    [18, ['dos_hermanas', 'tres_hermanos', 'vidente', 'bruja'], 3],
    [8, ['vidente', 'bruja', 'cazador', 'defensor'], 42, null, 4],
  ];
  for (const [n, extras, seed, wolves = null, villagers = null] of DECK_CASES) {
    const { deck, center, dropped } = buildDeck(n, extras, seed, wolves, villagers);
    const g = golden.decks[`${n}|${extras.join(',')}|${seed}|${wolves}|${villagers}`];
    expect(deck).toEqual(g.deck);
    expect(center).toEqual(g.center);
    expect(dropped).toEqual(g.dropped);
  }
});

test('golden: buildExplainSpeech() reproduce la v1 (texto y SSML)', () => {
  expect(golden.explain.length).toBe(2);
  for (const { group, speech } of golden.explain) {
    expect(buildExplainSpeech(group)).toEqual(speech);
  }
});
