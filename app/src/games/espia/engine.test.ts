// Tests del motor puro de El Espía: reparto, votaciones y puntuación oficial.
import { describe, expect, test } from 'vitest';
import { LOCATIONS } from './locations';
import {
  applyDelta, dealRound, pickLocation, resolveConviction, resolveGuess, resolveSpyLeft,
  resolveTimeout, resolveVoid, tallyVote, timeupOrder, voters,
} from './engine';
import type { EspiaState, EspiaVote } from './types';

const PIDS = ['p-ana', 'p-bea', 'p-carlos', 'p-david', 'p-elsa'];

function mkState(over: Partial<EspiaState> = {}): EspiaState {
  return {
    espia: true, phase: 'play', startedAt: 1, round: 1,
    playerIds: PIDS.slice(),
    names: { 'p-ana': 'Ana', 'p-bea': 'Bea', 'p-carlos': 'Carlos', 'p-david': 'David', 'p-elsa': 'Elsa' },
    dealerId: 'p-ana', spyId: 'p-carlos', locationId: 'casino',
    roles: { 'p-ana': 'Crupier', 'p-bea': 'Camarera de cócteles', 'p-david': 'Guardia de seguridad', 'p-elsa': 'Millonaria de incógnito' },
    seen: {}, durationMs: 480000, deadline: null, voteSeq: 0, accusedUsed: {},
    vote: null, timeupTurn: null, usedLocations: ['casino'], scores: {}, history: [],
    outcome: null, log: [],
    ...over,
  };
}

describe('localizaciones', () => {
  test('30 localizaciones íntegras: ids únicos, 7 papeles únicos por lugar', () => {
    expect(LOCATIONS.length).toBe(30);
    expect(new Set(LOCATIONS.map((l) => l.id)).size).toBe(30);
    expect(new Set(LOCATIONS.map((l) => l.name)).size).toBe(30);
    for (const l of LOCATIONS) {
      expect(l.roles.length, l.id).toBe(7);
      expect(new Set(l.roles).size, l.id).toBe(7);
      expect(l.emoji.length, l.id).toBeGreaterThan(0);
    }
  });
});

describe('dealRound', () => {
  test('un espía, papeles únicos de la localización para el resto', () => {
    const d = dealRound(PIDS, 1, [], 42);
    expect(PIDS).toContain(d.spyId);
    expect(d.roles[d.spyId]).toBeUndefined();
    const agents = PIDS.filter((p) => p !== d.spyId);
    const loc = LOCATIONS.find((l) => l.id === d.locationId)!;
    for (const a of agents) expect(loc.roles).toContain(d.roles[a]);
    expect(new Set(agents.map((a) => d.roles[a])).size).toBe(agents.length);
  });

  test('determinista por semilla; semillas distintas cambian el reparto', () => {
    expect(dealRound(PIDS, 1, [], 7)).toEqual(dealRound(PIDS, 1, [], 7));
    const draws = new Set(Array.from({ length: 20 }, (_, i) => dealRound(PIDS, 1, [], i).spyId));
    expect(draws.size).toBeGreaterThan(1); // el espía no es siempre el mismo
  });

  test('el repartidor rota por ronda en el orden de mesa', () => {
    expect(dealRound(PIDS, 1, [], 1).dealerId).toBe('p-ana');
    expect(dealRound(PIDS, 2, [], 1).dealerId).toBe('p-bea');
    expect(dealRound(PIDS, 6, [], 1).dealerId).toBe('p-ana'); // vuelta completa
  });

  test('8 jugadores caben (7 papeles + espía)', () => {
    const eight = PIDS.concat(['p-f', 'p-g', 'p-h']);
    const d = dealRound(eight, 1, [], 3);
    expect(Object.keys(d.roles).length).toBe(7);
  });

  test('la localización no se repite hasta agotar el mazo (y luego rebaraja)', () => {
    const rnd = () => 0.5;
    const used = LOCATIONS.slice(0, 29).map((l) => l.id);
    expect(pickLocation(used, rnd)).toBe(LOCATIONS[29].id); // solo queda una
    const all = LOCATIONS.map((l) => l.id);
    const next = pickLocation(all, rnd);
    expect(all).toContain(next);
    expect(next).not.toBe(all[all.length - 1]); // rebarajado sin repetir la última
  });
});

