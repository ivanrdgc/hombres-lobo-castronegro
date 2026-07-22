// Tests del motor puro de «Una Noche en Castronegro». Lo crítico: el rastreo
// de cartas por silla (intercambios) y la matriz de condiciones de victoria
// (que en Una Noche son de las más sutiles). La votación (una persona registra
// la decisión del pueblo) vive en actions.ts sobre estos mismos helpers.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  ROLES, ACTION_ROLES, dealOneNight, recommendedComposition, compositionSize, CENTER_COUNT,
} from './roles';
import {
  computeNightSteps, stepActors, robberSwap, troublemakerSwap, drunkSwap,
  seerViewPlayer, seerViewCenter, checkWinner, packmates,
  nightIs, dobleId, finalRoleOf, finalRolesOf,
} from './engine';
import type { Composition, GameState, RoleId } from './types';

const mkPlayers = (n: number) => Array.from({ length: n }, (_, i) => ({
  id: 'p' + i, name: 'J' + i, order: i, inGame: true,
}));

const mkGame = (over: Partial<GameState> = {}): GameState => ({
  phase: 'night', stepIdx: 0, steps: [], acts: {},
  playerIds: [], names: {},
  originalRole: {}, slots: {}, center: [], composition: {}, selectedRoles: [],
  log: [], ...over,
});

// ——— Reparto ———

test('recommendedComposition suma siempre n+3 cartas', () => {
  for (let n = 3; n <= 10; n++) {
    const comp = recommendedComposition(n);
    assert.equal(compositionSize(comp), n + CENTER_COUNT, `n=${n}`);
  }
});

test('dealOneNight reparte n cartas a jugadores y 3 al centro; slots = original al empezar', () => {
  const players = mkPlayers(5);
  const comp: Composition = { lobo: 2, vidente: 1, ladron: 1, alborotadora: 1, aldeano: 3 };
  assert.equal(compositionSize(comp), 5 + 3);
  const { originalRole, slots, center } = dealOneNight(players, comp, 42);
  assert.equal(Object.keys(originalRole).length, 5);
  assert.equal(center.length, 3);
  assert.deepEqual(slots, originalRole);
  // Todas las cartas repartidas + centro = el mazo exacto.
  const all = [...Object.values(originalRole), ...center].sort();
  const pool: RoleId[] = [];
  for (const [r, k] of Object.entries(comp) as [RoleId, number][]) for (let i = 0; i < k; i++) pool.push(r);
  assert.deepEqual(all, pool.sort());
});

test('dealOneNight es determinista por semilla', () => {
  const players = mkPlayers(4);
  const comp: Composition = { lobo: 2, vidente: 1, aldeano: 2, insomne: 1, ladron: 1 };
  const a = dealOneNight(players, comp, 7);
  const b = dealOneNight(players, comp, 7);
  const c = dealOneNight(players, comp, 8);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.originalRole, c.originalRole);
});

// ——— Pasos de la noche ———

test('computeNightSteps: solo los roles de ACCIÓN presentes, en orden de despertar', () => {
  const comp: Composition = { lobo: 2, vidente: 1, insomne: 1, aldeano: 3, cazador: 1 };
  const steps = computeNightSteps(comp);
  // durmiendo … amanecer, con lobos < vidente < insomne, y sin pasos para aldeano/cazador.
  assert.equal(steps[0], 'durmiendo');
  assert.equal(steps[steps.length - 1], 'amanecer');
  assert.deepEqual(steps.slice(1, -1), ['lobos', 'vidente', 'insomne']);
});

test('computeNightSteps llama a un rol aunque esté SOLO en el centro (anti-pistas)', () => {
  // El Vidente está en el mazo (composición) aunque quizá caiga en el centro.
  const comp: Composition = { lobo: 2, vidente: 1, aldeano: 3 };
  assert.ok(computeNightSteps(comp).includes('vidente'));
});

test('stepActors: despierta por carta REPARTIDA; el rol en el centro es paso fantasma', () => {
  const players = mkPlayers(4);
  const game = mkGame({
    originalRole: { p0: 'lobo', p1: 'lobo', p2: 'vidente', p3: 'aldeano' },
    composition: { lobo: 2, vidente: 1, aldeano: 2, ladron: 1 }, // ladron va al centro
  });
  assert.deepEqual(stepActors('lobos', game, players)!.sort(), ['p0', 'p1']);
  assert.deepEqual(stepActors('vidente', game, players), ['p2']);
  assert.equal(stepActors('ladron', game, players), null); // nadie repartió Ladrón → fantasma
  // Tras confirmar los lobos, ya no despiertan.
  game.acts.lobosSeen = { p0: true, p1: true };
  assert.equal(stepActors('lobos', game, players), null);
});

