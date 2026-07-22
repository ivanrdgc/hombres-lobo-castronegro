// Tests del motor puro de «Ávalon». Lo crítico: reparto por número de jugadores
// (bien/mal), tablas oficiales de tamaño de equipo y sabotajes, el conocimiento
// nocturno cruzado (Merlín/Percival/Mordred/Oberón) y el recuento del voto.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  ROLES, dealRoles, evilCountFor, teamSize, requiredFails, knowledgeOf, isEvil, MIN_PLAYERS, MAX_PLAYERS,
} from './roles';
import type { RoleId } from './roles';
import {
  tallyVote, resolveQuest, checkAfterQuest, tally, pendingActors, leaderId, assassinId, validTeam, playersOf,
} from './engine';
import type { AvalonState } from './types';

const mkPlayers = (n: number) => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, order: i }));

const mkGame = (over: Partial<AvalonState> = {}): AvalonState => ({
  avalon: true, phase: 'propose', startedAt: 1, seed: 1,
  playerIds: [], names: {}, roles: {}, enabledRoles: [], seen: {},
  leaderIdx: 0, quest: 1, results: [], voteTrack: 0, team: [], votes: {},
  lastVote: null, questCards: {}, lastQuest: null, assassinTarget: null,
  winner: null, winReason: null, log: [], ...over,
});

// ——— Reparto: bandos por número de jugadores (reglas oficiales) ———

test('evilCountFor sigue la tabla oficial (5-6→2, 7-9→3, 10→4)', () => {
  assert.equal(evilCountFor(5), 2);
  assert.equal(evilCountFor(6), 2);
  assert.equal(evilCountFor(7), 3);
  assert.equal(evilCountFor(9), 3);
  assert.equal(evilCountFor(10), 4);
});

test('dealRoles reparte el nº correcto de malvados, con Merlín y Asesino siempre', () => {
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    const { roles } = dealRoles(mkPlayers(n), ['percival', 'morgana', 'mordred', 'oberon'], 1234 + n);
    const vals = Object.values(roles);
    assert.equal(vals.length, n, `n=${n} reparte a todos`);
    assert.equal(vals.filter((r) => isEvil(r)).length, evilCountFor(n), `n=${n} malvados`);
    assert.ok(vals.includes('merlin'), `n=${n} tiene Merlín`);
    assert.ok(vals.includes('assassin'), `n=${n} tiene Asesino`);
  }
});

test('dealRoles descarta opcionales que no caben (5 jugadores = 2 malvados: Asesino + 1)', () => {
  // Con 2 malvados solo cabe Asesino + un especial → Mordred y Oberón sobran.
  const { roles, dropped } = dealRoles(mkPlayers(5), ['morgana', 'mordred', 'oberon'], 7);
  const evil = Object.values(roles).filter((r) => isEvil(r));
  assert.equal(evil.length, 2);
  assert.equal(dropped.length, 2, 'dos especiales del Mal no caben');
  assert.ok(dropped.every((r) => ['mordred', 'oberon', 'morgana'].includes(r)));
});

test('dealRoles es determinista por semilla', () => {
  const a = dealRoles(mkPlayers(7), ['percival', 'morgana'], 99);
  const b = dealRoles(mkPlayers(7), ['percival', 'morgana'], 99);
  assert.deepEqual(a.roles, b.roles);
});

// ——— Tablas de misiones ———

test('teamSize sigue la tabla oficial', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((q) => teamSize(5, q)), [2, 3, 2, 3, 3]);
  assert.deepEqual([1, 2, 3, 4, 5].map((q) => teamSize(7, q)), [2, 3, 3, 4, 4]);
  assert.deepEqual([1, 2, 3, 4, 5].map((q) => teamSize(10, q)), [3, 4, 4, 5, 5]);
});

test('requiredFails: la 4.ª misión pide 2 sabotajes con 7+ jugadores', () => {
  assert.equal(requiredFails(6, 4), 1);
  assert.equal(requiredFails(7, 4), 2);
  assert.equal(requiredFails(10, 4), 2);
  assert.equal(requiredFails(7, 1), 1);
  assert.equal(requiredFails(7, 5), 1);
});

// ——— Conocimiento nocturno cruzado ———

