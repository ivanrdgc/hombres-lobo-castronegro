import { describe, it, expect } from 'vitest';
import {
  dealGame, giveClue, reveal, pass, canPass, skipClue, clueProblem, clueStalled, canGuess,
  isSpymaster, teamOf, other, BOARD, MIN_PLAYERS, CLUE_STALL_MS,
} from './engine';
import { WORDS } from './words';
import type { CodenamesState, CellKind } from './types';

const IDS = ['p-a', 'p-b', 'p-c', 'p-d'];

// Construye un estado con un mapa CONTROLADO para probar la resolución.
function mk(over: Partial<CodenamesState> = {}): CodenamesState {
  const map: CellKind[] = Array(BOARD).fill('neutral');
  // 0..8 rojas, 9..16 azules, 17 asesino, resto neutrales.
  for (let i = 0; i < 9; i++) map[i] = 'red';
  for (let i = 9; i < 17; i++) map[i] = 'blue';
  map[17] = 'assassin';
  return {
    codenames: true, phase: 'clue', startedAt: 0, seed: 1,
    playerIds: IDS.slice(), names: Object.fromEntries(IDS.map((id) => [id, id.toUpperCase()])),
    teams: { 'p-a': 'red', 'p-b': 'red', 'p-c': 'blue', 'p-d': 'blue' },
    spymaster: { red: 'p-a', blue: 'p-c' },
    words: Array.from({ length: BOARD }, (_, i) => 'W' + i),
    map, revealed: Array(BOARD).fill(false),
    starting: 'red', turn: 'red', clue: null, guessesLeft: 0, guessesMade: 0,
    remaining: { red: 9, blue: 8 }, winner: null, winReason: null, scores: {}, log: [],
    ...over,
  };
}

describe('dealGame', () => {
  it('reparte equipos casi a la par, un Jefe por equipo y un mapa de 25', () => {
    const d = dealGame(IDS, 42);
    const reds = IDS.filter((p) => d.teams[p] === 'red');
    const blues = IDS.filter((p) => d.teams[p] === 'blue');
    expect(reds.length + blues.length).toBe(4);
    expect(Math.abs(reds.length - blues.length)).toBeLessThanOrEqual(1);
    expect(reds).toContain(d.spymaster.red);
    expect(blues).toContain(d.spymaster.blue);
    expect(d.words).toHaveLength(BOARD);
    expect(new Set(d.words).size).toBe(BOARD); // sin palabras repetidas
    expect(d.map.filter((c) => c === 'assassin')).toHaveLength(1);
    expect(d.map.filter((c) => c === 'neutral')).toHaveLength(7);
    expect(d.map.filter((c) => c === d.starting)).toHaveLength(9);
    expect(d.map.filter((c) => c === other(d.starting))).toHaveLength(8);
    expect(d.remaining[d.starting]).toBe(9);
  });
});

describe('pista', () => {
  it('solo el Jefe del equipo de turno la da, y fija número+1 intentos', () => {
    const g = mk();
    expect(giveClue(g, 'p-b', 'algo', 2)).toBe(false); // no es el jefe
    expect(giveClue(g, 'p-c', 'algo', 2)).toBe(false); // jefe del otro equipo
    expect(giveClue(g, 'p-a', 'fuego', 2)).toBe(true);
    expect(g.phase).toBe('guess');
    expect(g.guessesLeft).toBe(3);
    expect(g.clue).toMatchObject({ word: 'fuego', num: 2 });
  });
  it('rechaza la pista vacía, la de varias palabras y la que está en el tablero', () => {
    const g = mk({ words: ['Volcán', ...Array.from({ length: BOARD - 1 }, (_, i) => 'W' + i)] });
    expect(clueProblem(g, '  ')).toMatch(/Escribe/);
    expect(clueProblem(g, 'dos palabras')).toMatch(/UNA sola/);
    expect(clueProblem(g, 'volcan')).toMatch(/tablero/); // sin tilde y en minúsculas
    expect(clueProblem(g, 'fuego')).toBeNull();
    expect(giveClue(g, 'p-a', '', 2)).toBe(false);
    expect(giveClue(g, 'p-a', 'Volcán', 2)).toBe(false);
    expect(g.phase).toBe('clue'); // ninguna pista fantasma
  });
  it('las pistas de 0 y de ∞ dejan tocar sin límite', () => {
    const cero = mk();
    giveClue(cero, 'p-a', 'agua', 0);
    expect(cero.guessesLeft).toBe(-1);
    reveal(cero, 'p-b', 0); reveal(cero, 'p-b', 1); reveal(cero, 'p-b', 2);
    expect(cero.turn).toBe('red'); // no se agotan los intentos
    expect(canPass(cero)).toBe(true); // pero pueden plantarse cuando quieran

    const infi = mk();
    giveClue(infi, 'p-a', 'agua', 3, true);
    expect(infi.clue).toMatchObject({ unlimited: true });
    expect(infi.guessesLeft).toBe(-1);
  });
});