test('packmates: los lobos se reconocen entre sí (no a sí mismos)', () => {
  const players = mkPlayers(3);
  const game = mkGame({ originalRole: { p0: 'lobo', p1: 'lobo', p2: 'aldeano' } });
  assert.deepEqual(packmates(game, players, 'lobo', 'p0').map((p) => p.id), ['p1']);
});

// ——— Intercambios ———

test('robberSwap: el Ladrón toma la carta del objetivo y este se queda la del Ladrón', () => {
  const game = mkGame({ slots: { p0: 'ladron', p1: 'lobo' } });
  const nueva = robberSwap(game, 'p0', 'p1');
  assert.equal(nueva, 'lobo');
  assert.equal(game.slots.p0, 'lobo');
  assert.equal(game.slots.p1, 'ladron');
});

test('troublemakerSwap: intercambia dos ajenas sin tocar la propia', () => {
  const game = mkGame({ slots: { p0: 'alborotadora', p1: 'lobo', p2: 'aldeano' } });
  troublemakerSwap(game, 'p1', 'p2');
  assert.equal(game.slots.p1, 'aldeano');
  assert.equal(game.slots.p2, 'lobo');
  assert.equal(game.slots.p0, 'alborotadora');
});

test('drunkSwap: intercambia con el centro sin mirar', () => {
  const game = mkGame({ slots: { p0: 'borracho' }, center: ['lobo', 'aldeano', 'vidente'] });
  drunkSwap(game, 'p0', 0);
  assert.equal(game.slots.p0, 'lobo');
  assert.equal(game.center[0], 'borracho');
});

test('encadenado Ladrón→Alborotadora: el orden importa (la carta final manda)', () => {
  // p0 Ladrón roba a p1 (lobo) → p0=lobo, p1=ladron. Luego la Alborotadora (p2)
  // intercambia p0 y p3 → el lobo acaba en p3.
  const game = mkGame({ slots: { p0: 'ladron', p1: 'lobo', p2: 'alborotadora', p3: 'aldeano' } });
  robberSwap(game, 'p0', 'p1');
  troublemakerSwap(game, 'p0', 'p3');
  assert.equal(game.slots.p3, 'lobo');
  assert.equal(game.slots.p0, 'aldeano');
  assert.equal(game.slots.p1, 'ladron');
});

test('seerView: foto de lo visto (jugador o centro)', () => {
  const game = mkGame({ slots: { p0: 'vidente', p1: 'lobo' }, center: ['aldeano', 'tanner', 'insomne'] });
  assert.deepEqual(seerViewPlayer(game, 'p1'), { kind: 'player', pid: 'p1', role: 'lobo' });
  assert.deepEqual(seerViewCenter(game, [0, 2]), { kind: 'center', idx: [0, 2], roles: ['aldeano', 'insomne'] });
});

// ——— Matriz de victorias ———

const pids4 = ['p0', 'p1', 'p2', 'p3'];

test('victoria: muere un lobo → gana el Pueblo', () => {
  const roles: Record<string, RoleId> = { p0: 'lobo', p1: 'aldeano', p2: 'vidente', p3: 'aldeano' };
  assert.deepEqual(checkWinner(roles, ['p0'], pids4), ['pueblo']);
});

test('victoria: hay lobos y ninguno muere → ganan los Lobos', () => {
  const roles: Record<string, RoleId> = { p0: 'lobo', p1: 'aldeano', p2: 'vidente', p3: 'aldeano' };
  assert.deepEqual(checkWinner(roles, ['p1'], pids4), ['lobos']); // muere un aldeano
  assert.deepEqual(checkWinner(roles, [], pids4), ['lobos']); // no muere nadie, pero hay lobos
});

test('victoria: sin lobos en juego (todos al centro) y nadie muere → gana el Pueblo', () => {
  const roles: Record<string, RoleId> = { p0: 'aldeano', p1: 'aldeano', p2: 'vidente', p3: 'insomne' };
  assert.deepEqual(checkWinner(roles, [], pids4), ['pueblo']);
});

