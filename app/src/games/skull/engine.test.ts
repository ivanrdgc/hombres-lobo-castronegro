import { describe, it, expect } from 'vitest';
import {
  dealGame, placeInitial, placeDisc, openBid, raiseBid, passBid, flip, flipTargets,
  nextRound, isAlive, aliveIds, invCount, totalPlaced, MARKS_TO_WIN,
} from './engine';
import type { SkullState, Disc } from './types';

const IDS = ['p-a', 'p-b', 'p-c'];
function base(over: Partial<SkullState> = {}): SkullState {
  return {
    skull: true, phase: 'setup', startedAt: 0, seed: 7, round: 1, rng: 0,
    playerIds: IDS.slice(), names: Object.fromEntries(IDS.map((id) => [id, id.toUpperCase()])),
    inv: Object.fromEntries(IDS.map((id) => [id, { flowers: 3, skulls: 1 }])),
    stacks: Object.fromEntries(IDS.map((id) => [id, []])),
    turn: 'p-a', starter: 'p-a', bid: null, passed: {}, reveal: null, lastResult: null,
    marks: Object.fromEntries(IDS.map((id) => [id, 0])),
    alive: Object.fromEntries(IDS.map((id) => [id, true])),
    winner: null, scores: {}, log: [],
    ...over,
  };
}
// Estado en 'play' con una pila de salida por jugador (discos indicados).
function inPlay(stacks: Record<string, Disc[]>, over: Partial<SkullState> = {}): SkullState {
  return base({ phase: 'play', stacks: { ...Object.fromEntries(IDS.map((id) => [id, []])), ...stacks }, turn: 'p-a', ...over });
}

describe('reparto y colocación', () => {
  it('da 3 flores y 1 calavera a cada jugador', () => {
    const d = dealGame(IDS);
    expect(d.inv['p-a']).toEqual({ flowers: 3, skulls: 1 });
  });
  it('la colocación de salida pasa a «play» cuando todos han puesto uno', () => {
    const g = base();
    expect(placeInitial(g, 'p-a', 'flower')).toBe(true);
    expect(g.phase).toBe('setup');
    placeInitial(g, 'p-b', 'skull');
    placeInitial(g, 'p-c', 'flower');
    expect(g.phase).toBe('play');
    expect(g.turn).toBe('p-a');
    expect(totalPlaced(g)).toBe(3);
  });
  it('no deja colocar dos de salida ni un disco que no tienes', () => {
    const g = base();
    placeInitial(g, 'p-a', 'flower');
    expect(placeInitial(g, 'p-a', 'flower')).toBe(false); // ya puso su salida
    const g2 = base({ inv: { ...base().inv, 'p-a': { flowers: 3, skulls: 0 } } });
    expect(placeInitial(g2, 'p-a', 'skull')).toBe(false); // no tiene calavera
  });
});

describe('turno y apuestas', () => {
  it('colocar un disco pasa el turno al siguiente vivo', () => {
    const g = inPlay({ 'p-a': ['flower'], 'p-b': ['flower'], 'p-c': ['flower'] });
    expect(placeDisc(g, 'p-a', 'flower')).toBe(true);
    expect(g.turn).toBe('p-b');
    expect(g.stacks['p-a']).toEqual(['flower', 'flower']);
  });
  it('la apuesta no puede pasar del total de discos en mesa', () => {
    const g = inPlay({ 'p-a': ['flower'], 'p-b': ['flower'], 'p-c': ['flower'] });
    expect(openBid(g, 'p-a', 4)).toBe(false); // solo hay 3
    expect(openBid(g, 'p-a', 2)).toBe(true);
    expect(g.phase).toBe('bid');
    expect(g.turn).toBe('p-b');
  });
  it('subir y pasar: al pasar todos menos el apostador, se revela', () => {
    const g = inPlay({ 'p-a': ['flower'], 'p-b': ['flower'], 'p-c': ['flower'] });
    openBid(g, 'p-a', 1);
    expect(raiseBid(g, 'p-b', 2)).toBe(true); // p-b sube
    expect(g.bid).toMatchObject({ by: 'p-b', n: 2 });
    passBid(g, 'p-c');
    passBid(g, 'p-a');
    expect(g.phase).toBe('reveal');
    expect(g.reveal).toMatchObject({ by: 'p-b', need: 2 });
  });
});

