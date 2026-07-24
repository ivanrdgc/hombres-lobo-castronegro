import { describe, it, expect } from 'vitest';
import {
  dealGame, bandOf, leaderId, isLeader, investigate, arm, aim, shoot, isAlive, aliveIds,
  nextAlive, skipTurn, aimersOf, bandCounts, bandCountsLine, turnsUntil, MIN_PLAYERS,
} from './engine';
import type { GoodCopState } from './types';
import type { Card } from './cards';

const IDS = ['p-a', 'p-b', 'p-c', 'p-d'];
const c = (kind: 'honest' | 'crook', role: Card['role'] = null): Card => ({ kind, role, up: false });

function base(over: Partial<GoodCopState> = {}): GoodCopState {
  return {
    goodcop: true, phase: 'turn', startedAt: 0, seed: 1,
    playerIds: IDS.slice(), names: Object.fromEntries(IDS.map((id) => [id, id.toUpperCase()])),
    cards: {
      'p-a': [c('honest', 'agent'), c('honest'), c('crook')], // honesto, LÍDER
      'p-b': [c('honest'), c('honest'), c('crook')], // honesto
      'p-c': [c('crook', 'kingpin'), c('crook'), c('honest')], // corrupto, LÍDER
      'p-d': [c('crook'), c('crook'), c('honest')], // corrupto
    },
    alive: Object.fromEntries(IDS.map((id) => [id, true])),
    armed: Object.fromEntries(IDS.map((id) => [id, false])),
    aimAt: Object.fromEntries(IDS.map((id) => [id, null])),
    turn: 'p-a', peeks: {}, winner: null, winReason: null, scores: {}, log: [],
    ...over,
  };
}

describe('reparto', () => {
  it('reparte bandos casi a la par, 3 cartas cada uno, con un Agente y un Jefe', () => {
    const d = dealGame(IDS, 42);
    for (const pid of IDS) expect(d.cards[pid]).toHaveLength(3);
    const agents = IDS.filter((p) => d.cards[p].some((x) => x.role === 'agent'));
    const kings = IDS.filter((p) => d.cards[p].some((x) => x.role === 'kingpin'));
    expect(agents).toHaveLength(1);
    expect(kings).toHaveLength(1);
    // El Agente es honesto por mayoría; el Jefe, corrupto.
    expect(bandOf(d.cards[agents[0]])).toBe('honest');
    expect(bandOf(d.cards[kings[0]])).toBe('crook');
  });
  it('bandOf usa la mayoría de las 3 cartas', () => {
    expect(bandOf([c('honest'), c('honest'), c('crook')])).toBe('honest');
    expect(bandOf([c('crook'), c('crook'), c('honest')])).toBe('crook');
  });
  it('el reparto de bandos es público y calculable', () => {
    expect(bandCounts(4)).toEqual({ honest: 2, crook: 2 });
    expect(bandCounts(5)).toEqual({ honest: 3, crook: 2 });
    expect(bandCounts(7)).toEqual({ honest: 4, crook: 3 });
    expect(bandCountsLine(5)).toBe('Sois 5: 3 honestos 👮 y 2 corruptos 🦹');
    // Y coincide con lo que reparte de verdad.
    const d = dealGame(IDS, 7);
    const honests = IDS.filter((p) => bandOf(d.cards[p]) === 'honest');
    expect(honests).toHaveLength(bandCounts(IDS.length).honest);
  });
});

describe('acciones del turno', () => {
  it('investigar mira una carta en secreto y pasa el turno', () => {
    const g = base();
    expect(investigate(g, 'p-a', 'p-c', 0)).toBe(true);
    expect(g.peeks['p-a'][0]).toMatchObject({ by: 'p-a', target: 'p-c', kind: 'crook', role: 'kingpin', ack: false });
    expect(g.turn).toBe('p-b');
    // No revela públicamente.
    expect(g.cards['p-c'][0].up).toBe(false);
    // El diario dice QUÉ carta se miró (en la mesa se señala con el dedo).
    expect(g.log[0].txt).toContain('carta 1');
  });
  it('el historial de investigaciones es por jugador y no se pisa', () => {
    const g = base();
    investigate(g, 'p-a', 'p-c', 0);
    investigate(g, 'p-b', 'p-d', 1); // otro investiga: el de p-a debe seguir ahí
    expect(g.peeks['p-a']).toHaveLength(1);
    expect(g.peeks['p-b']).toHaveLength(1);
    g.turn = 'p-a';
    investigate(g, 'p-a', 'p-d', 0);
    expect(g.peeks['p-a']).toHaveLength(2);
  });
  it('cada acción anuncia de quién es el turno siguiente', () => {
    const g = base();
    arm(g, 'p-a');
    expect(g.log.at(-1)!.txt).toBe('🎬 Turno de P-B.');
    // La línea lleva el estado PÚBLICO de quien entra a jugar.
    g.armed['p-c'] = true; g.aimAt['p-c'] = 'p-d';
    investigate(g, 'p-b', 'p-a', 0);
    expect(g.log.at(-1)!.txt).toBe('🎬 Turno de P-C. Va armado y apunta a P-D.');
  });
  it('no puedes gastar el turno apuntando a quien ya apuntas', () => {
    const g = base({ armed: { ...base().armed, 'p-a': true } });
    expect(aim(g, 'p-a', 'p-c')).toBe(true);
    g.turn = 'p-a';
    expect(aim(g, 'p-a', 'p-c')).toBe(false);
    expect(g.turn).toBe('p-a'); // el turno NO se ha gastado
  });
  it('la mesa puede saltar el turno de quien no responde', () => {
    const g = base();
    expect(skipTurn(g, 'p-a')).toBe(false); // el suyo lo pasa él actuando
    expect(skipTurn(g, 'p-b')).toBe(true);
    expect(g.turn).toBe('p-b');
    expect(g.log[0].txt).toContain('salta el turno de P-A');
  });
  it('no puedes investigarte a ti ni una carta ya revelada', () => {
    const g = base();
    expect(investigate(g, 'p-a', 'p-a', 0)).toBe(false);
    g.cards['p-c'][0].up = true;
    expect(investigate(g, 'p-a', 'p-c', 0)).toBe(false);
  });
  it('armarse, apuntar y disparar exigen el orden correcto', () => {
    const g = base();
    expect(aim(g, 'p-a', 'p-c')).toBe(false); // sin arma
    expect(arm(g, 'p-a')).toBe(true);
    expect(g.turn).toBe('p-b'); g.turn = 'p-a'; // (forzamos para seguir probando a p-a)
    expect(aim(g, 'p-a', 'p-c')).toBe(true);
    g.turn = 'p-a';
    expect(shoot(g, 'p-a')).toBe(true);
  });
});