test('victoria: sin lobos y muere un aldeano → nadie gana (salvo Esbirro)', () => {
  const roles: Record<string, RoleId> = { p0: 'aldeano', p1: 'aldeano', p2: 'vidente', p3: 'insomne' };
  assert.deepEqual(checkWinner(roles, ['p0'], pids4), ['nadie']);
  const conEsbirro: Record<string, RoleId> = { p0: 'aldeano', p1: 'esbirro', p2: 'vidente', p3: 'insomne' };
  assert.deepEqual(checkWinner(conEsbirro, ['p0'], pids4), ['lobos']); // el Esbirro gana con su bando
});

test('victoria: muere el Curtidor y ningún lobo → gana SOLO el Curtidor', () => {
  const roles: Record<string, RoleId> = { p0: 'tanner', p1: 'lobo', p2: 'aldeano', p3: 'vidente' };
  assert.deepEqual(checkWinner(roles, ['p0'], pids4), ['tanner']); // lobos NO ganan aunque sobrevivan
});

test('victoria: mueren el Curtidor y un lobo → ganan Curtidor y Pueblo', () => {
  const roles: Record<string, RoleId> = { p0: 'tanner', p1: 'lobo', p2: 'aldeano', p3: 'vidente' };
  assert.deepEqual(checkWinner(roles, ['p0', 'p1'], pids4).sort(), ['pueblo', 'tanner']);
});

test('victoria: el Esbirro muere pero un lobo sobrevive → ganan los Lobos', () => {
  const roles: Record<string, RoleId> = { p0: 'esbirro', p1: 'lobo', p2: 'aldeano', p3: 'vidente' };
  assert.deepEqual(checkWinner(roles, ['p0'], pids4), ['lobos']);
});

test('victoria: reparto real, un lobo robado se lleva la culpa por su carta FINAL', () => {
  // p0 era Ladrón y robó al lobo p1: la carta final de p0 es lobo, la de p1 ladron.
  const game = mkGame({ slots: { p0: 'ladron', p1: 'lobo', p2: 'aldeano', p3: 'vidente' } });
  robberSwap(game, 'p0', 'p1');
  // El pueblo vota a p0 (que ahora ES lobo): gana el Pueblo.
  assert.deepEqual(checkWinner(game.slots, ['p0'], pids4), ['pueblo']);
  // Y p1 (ahora Ladrón, del pueblo) sobrevivió: coherente.
  assert.equal(game.slots.p1, 'ladron');
});

test('ACTION_ROLES está ordenado por wake (El Doble el primero) y cubre los 9 roles de acción', () => {
  assert.deepEqual(ACTION_ROLES,
    ['doble', 'lobo', 'esbirro', 'mason', 'vidente', 'ladron', 'alborotadora', 'borracho', 'insomne']);
  for (const r of ACTION_ROLES) assert.ok(ROLES[r].wake !== undefined);
});

// ——— El Doble ———

test('computeNightSteps: el paso del Doble va el PRIMERO', () => {
  const steps = computeNightSteps({ doble: 1, lobo: 2, vidente: 1, aldeano: 3 });
  assert.deepEqual(steps.slice(0, 2), ['durmiendo', 'doble']);
});

test('stepActors(doble): actúa hasta copiar; si copió un rol instantáneo, sigue hasta completarlo', () => {
  const players = mkPlayers(4);
  const game = mkGame({ originalRole: { p0: 'doble', p1: 'lobo', p2: 'vidente', p3: 'aldeano' } });
  assert.deepEqual(stepActors('doble', game, players), ['p0']); // aún no copió
  game.acts.dobleRole = 'vidente'; // copió Vidente (instantáneo)
  assert.deepEqual(stepActors('doble', game, players), ['p0']); // debe ejecutar la visión
  game.acts.dobleActionDone = true;
  assert.equal(stepActors('doble', game, players), null);
});

test('Doble que copia Lobo: despierta CON los lobos y se reconocen mutuamente', () => {
  const players = mkPlayers(3);
  const game = mkGame({
    originalRole: { p0: 'doble', p1: 'lobo', p2: 'aldeano' },
    acts: { dobleRole: 'lobo', dobleActionDone: true },
  });
  assert.equal(nightIs(game, 'p0', 'lobo'), true);
  assert.deepEqual(stepActors('lobos', game, players)!.sort(), ['p0', 'p1']);
  assert.deepEqual(packmates(game, players, 'lobo', 'p1').map((p) => p.id), ['p0']);
});