describe('votaciones', () => {
  const vote: EspiaVote = { accuserId: 'p-ana', accusedId: 'p-carlos', votes: {}, frozenMs: 1000, fromTimeup: false };

  test('votan todos menos acusador y acusado', () => {
    expect(voters(PIDS, vote).sort()).toEqual(['p-bea', 'p-david', 'p-elsa']);
  });

  test('tally: pendientes, un no rompe la unanimidad, todos sí condena', () => {
    let t = tallyVote(PIDS, vote);
    expect(t.pending.length).toBe(3);
    expect(t.anyNo).toBe(false);
    expect(t.allYes).toBe(false);
    t = tallyVote(PIDS, { ...vote, votes: { 'p-bea': true, 'p-david': false } });
    expect(t.anyNo).toBe(true);
    t = tallyVote(PIDS, { ...vote, votes: { 'p-bea': true, 'p-david': true, 'p-elsa': true } });
    expect(t.allYes).toBe(true);
    // Con 3 jugadores queda un único votante: su sí basta.
    const three = ['p-ana', 'p-bea', 'p-carlos'];
    t = tallyVote(three, { ...vote, votes: { 'p-bea': true } });
    expect(t.allYes).toBe(true);
  });
});

describe('puntuación oficial', () => {
  test('condena al espía: +1 agentes, +1 extra al iniciador (total 2), espía 0', () => {
    const o = resolveConviction(mkState(), 'p-carlos', 'p-bea');
    expect(o.type).toBe('spy_caught');
    expect(o.delta).toEqual({ 'p-ana': 1, 'p-bea': 2, 'p-david': 1, 'p-elsa': 1 });
  });

  test('condena a un inocente: la ronda TERMINA y el espía gana +4', () => {
    const o = resolveConviction(mkState(), 'p-bea', 'p-ana');
    expect(o.type).toBe('wrong_accusation');
    expect(o.delta).toEqual({ 'p-carlos': 4 });
  });

  test('el espía adivina el lugar: +4; falla: +1 a cada agente', () => {
    expect(resolveGuess(mkState(), 'casino').delta).toEqual({ 'p-carlos': 4 });
    const o = resolveGuess(mkState(), 'playa');
    expect(o.type).toBe('spy_wrong');
    expect(o.delta).toEqual({ 'p-ana': 1, 'p-bea': 1, 'p-david': 1, 'p-elsa': 1 });
  });

  test('tiempo agotado sin condena: espía +2; abandono del espía: +1 agentes', () => {
    expect(resolveTimeout(mkState()).delta).toEqual({ 'p-carlos': 2 });
    expect(resolveSpyLeft(mkState()).delta).toEqual({ 'p-ana': 1, 'p-bea': 1, 'p-david': 1, 'p-elsa': 1 });
  });

  test('sin quórum la ronda se ANULA: nadie puntúa (no es victoria del espía)', () => {
    const o = resolveVoid(mkState({ playerIds: ['p-ana', 'p-carlos'] }));
    expect(o.type).toBe('round_void');
    expect(o.delta).toEqual({});
    expect(o.txt).toContain('ANULADA');
  });

  test('applyDelta acumula sobre el marcador', () => {
    expect(applyDelta({ 'p-ana': 3 }, { 'p-ana': 1, 'p-bea': 2 })).toEqual({ 'p-ana': 4, 'p-bea': 2 });
  });
});

describe('turnos tras el tiempo', () => {
  test('desde el repartidor, en orden de mesa y dando la vuelta', () => {
    expect(timeupOrder({ playerIds: PIDS, dealerId: 'p-carlos' }))
      .toEqual(['p-carlos', 'p-david', 'p-elsa', 'p-ana', 'p-bea']);
  });
});
