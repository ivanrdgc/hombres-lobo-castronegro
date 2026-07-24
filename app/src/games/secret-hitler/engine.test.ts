// Tests del motor puro de «Secret Hitler». Lo delicado: recuentos por
// número de jugadores, conocimiento nocturno (Hitler ciego con 7+), límites de
// mandato del Canciller, tablero de poderes, rebaraja del mazo y las victorias
// (incluida la de elegir a Hitler Canciller y la de ejecutarlo).
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  dealRoles, fascistCountFor, hitlerKnowsFascists, knowledgeOf, powerFor, newDeck, factionOf,
  LIBERAL_TRACK, FASCIST_TRACK, VETO_AT,
} from './roles';
import type { RoleId } from './roles';
import {
  presidentId, nextAliveIdx, advancePresidency, eligibleChancellors, tallyElection,
  refillIfNeeded, drawTop, enactPolicy, checkPolicyWin, hitlerChancellorWin, pendingActors, aliveIds,
  applyChaos, applyVetoAccept, applyVetoRefuse, canVeto,
} from './engine';
import type { SHState } from './types';

const mkPlayers = (n: number) => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, order: i }));

const mkGame = (over: Partial<SHState> = {}): SHState => ({
  secretHitler: true, phase: 'nominate', startedAt: 1, seed: 1,
  playerIds: [], names: {}, roles: {}, alive: {}, seen: {},
  presidentIdx: 0, specialPresident: null, nominatedChancellor: null,
  lastPresident: null, lastChancellor: null, votes: {}, lastElection: null, elections: 0,
  electionTracker: 0, liberalPolicies: 0, fascistPolicies: 0,
  draw: [], discard: [], presidentDraw: null, chancellorDraw: null,
  vetoUnlocked: false, vetoRequested: false, lastEnacted: null, power: null,
  peek: null, investigateResult: null, investigated: [], chaosCount: 0, lastExecuted: null, reshuffles: 0,
  winner: null, winReason: null, log: [], ...over,
});
const allAlive = (pids: string[]) => Object.fromEntries(pids.map((p) => [p, true]));

// ——— Reparto ———

test('fascistCountFor / hitlerKnowsFascists siguen las reglas oficiales', () => {
  assert.deepEqual([5, 6, 7, 8, 9, 10].map(fascistCountFor), [1, 1, 2, 2, 3, 3]);
  assert.equal(hitlerKnowsFascists(6), true);
  assert.equal(hitlerKnowsFascists(7), false);
});

test('dealRoles: 1 Hitler, fascistas por tabla y el resto liberales', () => {
  for (let n = 5; n <= 10; n++) {
    const { roles } = dealRoles(mkPlayers(n), 100 + n);
    const vals = Object.values(roles);
    assert.equal(vals.filter((r) => r === 'hitler').length, 1, `n=${n} 1 Hitler`);
    assert.equal(vals.filter((r) => r === 'fascist').length, fascistCountFor(n), `n=${n} fascistas`);
    assert.equal(vals.filter((r) => r === 'liberal').length, n - fascistCountFor(n) - 1, `n=${n} liberales`);
  }
});

test('conocimiento: fascistas se ven y ven a Hitler; Hitler ciego con 7+', () => {
  const pids7 = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const roles7: Record<string, RoleId> = { p0: 'hitler', p1: 'fascist', p2: 'fascist', p3: 'liberal', p4: 'liberal', p5: 'liberal', p6: 'liberal' };
  const fas = knowledgeOf(roles7, pids7, 'p1');
  assert.equal(fas.knows.kind, 'fascist-team');
  if (fas.knows.kind === 'fascist-team') {
    assert.deepEqual(fas.knows.fascists.sort(), ['p2'], 've a su compañero fascista');
    assert.equal(fas.knows.hitler, 'p0', 've a Hitler');
  }
  assert.equal(knowledgeOf(roles7, pids7, 'p0').knows.kind, 'hitler-blind', 'Hitler no ve nada con 7');
  assert.equal(knowledgeOf(roles7, pids7, 'p3').knows.kind, 'liberal');

  const pids5 = ['p0', 'p1', 'p2', 'p3', 'p4'];
  const roles5: Record<string, RoleId> = { p0: 'hitler', p1: 'fascist', p2: 'liberal', p3: 'liberal', p4: 'liberal' };
  const h = knowledgeOf(roles5, pids5, 'p0');
  assert.equal(h.knows.kind, 'hitler-knows');
  if (h.knows.kind === 'hitler-knows') assert.deepEqual(h.knows.fascists, ['p1'], 'con 5 Hitler ve a su fascista');
});

// ——— Presidencia y elegibilidad ———