test('Doble que copia un rol instantáneo NO vuelve a despertar en el paso de ese rol', () => {
  const players = mkPlayers(3);
  const game = mkGame({
    originalRole: { p0: 'doble', p1: 'vidente', p2: 'aldeano' },
    acts: { dobleRole: 'vidente', dobleActionDone: true },
  });
  // El paso 'vidente' solo despierta a la Vidente REPARTIDA (p1), no al Doble.
  assert.deepEqual(stepActors('vidente', game, players), ['p1']);
});

test('finalRoleOf: conserva la carta doble → es el rol copiado; carta real → esa carta', () => {
  const players = mkPlayers(3);
  const game = mkGame({
    originalRole: { p0: 'doble', p1: 'lobo', p2: 'aldeano' },
    slots: { p0: 'doble', p1: 'lobo', p2: 'aldeano' },
    acts: { dobleRole: 'tanner' },
  });
  assert.equal(dobleId(game, players), 'p0');
  assert.equal(finalRoleOf(game, players, 'p0'), 'tanner'); // Doble-Curtidor
  assert.equal(finalRoleOf(game, players, 'p1'), 'lobo');
});

test('Doble-Curtidor: si lo linchan, gana el Curtidor (por el rol copiado)', () => {
  const players = mkPlayers(4);
  const game = mkGame({
    originalRole: { p0: 'doble', p1: 'lobo', p2: 'aldeano', p3: 'vidente' },
    slots: { p0: 'doble', p1: 'lobo', p2: 'aldeano', p3: 'vidente' },
    acts: { dobleRole: 'tanner' },
  });
  const finalRoles = finalRolesOf(game, players);
  assert.equal(finalRoles.p0, 'tanner');
  // El pueblo condena a p0 (el Doble-Curtidor).
  assert.deepEqual(checkWinner(finalRoles, ['p0'], pids4), ['tanner']); // los lobos sobreviven pero NO ganan
});

test('Doble copia Ladrón, roba una carta real y ACABA siendo ese rol; la doble huérfana = aldeano', () => {
  const players = mkPlayers(3);
  const game = mkGame({
    originalRole: { p0: 'doble', p1: 'lobo', p2: 'aldeano' },
    slots: { p0: 'doble', p1: 'lobo', p2: 'aldeano' },
    acts: { dobleRole: 'ladron' },
  });
  // El Doble-Ladrón roba a p1: su carta 'doble' va a p1, y él se queda 'lobo'.
  const nueva = robberSwap(game, 'p0', 'p1');
  assert.equal(nueva, 'lobo');
  assert.equal(finalRoleOf(game, players, 'p0'), 'lobo'); // acabó siendo lobo (carta real)
  assert.equal(finalRoleOf(game, players, 'p1'), 'aldeano'); // recibió la carta doble huérfana
});

test('Doble copia Villano: su carta doble es arrastrada por la Alborotadora → es la carta nueva', () => {
  // Doble (p0) copió aldeano; la Alborotadora intercambia su carta con la de p1 (lobo).
  const players = mkPlayers(3);
  const game = mkGame({
    originalRole: { p0: 'doble', p1: 'lobo', p2: 'alborotadora' },
    slots: { p0: 'doble', p1: 'lobo', p2: 'alborotadora' },
    acts: { dobleRole: 'aldeano' },
  });
  troublemakerSwap(game, 'p0', 'p1');
  assert.equal(finalRoleOf(game, players, 'p0'), 'lobo'); // su carta cambió: ahora es lobo
  assert.equal(finalRoleOf(game, players, 'p1'), 'aldeano'); // recibió la doble huérfana
});

test('finalRolesOf: partida con Doble-Lobo cuenta como lobo en la victoria', () => {
  const players = mkPlayers(4);
  const game = mkGame({
    originalRole: { p0: 'doble', p1: 'lobo', p2: 'aldeano', p3: 'vidente' },
    slots: { p0: 'doble', p1: 'lobo', p2: 'aldeano', p3: 'vidente' },
    acts: { dobleRole: 'lobo' },
  });
  const roles = finalRolesOf(game, players);
  assert.equal(roles.p0, 'lobo'); // Doble-Lobo
  // El pueblo condena a p2 (aldeano): con dos lobos vivos, ganan los lobos.
  assert.deepEqual(checkWinner(roles, ['p2'], pids4), ['lobos']);
});