test('Merlín ve a los malvados salvo Mordred; Oberón SÍ le es visible', () => {
  const roles: Record<string, RoleId> = { p0: 'merlin', p1: 'assassin', p2: 'mordred', p3: 'oberon', p4: 'servant' };
  const k = knowledgeOf(roles, ['p0', 'p1', 'p2', 'p3', 'p4'], 'p0');
  assert.equal(k.knows.kind, 'merlin');
  if (k.knows.kind === 'merlin') {
    assert.ok(k.knows.pids.includes('p1'), 've al Asesino');
    assert.ok(k.knows.pids.includes('p3'), 've a Oberón');
    assert.ok(!k.knows.pids.includes('p2'), 'NO ve a Mordred');
  }
});

test('Los malvados se ven entre sí, pero NO ven a Oberón, y Oberón no ve a nadie', () => {
  const pids = ['p0', 'p1', 'p2', 'p3'];
  const roles: Record<string, RoleId> = { p0: 'assassin', p1: 'minion', p2: 'oberon', p3: 'merlin' };
  const asesino = knowledgeOf(roles, pids, 'p0');
  assert.equal(asesino.knows.kind, 'evil-allies');
  if (asesino.knows.kind === 'evil-allies') {
    assert.deepEqual(asesino.knows.pids.sort(), ['p1'], 've al esbirro pero NO a Oberón');
  }
  const oberon = knowledgeOf(roles, pids, 'p2');
  assert.equal(oberon.knows.kind, 'oberon', 'Oberón no conoce a nadie');
});

test('Percival ve a Merlín y Morgana como pareja ambigua; sin Morgana, ve a Merlín exacto', () => {
  const pids = ['p0', 'p1', 'p2', 'p3', 'p4'];
  const conMorgana: Record<string, RoleId> = { p0: 'percival', p1: 'merlin', p2: 'morgana', p3: 'assassin', p4: 'servant' };
  const k1 = knowledgeOf(conMorgana, pids, 'p0');
  assert.equal(k1.knows.kind, 'percival');
  if (k1.knows.kind === 'percival') {
    assert.deepEqual(k1.knows.pids.sort(), ['p1', 'p2']);
    assert.equal(k1.knows.ambiguous, true);
  }
  const sinMorgana: Record<string, RoleId> = { p0: 'percival', p1: 'merlin', p2: 'minion', p3: 'assassin', p4: 'servant' };
  const k2 = knowledgeOf(sinMorgana, pids, 'p0');
  if (k2.knows.kind === 'percival') {
    assert.deepEqual(k2.knows.pids, ['p1']);
    assert.equal(k2.knows.ambiguous, false);
  }
});

test('El Leal Servidor no conoce nada', () => {
  const roles: Record<string, RoleId> = { p0: 'servant', p1: 'merlin', p2: 'assassin' };
  assert.equal(knowledgeOf(roles, ['p0', 'p1', 'p2'], 'p0').knows.kind, 'none');
});

// ——— Voto de equipo ———

test('tallyVote: aprueba solo con MAYORÍA ESTRICTA (empate = rechazo)', () => {
  const g = mkGame({ playerIds: ['p0', 'p1', 'p2', 'p3'], votes: { p0: true, p1: true, p2: false, p3: false } });
  assert.equal(tallyVote(g).approved, false, '2-2 no aprueba');
  const g2 = mkGame({ playerIds: ['p0', 'p1', 'p2', 'p3', 'p4'], votes: { p0: true, p1: true, p2: true, p3: false, p4: false } });
  assert.equal(tallyVote(g2).approved, true, '3-2 aprueba');
  assert.deepEqual(tallyVote(g2).approvals.sort(), ['p0', 'p1', 'p2']);
});

// ——— Resolución de misión ———