test('nextAliveIdx salta a los muertos; presidentId respeta la elección especial', () => {
  const g = mkGame({ playerIds: ['p0', 'p1', 'p2', 'p3'], alive: { p0: true, p1: false, p2: true, p3: true }, presidentIdx: 0 });
  assert.equal(nextAliveIdx(g, 0), 2, 'salta a p1 (muerto) y da p2');
  assert.equal(presidentId(g), 'p0');
  g.specialPresident = 'p3';
  assert.equal(presidentId(g), 'p3', 'la elección especial manda');
});

test('advancePresidency: consume la especial (sin avanzar rotación) o avanza al siguiente vivo', () => {
  const g = mkGame({ playerIds: ['p0', 'p1', 'p2'], alive: allAlive(['p0', 'p1', 'p2']), presidentIdx: 0, specialPresident: 'p2' });
  advancePresidency(g);
  assert.equal(g.specialPresident, null);
  assert.equal(g.presidentIdx, 1, 'tras la especial, la rotación sigue desde el presidente regular');
  advancePresidency(g);
  assert.equal(g.presidentIdx, 2);
});

test('eligibleChancellors: excluye Presidente y último Canciller; con >5 vivos también último Presidente', () => {
  const pids = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'];
  const g = mkGame({ playerIds: pids, alive: allAlive(pids), presidentIdx: 0, lastPresident: 'p5', lastChancellor: 'p4' });
  const el = eligibleChancellors(g);
  assert.ok(!el.includes('p0'), 'no el Presidente');
  assert.ok(!el.includes('p4'), 'no el último Canciller');
  assert.ok(!el.includes('p5'), 'con 6 vivos, no el último Presidente');
  assert.deepEqual(el.sort(), ['p1', 'p2', 'p3']);
  // Con solo 5 vivos, el último Presidente SÍ es elegible.
  const g5 = mkGame({ playerIds: pids, alive: { p0: true, p1: true, p2: true, p3: true, p4: true, p5: false }, presidentIdx: 0, lastPresident: 'p3', lastChancellor: 'p4' });
  assert.ok(eligibleChancellors(g5).includes('p3'), 'con 5 vivos el último Presidente vuelve a ser elegible');
});

// ——— Elección ———

test('tallyElection: mayoría estricta de los vivos (empate = rechazo)', () => {
  const g = mkGame({ playerIds: ['p0', 'p1', 'p2', 'p3'], alive: allAlive(['p0', 'p1', 'p2', 'p3']), votes: { p0: true, p1: true, p2: false, p3: false } });
  assert.equal(tallyElection(g).passed, false, '2-2 no pasa');
  const g2 = mkGame({ playerIds: ['p0', 'p1', 'p2'], alive: { p0: true, p1: true, p2: false }, votes: { p0: true, p1: false } });
  assert.equal(tallyElection(g2).passed, false, '1-1 entre vivos no pasa');
  const g3 = mkGame({ playerIds: ['p0', 'p1', 'p2'], alive: allAlive(['p0', 'p1', 'p2']), votes: { p0: true, p1: true, p2: false } });
  assert.equal(tallyElection(g3).passed, true, '2-1 pasa');
});

// ——— Mazo ———

test('newDeck: 6 liberales + 11 fascistas', () => {
  const d = newDeck(42);
  assert.equal(d.length, 17);
  assert.equal(d.filter((p) => p === 'liberal').length, 6);
  assert.equal(d.filter((p) => p === 'fascist').length, 11);
});

test('refillIfNeeded rebaraja los descartes cuando quedan <3 (sin perder cartas)', () => {
  const g = mkGame({ draw: ['liberal'], discard: ['fascist', 'fascist', 'liberal', 'fascist'], reshuffles: 0 });
  refillIfNeeded(g);
  assert.equal(g.draw.length, 5, 'mazo rebarajado con todo');
  assert.equal(g.discard.length, 0);
  assert.equal(g.reshuffles, 1);
  const counts = g.draw.reduce((a, p) => ((a[p] = (a[p] || 0) + 1), a), {} as Record<string, number>);
  assert.deepEqual(counts, { liberal: 2, fascist: 3 }, 'se conservan todas las cartas');
});

test('drawTop rebaraja antes si el mazo es corto', () => {
  const g = mkGame({ draw: ['liberal', 'fascist'], discard: ['fascist', 'liberal', 'fascist'] });
  const top = drawTop(g, 3);
  assert.equal(top.length, 3, 'tras rebarajar hay al menos 3');
});

// ——— Promulgación, poderes y victoria ———

test('powerFor: tablero oficial por tramo de jugadores', () => {
  assert.equal(powerFor(5, 3), 'peek');
  assert.equal(powerFor(6, 4), 'execution');
  assert.equal(powerFor(7, 2), 'investigate');
  assert.equal(powerFor(8, 3), 'special');
  assert.equal(powerFor(9, 1), 'investigate');
  assert.equal(powerFor(10, 3), 'special');
  assert.equal(powerFor(5, 1), null, 'con 5-6 los primeros decretos no dan poder');
});

