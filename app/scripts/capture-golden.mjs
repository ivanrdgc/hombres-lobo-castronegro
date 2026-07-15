// Captura de "golden masters" desde la v1 (public/js): registra las salidas de
// la composición de textos (narr/outro/deathLine/loveDeathLine), el reparto
// (buildDeck/generateKeywords) y la explicación, para que los tests de la v2
// garanticen que el port TypeScript es bit-idéntico.
// Se ejecuta UNA vez: `node app/scripts/capture-golden.mjs`. El JSON resultante
// queda committeado; cuando la v1 desaparezca del repo, el fixture permanece.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { narr, outro, deathLine, loveDeathLine, NARRATION } from '../../public/js/narration.js';
import { buildExplainSpeech } from '../../public/js/explain.js';
import { generateKeywords, buildDeck, ROLES } from '../../public/js/roles.js';

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

// Sales representativas: las mismas formas que usa el conductor en partida.
const SALTS = [];
for (const seed of [7, 42, 12345]) {
  SALTS.push(String(seed));
  for (let night = 1; night <= 2; night++) {
    SALTS.push(`${seed}:n${night}`);
    for (let s = 0; s < 3; s++) SALTS.push(`${seed}:n${night}:s${s}:paso`);
  }
  SALTS.push(`${seed}:d1`, `${seed}:d1:1`, `${seed}:d2:1`);
}
for (let i = 0; i < 6; i++) SALTS.push('g' + i);

const golden = { narr: {}, outro: {}, death: {}, love: {}, keywords: {}, decks: {}, explain: [] };

for (const key of [...COMPO_KEYS, ...Object.keys(NARRATION)]) {
  for (const salt of SALTS) golden.narr[key + '|' + salt] = narr(key, salt);
}
for (const key of OUTRO_KEYS) {
  for (const salt of SALTS) golden.outro[key + '|' + salt] = outro(key, salt);
}
for (const name of ['Ana', 'Bruno', 'Carmen García']) {
  for (const role of ['La Vidente', null]) {
    for (const salt of ['7:d1', '42:d2']) {
      golden.death[[name, role || '', salt].join('|')] = deathLine(name, role, salt);
    }
  }
}
for (const [a, b] of [['Ana', 'Bruno'], ['Bruno', 'Ana'], [null, 'Carmen']]) {
  for (const salt of ['d1', 'd2']) {
    golden.love[[a || '', b, salt].join('|')] = loveDeathLine(a, b, salt);
  }
}
for (const seed of [7, 42, 43]) golden.keywords[`18:${seed}`] = generateKeywords(18, seed);
const DECK_CASES = [
  [8, ['vidente', 'bruja', 'cazador', 'cupido'], 50],
  [8, ['ladron', 'vidente', 'bruja'], 11],
  [12, ['lobo_feroz', 'infecto', 'lobo_albino', 'vidente', 'dos_hermanas'], 7],
  [18, ['dos_hermanas', 'tres_hermanos', 'vidente', 'bruja'], 3],
  [8, ['vidente', 'bruja', 'cazador', 'defensor'], 42, null, 4],
];
for (const [n, extras, seed, wolves = null, villagers = null] of DECK_CASES) {
  const { deck, center, dropped } = buildDeck(n, extras, seed, wolves, villagers);
  golden.decks[`${n}|${extras.join(',')}|${seed}|${wolves}|${villagers}`] = { deck, center, dropped };
}
const EXPLAIN_CASES = [
  { currentGame: 'hombres_lobo', extraRoles: ['vidente', 'bruja', 'cazador'], settings: { revealDead: true, alguacil: true } },
  {
    currentGame: 'hombres_lobo',
    extraRoles: Object.keys(ROLES).filter((id) => id !== 'hombre_lobo' && id !== 'aldeano'),
    settings: { revealDead: true, showComposition: true, alguacil: true },
  },
];
for (const group of EXPLAIN_CASES) {
  golden.explain.push({ group, speech: buildExplainSpeech(group) });
}

const out = join(dirname(fileURLToPath(import.meta.url)), '../src/games/hombres-lobo/texts/golden-v1.json');
writeFileSync(out, JSON.stringify(golden));
const counts = Object.fromEntries(Object.entries(golden).map(([k, v]) => [k, Array.isArray(v) ? v.length : Object.keys(v).length]));
console.log('golden-v1.json escrito:', counts);
