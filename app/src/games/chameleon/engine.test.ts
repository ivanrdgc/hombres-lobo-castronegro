// Tests del motor puro de «El Camaleón»: reparto (tema no repetido, palabra,
// Camaleón, starter), recuento del voto (mayoría estricta, empate = escapa) y
// que las rejillas de tema tienen 16 palabras únicas.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { TOPICS } from './topics';
import { dealRound, tallyVotes, allVoted, playersOf, isChameleon, secretWord, GRID_SIZE, MIN_PLAYERS } from './engine';
import type { ChameleonState } from './types';

const mkGame = (over: Partial<ChameleonState> = {}): ChameleonState => ({
  chameleon: true, phase: 'vote', startedAt: 1, seed: 1, round: 1,
  playerIds: [], names: {}, topicId: 'playa', grid: TOPICS[0].words.slice(), secret: 0,
  chameleonId: '', seen: {}, starterIdx: 0, votes: {}, accusedId: null, caught: false,
  guess: null, guessedRight: false, winner: null, scores: {}, usedTopics: [], log: [], ...over,
});

test('cada tema tiene 16 palabras ÚNICAS', () => {
  for (const t of TOPICS) {
    assert.equal(t.words.length, GRID_SIZE, `${t.id} tiene 16`);
    assert.equal(new Set(t.words).size, GRID_SIZE, `${t.id} sin repetidas`);
  }
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

test('tallyVotes: el más votado gana; empate en cabeza → nadie (null)', () => {
  const pids = ['p0', 'p1', 'p2', 'p3'];
  // p1 con 2 votos, p0 con 1, p2 con 1 → acusado p1.
  const g = mkGame({ playerIds: pids, votes: { p0: 'p1', p1: 'p0', p2: 'p1', p3: 'p2' } });
  assert.equal(tallyVotes(g).accusedId, 'p1');
  // Empate p1/p2 a 2 → nadie.
  const g2 = mkGame({ playerIds: pids, votes: { p0: 'p1', p1: 'p2', p2: 'p1', p3: 'p2' } });
  assert.equal(tallyVotes(g2).accusedId, null);
});

test('allVoted detecta cuando faltan votos', () => {
  const pids = ['p0', 'p1', 'p2'];
  assert.equal(allVoted(mkGame({ playerIds: pids, votes: { p0: 'p1', p1: 'p2' } })), false);
  assert.equal(allVoted(mkGame({ playerIds: pids, votes: { p0: 'p1', p1: 'p2', p2: 'p0' } })), true);
});

test('helpers: playersOf respeta orden; isChameleon y secretWord', () => {
  const g = mkGame({ playerIds: ['a', 'b'], names: { a: 'Ana', b: 'Bea' }, chameleonId: 'b', secret: 3 });
  assert.deepEqual(playersOf(g).map((p) => p.name), ['Ana', 'Bea']);
  assert.equal(isChameleon(g, 'b'), true);
  assert.equal(isChameleon(g, 'a'), false);
  assert.equal(secretWord(g), g.grid[3]);
  assert.ok(MIN_PLAYERS === 3);
});