describe('disparar y victoria', () => {
  it('matar al Jefe hace ganar a los honestos', () => {
    const g = base({ armed: { 'p-a': true, 'p-b': false, 'p-c': false, 'p-d': false }, aimAt: { 'p-a': 'p-c', 'p-b': null, 'p-c': null, 'p-d': null } });
    expect(shoot(g, 'p-a')).toBe(true);
    expect(isAlive(g, 'p-c')).toBe(false);
    expect(g.cards['p-c'].every((x) => x.up)).toBe(true); // cartas reveladas
    expect(g.winner).toBe('honest');
    expect(g.scores['p-a']).toBe(1);
    expect(g.scores['p-b']).toBe(1);
  });
  it('matar al Agente hace ganar a los corruptos', () => {
    const g = base({ turn: 'p-c', armed: { 'p-a': false, 'p-b': false, 'p-c': true, 'p-d': false }, aimAt: { 'p-a': null, 'p-b': null, 'p-c': 'p-a', 'p-d': null } });
    expect(shoot(g, 'p-c')).toBe(true);
    expect(g.winner).toBe('crook');
  });
  it('matar a un NO líder no acaba la partida: sigue el juego', () => {
    const g = base({ armed: { 'p-a': true, 'p-b': false, 'p-c': false, 'p-d': false }, aimAt: { 'p-a': 'p-d', 'p-b': null, 'p-c': null, 'p-d': null } });
    expect(shoot(g, 'p-a')).toBe(true); // p-d es corrupto pero NO el Jefe
    expect(g.winner).toBeNull();
    expect(isAlive(g, 'p-d')).toBe(false);
    expect(g.phase).toBe('turn');
  });
  it('disparar gasta la bala y limpia la mira', () => {
    const g = base({ armed: { ...base().armed, 'p-a': true }, aimAt: { ...base().aimAt, 'p-a': 'p-d' } });
    shoot(g, 'p-a');
    expect(g.armed['p-a']).toBe(false);
    expect(g.aimAt['p-a']).toBeNull();
  });
  it('el caído suelta la pistola y deja de apuntar', () => {
    const g = base({
      armed: { 'p-a': true, 'p-b': false, 'p-c': false, 'p-d': true },
      aimAt: { 'p-a': 'p-d', 'p-b': 'p-d', 'p-c': null, 'p-d': 'p-b' },
    });
    shoot(g, 'p-a');
    expect(g.armed['p-d']).toBe(false); // antes: «❌ D 🔫 🎯 B» para siempre
    expect(g.aimAt['p-d']).toBeNull();
    expect(g.aimAt['p-b']).toBeNull(); // quien le apuntaba pierde la mira
  });
  it('el anuncio del líder caído no lleva punto tras la exclamación', () => {
    const g = base({ armed: { ...base().armed, 'p-a': true }, aimAt: { ...base().aimAt, 'p-a': 'p-c' } });
    shoot(g, 'p-a');
    expect(g.log[0].txt).toContain('¡y su LÍDER!');
    expect(g.log[0].txt).not.toContain('!.');
  });
});

it('nextAlive salta a los muertos', () => {
  const g = base({ alive: { 'p-a': true, 'p-b': false, 'p-c': true, 'p-d': true } });
  expect(nextAlive(g, 'p-a')).toBe('p-c');
  expect(aliveIds(g)).toEqual(['p-a', 'p-c', 'p-d']);
  expect(isLeader(g, 'p-a')).toBe(true);
  expect(leaderId(g, 'crook')).toBe('p-c');
  expect(MIN_PLAYERS).toBe(4);
});

it('sabes quién te apunta y cuánto falta para tu turno', () => {
  const g = base({ aimAt: { 'p-a': null, 'p-b': 'p-a', 'p-c': 'p-a', 'p-d': null } });
  expect(aimersOf(g, 'p-a')).toEqual(['p-b', 'p-c']);
  expect(turnsUntil(g, 'p-a')).toBe(0);
  expect(turnsUntil(g, 'p-c')).toBe(2);
});