test('enactPolicy: sube el marcador, desbloquea el veto al 5.º fascista y devuelve el poder', () => {
  const g = mkGame({ playerIds: mkPlayers(9).map((p) => p.id) });
  assert.equal(enactPolicy(g, 'liberal'), null);
  assert.equal(g.liberalPolicies, 1);
  assert.equal(enactPolicy(g, 'fascist'), 'investigate'); // 1.er fascista con 9 jugadores
  assert.equal(g.fascistPolicies, 1);
  g.fascistPolicies = 4;
  assert.equal(enactPolicy(g, 'fascist'), 'execution'); // 5.º
  assert.equal(g.vetoUnlocked, true, 'veto desbloqueado con 5 fascistas');
});

test('checkPolicyWin: 5 liberales o 6 fascistas', () => {
  assert.equal(checkPolicyWin(mkGame({ liberalPolicies: LIBERAL_TRACK })).winner, 'liberal');
  assert.equal(checkPolicyWin(mkGame({ fascistPolicies: FASCIST_TRACK })).winner, 'fascist');
  assert.equal(checkPolicyWin(mkGame({ liberalPolicies: 4, fascistPolicies: 5 })).winner, null);
  assert.equal(VETO_AT, 5);
});

test('hitlerChancellorWin: elegir a Hitler Canciller con 3+ fascistas hace ganar al Mal', () => {
  const roles: Record<string, RoleId> = { p0: 'hitler', p1: 'liberal', p2: 'fascist' };
  assert.equal(hitlerChancellorWin(mkGame({ roles, fascistPolicies: 3 }), 'p0'), true);
  assert.equal(hitlerChancellorWin(mkGame({ roles, fascistPolicies: 2 }), 'p0'), false, 'con <3 fascistas no');
  assert.equal(hitlerChancellorWin(mkGame({ roles, fascistPolicies: 5 }), 'p1'), false, 'solo si es Hitler');
});

test('factionOf: Hitler cuenta como fascista', () => {
  assert.equal(factionOf('hitler'), 'fascist');
  assert.equal(factionOf('fascist'), 'fascist');
  assert.equal(factionOf('liberal'), 'liberal');
});

// ——— Caos (3 gobiernos caídos) ———

const chaosGame = (over: Partial<SHState> = {}): SHState => {
  const pids = ['p0', 'p1', 'p2', 'p3', 'p4'];
  return mkGame({
    playerIds: pids, alive: allAlive(pids), presidentIdx: 0,
    lastPresident: 'p4', lastChancellor: 'p3', nominatedChancellor: 'p3',
    electionTracker: 3, draw: ['fascist', 'liberal', 'liberal', 'fascist'], ...over,
  });
};

test('applyChaos: promulga a ciegas el decreto de arriba, sin poder y borrando los límites de mandato', () => {
  const g = chaosGame({ fascistPolicies: 2 }); // con 5 jugadores, el 3.º fascista daría «mirar»
  const out = applyChaos(g);
  assert.equal(out.policy, 'fascist', 'sale la carta de arriba del mazo');
  assert.equal(g.fascistPolicies, 3, 'el decreto sube al marcador');
  assert.equal(g.power, null, 'el caos NO dispara el poder presidencial');
  assert.equal(g.electionTracker, 0, 'la cuenta de gobiernos caídos se reinicia');
  assert.equal(g.lastPresident, null, 'se borran los límites de mandato');
  assert.equal(g.lastChancellor, null);
  assert.equal(g.nominatedChancellor, null);
  assert.equal(g.chaosCount, 1, 'se cuenta el caos (la voz lo anuncia una vez)');
  assert.equal(g.phase, 'nominate');
  assert.equal(g.presidentIdx, 1, 'la presidencia pasa al siguiente vivo');
  assert.equal(g.draw.length, 3, 'la carta sale del mazo');
  // Tras el caos cualquiera vale de Canciller salvo el Presidente de turno.
  assert.deepEqual(eligibleChancellors(g).sort(), ['p0', 'p2', 'p3', 'p4']);
});

test('applyChaos: si el decreto a ciegas cierra el marcador, la partida termina', () => {
  const g = chaosGame({ fascistPolicies: 5, draw: ['fascist', 'liberal', 'liberal'] });
  const out = applyChaos(g);
  assert.equal(out.win.winner, 'fascist');
  assert.equal(g.winner, 'fascist');
  assert.equal(g.phase, 'end');
  assert.ok(g.winReason, 'el desenlace explica el porqué');
});

test('applyChaos rebaraja si el mazo se ha quedado corto (nunca se queda sin cartas)', () => {
  const g = chaosGame({ draw: [], discard: ['liberal', 'liberal', 'fascist'] });
  const out = applyChaos(g);
  assert.ok(['liberal', 'fascist'].includes(out.policy));
  assert.equal(g.reshuffles, 1);
  assert.equal(g.liberalPolicies + g.fascistPolicies, 1);
});