describe('revelado', () => {
  it('obliga a levantar primero la pila propia', () => {
    const g = inPlay({ 'p-a': ['flower'], 'p-b': ['flower'] }, { alive: { 'p-a': true, 'p-b': true, 'p-c': false } });
    openBid(g, 'p-a', 2); passBid(g, 'p-b');
    expect(flipTargets(g)).toEqual(['p-a']); // primero la suya
    expect(flip(g, 'p-a', 'p-b')).toBe(false); // no puede empezar por la ajena
    expect(flip(g, 'p-a', 'p-a')).toBe(true); // levanta la suya (flor)
    expect(flipTargets(g)).toEqual(['p-b']); // ahora sí la ajena
  });
  it('completar las flores de la apuesta gana el reto (marca)', () => {
    const g = inPlay({ 'p-a': ['flower'], 'p-b': ['flower'] }, { alive: { 'p-a': true, 'p-b': true, 'p-c': false } });
    openBid(g, 'p-a', 2); passBid(g, 'p-b');
    flip(g, 'p-a', 'p-a');
    flip(g, 'p-a', 'p-b');
    expect(g.marks['p-a']).toBe(1);
    expect(g.phase).toBe('roundEnd');
    expect(g.lastResult?.success).toBe(true);
  });
  it('topar una calavera hace perder un disco', () => {
    const g = inPlay({ 'p-a': ['skull'] }, { alive: { 'p-a': true, 'p-b': true, 'p-c': false } });
    openBid(g, 'p-a', 1); passBid(g, 'p-b');
    flip(g, 'p-a', 'p-a'); // su propia calavera
    expect(g.phase).toBe('roundEnd');
    expect(g.lastResult?.success).toBe(false);
    expect(invCount(g, 'p-a')).toBe(3); // pierde uno de sus 4
  });
});

describe('victoria', () => {
  it('dos retos ganan la partida', () => {
    const g = inPlay({ 'p-a': ['flower'], 'p-b': ['flower'] },
      { alive: { 'p-a': true, 'p-b': true, 'p-c': false }, marks: { 'p-a': 1, 'p-b': 0, 'p-c': 0 } });
    openBid(g, 'p-a', 1); passBid(g, 'p-b');
    flip(g, 'p-a', 'p-a');
    expect(g.marks['p-a']).toBe(MARKS_TO_WIN);
    expect(g.phase).toBe('end');
    expect(g.winner).toBe('p-a');
    expect(g.scores['p-a']).toBe(1);
  });
  it('quedarse sin discos elimina, y el último en pie gana', () => {
    const g = inPlay({ 'p-a': ['skull'] },
      { alive: { 'p-a': true, 'p-b': true, 'p-c': false }, inv: { 'p-a': { flowers: 0, skulls: 1 }, 'p-b': { flowers: 3, skulls: 1 }, 'p-c': { flowers: 0, skulls: 0 } } });
    openBid(g, 'p-a', 1); passBid(g, 'p-b');
    flip(g, 'p-a', 'p-a'); // pierde su última (calavera) → 0 discos
    expect(isAlive(g, 'p-a')).toBe(false);
    expect(g.phase).toBe('end');
    expect(g.winner).toBe('p-b');
  });
});

describe('nueva ronda', () => {
  it('recoge las pilas y vuelve a la colocación, empezando quien corresponde', () => {
    const g = inPlay({ 'p-a': ['flower'], 'p-b': ['flower'] }, { alive: { 'p-a': true, 'p-b': true, 'p-c': false } });
    openBid(g, 'p-a', 2); passBid(g, 'p-b');
    flip(g, 'p-a', 'p-a'); flip(g, 'p-a', 'p-b'); // gana → starter p-a
    expect(nextRound(g)).toBe(true);
    expect(g.phase).toBe('setup');
    expect(g.round).toBe(2);
    expect(g.stacks['p-a']).toEqual([]);
    expect(g.starter).toBe('p-a');
    expect(aliveIds(g)).toEqual(['p-a', 'p-b']);
  });
});