test('resolveQuest: un solo sabotaje hace fracasar (salvo 4.ª con 7+)', () => {
  const g = mkGame({ playerIds: mkPlayers(7).map((p) => p.id), quest: 1, team: ['p0', 'p1'], questCards: { p0: true, p1: false } });
  const r = g;
  assert.equal(resolveQuest(r).success, false, '1 fallo en misión normal → fracaso');

  const q4 = mkGame({ playerIds: mkPlayers(7).map((p) => p.id), quest: 4, team: ['p0', 'p1', 'p2', 'p3'], questCards: { p0: true, p1: true, p2: true, p3: false } });
  assert.equal(resolveQuest(q4).required, 2);
  assert.equal(resolveQuest(q4).success, true, '1 fallo en la 4.ª con 7 jugadores NO basta');

  const q4b = mkGame({ playerIds: mkPlayers(7).map((p) => p.id), quest: 4, team: ['p0', 'p1', 'p2', 'p3'], questCards: { p0: true, p1: false, p2: false, p3: true } });
  assert.equal(resolveQuest(q4b).success, false, '2 fallos en la 4.ª con 7 → fracaso');
});

// ——— Victoria ———

test('checkAfterQuest: 3 fracasos → gana el Mal; 3 éxitos → procede el Asesino', () => {
  assert.deepEqual(
    { ...checkAfterQuest(mkGame({ results: ['fail', 'fail', 'fail'] })) },
    { winner: 'evil', reason: 'El Mal ha saboteado tres misiones.', goodReachedThree: false },
  );
  const good3 = checkAfterQuest(mkGame({ results: ['success', 'success', 'success'] }));
  assert.equal(good3.winner, null);
  assert.equal(good3.goodReachedThree, true);
  const mid = checkAfterQuest(mkGame({ results: ['success', 'fail'] }));
  assert.equal(mid.winner, null);
  assert.equal(mid.goodReachedThree, false);
});

// ——— Actores por fase ———

test('pendingActors: reveal→quien falta; propose→líder; vote→quien no votó; assassin→el Asesino', () => {
  const pids = ['p0', 'p1', 'p2', 'p3', 'p4'];
  const roles: Record<string, RoleId> = { p0: 'merlin', p1: 'assassin', p2: 'servant', p3: 'minion', p4: 'percival' };
  assert.deepEqual(pendingActors(mkGame({ phase: 'reveal', playerIds: pids, seen: { p0: true } })), ['p1', 'p2', 'p3', 'p4']);
  assert.deepEqual(pendingActors(mkGame({ phase: 'propose', playerIds: pids, leaderIdx: 2 })), ['p2']);
  assert.deepEqual(pendingActors(mkGame({ phase: 'vote', playerIds: pids, votes: { p0: true, p1: false } })), ['p2', 'p3', 'p4']);
  assert.deepEqual(pendingActors(mkGame({ phase: 'assassin', playerIds: pids, roles })), ['p1']);
  assert.deepEqual(pendingActors(mkGame({ phase: 'quest', playerIds: pids, team: ['p0', 'p2'], questCards: { p0: true } })), ['p2']);
});

test('leaderId rota por índice; assassinId localiza al Asesino', () => {
  const g = mkGame({ playerIds: ['p0', 'p1', 'p2'], leaderIdx: 1, roles: { p0: 'servant', p1: 'assassin', p2: 'merlin' } });
  assert.equal(leaderId(g), 'p1');
  assert.equal(assassinId(g), 'p1');
});

test('validTeam exige tamaño exacto de la misión y jugadores reales', () => {
  const g = mkGame({ playerIds: mkPlayers(5).map((p) => p.id), quest: 1 }); // misión 1 con 5 = 2
  assert.equal(validTeam(g, ['p0', 'p1']), true);
  assert.equal(validTeam(g, ['p0']), false);
  assert.equal(validTeam(g, ['p0', 'p0']), false);
  assert.equal(validTeam(g, ['p0', 'pX']), false);
});

test('tally cuenta éxitos y fracasos; playersOf respeta el orden de asiento', () => {
  assert.deepEqual(tally(mkGame({ results: ['success', 'fail', 'success'] })), { success: 2, fail: 1 });
  const g = mkGame({ playerIds: ['a', 'b'], names: { a: 'Ana', b: 'Bea' } });
  assert.deepEqual(playersOf(g).map((p) => p.name), ['Ana', 'Bea']);
});

test('ROLES: 8 roles, con optional marcado solo en los cuatro esperados', () => {
  const optional = (Object.keys(ROLES) as RoleId[]).filter((r) => ROLES[r].optional);
  assert.deepEqual(optional.sort(), ['mordred', 'morgana', 'oberon', 'percival']);
});