// ——— Veto (con 5 decretos fascistas) ———

const vetoGame = (over: Partial<SHState> = {}): SHState => {
  const pids = ['p0', 'p1', 'p2', 'p3', 'p4'];
  return mkGame({
    playerIds: pids, alive: allAlive(pids), presidentIdx: 0, phase: 'vetoDecision',
    nominatedChancellor: 'p1', lastPresident: 'p0', lastChancellor: 'p1',
    chancellorDraw: ['fascist', 'fascist'], discard: [], draw: ['liberal', 'fascist', 'liberal'],
    fascistPolicies: 5, vetoUnlocked: true, vetoRequested: true, electionTracker: 0, ...over,
  });
};

test('canVeto: solo con el veto desbloqueado y si el Presidente no lo rechazó ya', () => {
  assert.equal(canVeto(vetoGame()), true);
  assert.equal(canVeto(vetoGame({ vetoUnlocked: false })), false, 'sin 5 decretos fascistas no hay veto');
  assert.equal(canVeto(vetoGame({ vetoRefused: true })), false, 'rechazado una vez: obligado a promulgar');
});

test('applyVetoAccept: la agenda entera se descarta, no se promulga nada y cuenta como gobierno caído', () => {
  const g = vetoGame();
  const out = applyVetoAccept(g);
  assert.equal(out.chaos, null);
  assert.deepEqual(g.discard, ['fascist', 'fascist'], 'las dos cartas van al descarte');
  assert.equal(g.chancellorDraw, null);
  assert.equal(g.fascistPolicies, 5, 'no se promulga nada');
  assert.equal(g.electionTracker, 1, 'suma hacia el caos');
  assert.equal(g.vetoRequested, false);
  assert.equal(g.phase, 'nominate');
  assert.equal(g.nominatedChancellor, null);
  assert.equal(g.presidentIdx, 1, 'la presidencia avanza');
});

test('applyVetoAccept con 2 gobiernos ya caídos desemboca en CAOS', () => {
  const g = vetoGame({ electionTracker: 2, draw: ['liberal', 'fascist', 'fascist'] });
  const out = applyVetoAccept(g);
  assert.ok(out.chaos, 'el tercer gobierno caído dispara el caos');
  assert.equal(out.chaos!.policy, 'liberal');
  assert.equal(g.liberalPolicies, 1, 'el decreto a ciegas sí se promulga');
  assert.equal(g.electionTracker, 0);
  assert.equal(g.lastChancellor, null, 'el caos borra los límites de mandato');
  assert.equal(g.chaosCount, 1);
  assert.equal(g.phase, 'nominate');
});

test('applyVetoRefuse: el Canciller vuelve a su agenda OBLIGADO a promulgar y sin poder re-vetar', () => {
  const g = vetoGame();
  applyVetoRefuse(g);
  assert.equal(g.phase, 'legislativeChancellor');
  assert.equal(g.vetoRequested, false);
  assert.equal(g.vetoRefused, true);
  assert.equal(canVeto(g), false);
  assert.deepEqual(g.chancellorDraw, ['fascist', 'fascist'], 'sigue con las mismas dos cartas');
  assert.equal(g.electionTracker, 0, 'un veto rechazado NO cuenta como gobierno caído');
});

// ——— Actores por fase ———

test('pendingActors por fase', () => {
  const pids = ['p0', 'p1', 'p2', 'p3', 'p4'];
  const base = { playerIds: pids, alive: allAlive(pids), presidentIdx: 1 };
  assert.deepEqual(pendingActors(mkGame({ ...base, phase: 'reveal', seen: { p0: true } })), ['p1', 'p2', 'p3', 'p4']);
  assert.deepEqual(pendingActors(mkGame({ ...base, phase: 'nominate' })), ['p1']);
  assert.deepEqual(pendingActors(mkGame({ ...base, phase: 'election', votes: { p1: true } })), ['p0', 'p2', 'p3', 'p4']);
  assert.deepEqual(pendingActors(mkGame({ ...base, phase: 'legislativePresident' })), ['p1']);
  assert.deepEqual(pendingActors(mkGame({ ...base, phase: 'legislativeChancellor', nominatedChancellor: 'p3' })), ['p3']);
  assert.deepEqual(pendingActors(mkGame({ ...base, phase: 'power', power: { type: 'execution', by: 'p1' } })), ['p1']);
});

test('aliveIds refleja las muertes (ejecuciones)', () => {
  const g = mkGame({ playerIds: ['p0', 'p1', 'p2'], alive: { p0: true, p1: false, p2: true } });
  assert.deepEqual(aliveIds(g), ['p0', 'p2']);
});
