import { describe, it, expect } from 'vitest';
import {
  dealGame, placeInitial, placeDisc, openBid, raiseBid, passBid, flip, flipTargets,
  nextRound, isAlive, aliveIds, invCount, totalPlaced, inHand, handCount, MARKS_TO_WIN,
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
  it('cada colocación deja una línea pública en el diario, sin decir qué disco', () => {
    const g = inPlay({ 'p-a': ['flower'], 'p-b': ['flower'], 'p-c': ['flower'] });
    placeDisc(g, 'p-a', 'skull');
    const last = g.log[g.log.length - 1].txt;
    expect(last).toContain('P-A');
    expect(last).toContain('P-B'); // a quién le toca ahora
    expect(last).not.toMatch(/💀|🌸|calavera|flor/i);
  });
  it('la apuesta no puede pasar del total de discos en mesa', () => {
    const g = inPlay({ 'p-a': ['flower'], 'p-b': ['flower'], 'p-c': ['flower'] });
    expect(openBid(g, 'p-a', 4)).toBe(false); // solo hay 3
    expect(openBid(g, 'p-a', 2)).toBe(true);
    expect(g.phase).toBe('bid');
    expect(g.turn).toBe('p-b');
  });
  it('abrir al tope revela ya, sin vuelta de «pasar» inútil', () => {
    const g = inPlay({ 'p-a': ['flower'], 'p-b': ['flower'], 'p-c': ['flower'] });
    expect(openBid(g, 'p-a', 3)).toBe(true); // 3 discos en mesa = tope
    expect(g.phase).toBe('reveal');
    expect(g.reveal).toMatchObject({ by: 'p-a', need: 3 });
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
  it('tras perder un disco, lo que queda en mano nunca es negativo', () => {
    // Regresión: el inventario baja al fallar pero la pila sigue en la mesa
    // hasta `nextRound`; con 3 flores puestas y una perdida, inHand daba -1 y
    // el '🌸'.repeat(-1) del modal 🎴 reventaba (RangeError).
    const g = inPlay(
      { 'p-a': ['flower', 'flower', 'flower'], 'p-b': ['skull'] },
      { alive: { 'p-a': true, 'p-b': true, 'p-c': false }, inv: { 'p-a': { flowers: 3, skulls: 0 }, 'p-b': { flowers: 3, skulls: 1 }, 'p-c': { flowers: 0, skulls: 0 } } },
    );
    openBid(g, 'p-a', 4); // tope: se revela ya
    flip(g, 'p-a', 'p-a'); flip(g, 'p-a', 'p-a'); flip(g, 'p-a', 'p-a');
    flip(g, 'p-a', 'p-b'); // calavera ajena: falla y pierde una flor (no tiene calavera)
    expect(g.phase).toBe('roundEnd');
    expect(invCount(g, 'p-a')).toBe(2);
    expect(g.stacks['p-a']).toHaveLength(3); // la pila sigue en la mesa
    expect(inHand(g, 'p-a')).toEqual({ flowers: 0, skulls: 0 });
    expect(handCount(g, 'p-a')).toBe(0);
    expect(() => '🌸'.repeat(inHand(g, 'p-a').flowers)).not.toThrow();
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
    expect(g.turn).toBe('p-a');
    expect(aliveIds(g)).toEqual(['p-a', 'p-b']);
  });
  it('el turno vuelve al que empieza (aunque el último en revelar quedara fuera)', () => {
    const g = inPlay({ 'p-a': ['skull'], 'p-b': ['flower'], 'p-c': ['flower'] },
      { inv: { 'p-a': { flowers: 0, skulls: 1 }, 'p-b': { flowers: 3, skulls: 1 }, 'p-c': { flowers: 3, skulls: 1 } } });
    openBid(g, 'p-a', 1); passBid(g, 'p-b'); passBid(g, 'p-c');
    flip(g, 'p-a', 'p-a'); // su calavera: falla, se queda sin discos y sale
    expect(isAlive(g, 'p-a')).toBe(false);
    expect(nextRound(g)).toBe(true);
    expect(g.starter).toBe('p-b');
    expect(g.turn).toBe('p-b'); // antes seguía marcando a p-a, ya eliminado
  });
});
