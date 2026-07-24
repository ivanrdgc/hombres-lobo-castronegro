// Tests del motor puro de «El Camaleón»: reparto (tema no repetido, palabra,
// Camaleón que NO repite, starter), turno de las pistas, recuento del voto
// (mayoría estricta, empate = escapa) y que las rejillas tienen 16 palabras
// únicas.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { TOPICS } from './topics';
import {
  dealRound, tallyVotes, allVoted, votedCount, voteRows, outcomeReason,
  clueOrder, cluesGiven, cluesDone, currentCluePid, nextCluePid,
  playersOf, isChameleon, secretWord, GRID_SIZE, MIN_PLAYERS,
} from './engine';
import type { ChameleonState } from './types';

const mkGame = (over: Partial<ChameleonState> = {}): ChameleonState => ({
  chameleon: true, phase: 'vote', startedAt: 1, seed: 1, round: 1,
  playerIds: [], names: {}, topicId: 'playa', grid: TOPICS[0].words.slice(), secret: 0,
  chameleonId: '', seen: {}, starterIdx: 0, clueIdx: 0, votes: {}, accusedId: null, caught: false,
  guess: null, guessedRight: false, winner: null, scores: {}, usedTopics: [], log: [], ...over,
});

test('cada tema tiene 16 palabras ÚNICAS', () => {
  for (const t of TOPICS) {
    assert.equal(t.words.length, GRID_SIZE, `${t.id} tiene 16`);
    assert.equal(new Set(t.words).size, GRID_SIZE, `${t.id} sin repetidas`);
  }
});

test('ninguna rejilla repite la RAÍZ de otra palabra (Portería/Portero regalaba un 50/50)', () => {
  // Aproximación tosca pero suficiente: dos palabras cuyos 6 primeros caracteres
  // coinciden son casi siempre la misma familia (Queso/Quesos, Portería/Portero).
  for (const t of TOPICS) {
    const raices = t.words.map((w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 6));
    assert.equal(new Set(raices).size, GRID_SIZE, `${t.id}: dos palabras de la misma familia`);
    // Y ninguna casilla puede llamarse como el propio tema.
    for (const w of t.words) assert.ok(!t.name.toLowerCase().includes(w.toLowerCase()), `${t.id}: «${w}» es el tema`);
  }
});

test('hay temas de sobra para una noche larga', () => {
  assert.ok(TOPICS.length >= 16, `solo ${TOPICS.length} temas`);
  assert.equal(new Set(TOPICS.map((t) => t.id)).size, TOPICS.length, 'ids únicos');
});

test('dealRound: tema válido, palabra 0..15, Camaleón y starter dentro de rango', () => {
  const pids = ['p0', 'p1', 'p2', 'p3'];
  const d = dealRound(pids, 1, [], 123);
  assert.ok(TOPICS.some((t) => t.id === d.topicId));
  assert.equal(d.grid.length, GRID_SIZE);
  assert.ok(d.secret >= 0 && d.secret < GRID_SIZE);
  assert.ok(pids.includes(d.chameleonId));
  assert.ok(d.starterIdx >= 0 && d.starterIdx < pids.length);
});

test('dealRound es determinista por semilla y NO repite tema usado', () => {
  const pids = ['p0', 'p1', 'p2'];
  const a = dealRound(pids, 1, [], 55);
  const b = dealRound(pids, 1, [], 55);
  assert.deepEqual(a, b);
  const used = TOPICS.slice(0, TOPICS.length - 1).map((t) => t.id); // todos menos uno usados
  const c = dealRound(pids, 2, used, 999);
  assert.equal(c.topicId, TOPICS[TOPICS.length - 1].id, 'coge el único tema libre');
});

test('dealRound NO repite el Camaleón de la ronda anterior', () => {
  const pids = ['p0', 'p1', 'p2', 'p3'];
  for (let seed = 1; seed < 60; seed++) {
    const d = dealRound(pids, 2, [], seed, 'p1');
    assert.notEqual(d.chameleonId, 'p1', `semilla ${seed}`);
    assert.ok(pids.includes(d.chameleonId));
  }
  // Caso límite: si el único jugador posible es el anterior, no se bloquea.
  assert.equal(dealRound(['solo'], 2, [], 7, 'solo').chameleonId, 'solo');
});