describe('atasco en la fase de pista', () => {
  it('se detecta tras el plazo y cualquiera puede saltar el turno del Jefe', () => {
    const g = mk({ startedAt: 1000, clueAt: 1000 });
    expect(clueStalled(g, 1000 + CLUE_STALL_MS - 1)).toBe(false);
    expect(clueStalled(g, 1000 + CLUE_STALL_MS + 1)).toBe(true);
    expect(skipClue(g, 'p-d')).toBe(true); // hasta un rival puede desatascar
    expect(g.turn).toBe('blue');
    expect(g.phase).toBe('clue');
    expect(skipClue(g, 'p-d')).toBe(true);
    expect(g.turn).toBe('red'); // y se puede repetir si el otro tampoco está
  });
});

describe('toques', () => {
  it('acertar una propia deja seguir; agotar los intentos cierra el turno', () => {
    const g = mk();
    giveClue(g, 'p-a', 'x', 1); // 2 intentos
    expect(canGuess(g, 'p-b')).toBe(true);
    expect(canGuess(g, 'p-a')).toBe(false); // el jefe no toca
    expect(canGuess(g, 'p-c')).toBe(false); // el rival no toca
    reveal(g, 'p-b', 0); // roja → acierto
    expect(g.turn).toBe('red');
    expect(g.remaining.red).toBe(8);
    reveal(g, 'p-b', 1); // segunda roja → agota intentos
    expect(g.turn).toBe('blue');
    expect(g.phase).toBe('clue');
  });
  it('tocar un transeúnte cierra el turno', () => {
    const g = mk();
    giveClue(g, 'p-a', 'x', 3);
    reveal(g, 'p-b', 18); // neutral
    expect(g.turn).toBe('blue');
  });
  it('tocar una del rival se la regala y cierra el turno', () => {
    const g = mk();
    giveClue(g, 'p-a', 'x', 3);
    reveal(g, 'p-b', 9); // azul
    expect(g.remaining.blue).toBe(7);
    expect(g.turn).toBe('blue');
  });
  it('regalar la ÚLTIMA del rival le da la victoria', () => {
    const g = mk({ remaining: { red: 5, blue: 1 } });
    giveClue(g, 'p-a', 'x', 3);
    reveal(g, 'p-b', 9); // azul: era la última que le quedaba
    expect(g.phase).toBe('end');
    expect(g.winner).toBe('blue');
    expect(g.winReason).toMatch(/regaló/);
    expect(g.scores['p-c']).toBe(1);
    expect(g.scores['p-d']).toBe(1);
    expect(g.scores['p-a']).toBeUndefined();
  });
  it('tocar al asesino hace perder al equipo que lo toca', () => {
    const g = mk();
    giveClue(g, 'p-a', 'x', 3);
    reveal(g, 'p-b', 17); // asesino
    expect(g.phase).toBe('end');
    expect(g.winner).toBe('blue');
  });
  it('destapar la última casilla propia gana la partida', () => {
    const g = mk({ remaining: { red: 1, blue: 8 } });
    giveClue(g, 'p-a', 'x', 1);
    reveal(g, 'p-b', 0); // última roja
    expect(g.phase).toBe('end');
    expect(g.winner).toBe('red');
    expect(g.scores['p-a']).toBe(1);
    expect(g.scores['p-b']).toBe(1);
  });
  it('pasar exige al menos un toque (regla oficial) y luego cierra el turno', () => {
    const g = mk();
    giveClue(g, 'p-a', 'x', 2);
    expect(pass(g, 'p-b')).toBe(false); // sin tocar aún: no se puede pasar
    reveal(g, 'p-b', 0); // una acertada primero
    expect(pass(g, 'p-b')).toBe(true);
    expect(g.turn).toBe('blue');
  });
});

it('fugas: canSeeMap solo para los Jefes durante la partida', () => {
  const g = mk();
  expect(isSpymaster(g, 'p-a')).toBe(true);
  expect(isSpymaster(g, 'p-b')).toBe(false);
  expect(teamOf(g, 'p-d')).toBe('blue');
  expect(MIN_PLAYERS).toBe(4);
});

it('el banco de palabras es largo y sin duplicados ni derivados entre sí', () => {
  expect(WORDS.length).toBeGreaterThanOrEqual(250);
  expect(new Set(WORDS.map((w) => w.toLowerCase())).size).toBe(WORDS.length);
  // Una palabra prefijo de otra («Faro»/«Farol») las tapa mutuamente.
  const low = WORDS.map((w) => w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/gu, ''));
  const tapadas = low.filter((a, i) => low.some((b, j) => i !== j && b.startsWith(a)));
  expect(tapadas).toEqual([]);
  // Y los que se tapan por SIGNIFICADO, que ningún patrón detecta: si vuelven a
  // colarse, la pista buena para uno lo es también para el otro.
  const pares: [string, string][] = [
    ['Araña', 'Telaraña'], ['Sol', 'Girasol'], ['Rosa', 'Flor'], ['Cielo', 'Rascacielos'],
    ['Cuchara', 'Tenedor'], ['Pincel', 'Cepillo'], ['Coliseo', 'Estadio'],
    ['Ciudad', 'Pueblo'], ['Toro', 'Vaca'], ['Tiburón', 'Pez'],
  ];
  expect(pares.filter(([a, b]) => WORDS.includes(a) && WORDS.includes(b))).toEqual([]);
});