test('turno de las pistas: empieza el starter, avanza y se cierra la vuelta', () => {
  const pids = ['p0', 'p1', 'p2', 'p3'];
  const g = mkGame({ phase: 'clue', playerIds: pids, starterIdx: 2, clueIdx: 0 });
  assert.deepEqual(clueOrder(g), ['p2', 'p3', 'p0', 'p1']);
  assert.equal(currentCluePid(g), 'p2');
  assert.equal(nextCluePid(g), 'p3');
  assert.equal(cluesDone(g), false);
  const g2 = { ...g, clueIdx: 3 };
  assert.equal(currentCluePid(g2), 'p1');
  assert.equal(nextCluePid(g2), null, 'el último cierra la vuelta');
  const g3 = { ...g, clueIdx: 4 };
  assert.equal(cluesDone(g3), true);
  assert.equal(currentCluePid(g3), null);
  // Partidas repartidas antes de existir el turno (clueIdx ausente) no rompen.
  const viejo = { ...g, clueIdx: undefined as unknown as number };
  assert.equal(cluesGiven(viejo), 0);
  assert.equal(currentCluePid(viejo), 'p2');
});

test('tallyVotes: el más votado gana; empate en cabeza → nadie (null)', () => {
  const pids = ['p0', 'p1', 'p2', 'p3'];
  // p1 con 2 votos, p0 con 1, p2 con 1 → acusado p1.
  const g = mkGame({ playerIds: pids, votes: { p0: 'p1', p1: 'p0', p2: 'p1', p3: 'p2' } });
  assert.equal(tallyVotes(g).accusedId, 'p1');
  // Empate p1/p2 a 2 → nadie.
  const g2 = mkGame({ playerIds: pids, votes: { p0: 'p1', p1: 'p2', p2: 'p1', p3: 'p2' } });
  assert.equal(tallyVotes(g2).accusedId, null);
});

test('allVoted / votedCount detectan cuando faltan votos', () => {
  const pids = ['p0', 'p1', 'p2'];
  assert.equal(allVoted(mkGame({ playerIds: pids, votes: { p0: 'p1', p1: 'p2' } })), false);
  assert.equal(votedCount(mkGame({ playerIds: pids, votes: { p0: 'p1', p1: 'p2' } })), 2);
  assert.equal(allVoted(mkGame({ playerIds: pids, votes: { p0: 'p1', p1: 'p2', p2: 'p0' } })), true);
});

test('voteRows destapa quién votó a quién, de más a menos votos', () => {
  const g = mkGame({
    playerIds: ['a', 'b', 'c', 'd'], names: { a: 'Ana', b: 'Bea', c: 'Coco', d: 'Dani' },
    votes: { a: 'b', c: 'b', d: 'b', b: 'd' },
  });
  const rows = voteRows(g);
  assert.deepEqual(rows.map((r) => r.pid), ['b', 'd']);
  assert.deepEqual(rows[0].voters, ['a', 'c', 'd']);
  assert.deepEqual(rows[1].voters, ['b']);
  // Votos a alguien que ya no está en la partida: fuera del recuento.
  assert.deepEqual(voteRows(mkGame({ playerIds: ['a', 'b'], votes: { a: 'zz' } })), []);
});

test('outcomeReason distingue los cuatro desenlaces', () => {
  const base = { playerIds: ['a', 'b', 'c'], names: { a: 'Ana', b: 'Bea', c: 'Coco' }, chameleonId: 'b' as const };
  const grupo = outcomeReason(mkGame({ ...base, phase: 'end', winner: 'group', caught: true, accusedId: 'b' }));
  assert.match(grupo, /Bea/);
  assert.match(grupo, /no supo/);
  const acierta = outcomeReason(mkGame({ ...base, phase: 'end', winner: 'chameleon', caught: true, accusedId: 'b', guessedRight: true }));
  assert.match(acierta, /acertó/);
  const empate = outcomeReason(mkGame({ ...base, phase: 'end', winner: 'chameleon', accusedId: null }));
  assert.match(empate, /Empate/);
  const inocente = outcomeReason(mkGame({ ...base, phase: 'end', winner: 'chameleon', accusedId: 'c' }));
  assert.match(inocente, /Coco/);
  assert.match(inocente, /inocente/);
});

test('helpers: playersOf respeta orden; isChameleon y secretWord', () => {
  const g = mkGame({ playerIds: ['a', 'b'], names: { a: 'Ana', b: 'Bea' }, chameleonId: 'b', secret: 3 });
  assert.deepEqual(playersOf(g).map((p) => p.name), ['Ana', 'Bea']);
  assert.equal(isChameleon(g, 'b'), true);
  assert.equal(isChameleon(g, 'a'), false);
  assert.equal(secretWord(g), g.grid[3]);
  assert.ok(MIN_PLAYERS === 3);
});
