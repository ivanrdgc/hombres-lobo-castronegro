import { describe, it, expect } from 'vitest';
import {
  dealGame, makeCode, validCode, giveClues, submitIntercept, submitDecode, nextTransmission,
  beginTransmission, encoderId, teamMembers, other, TOKENS_TO_WIN, MIN_PLAYERS,
} from './engine';
import type { DecryptoState, Team } from './types';

const IDS = ['p-a', 'p-b', 'p-c', 'p-d'];
function base(over: Partial<DecryptoState> = {}): DecryptoState {
  return {
    decrypto: true, phase: 'clue', startedAt: 0, seed: 1, round: 2,
    playerIds: IDS.slice(), names: Object.fromEntries(IDS.map((id) => [id, id.toUpperCase()])),
    teams: { 'p-a': 'red', 'p-b': 'red', 'p-c': 'blue', 'p-d': 'blue' },
    words: { red: ['Sol', 'Luna', 'Río', 'Mar'], blue: ['Rey', 'Pan', 'Oro', 'Sal'] },
    encoderIdx: { red: 0, blue: 0 }, active: 'red', code: [4, 2, 1], clues: null,
    intercept: null, decode: null,
    tokens: { red: { intercepts: 0, errors: 0 }, blue: { intercepts: 0, errors: 0 } },
    history: [], winner: null, winReason: null, scores: {}, log: [],
    ...over,
  };
}

describe('reparto y códigos', () => {
  it('reparte equipos casi a la par y 4 palabras a cada uno', () => {
    const d = dealGame(IDS, 5);
    expect(IDS.filter((p) => d.teams[p] === 'red')).toHaveLength(2);
    expect(d.words.red).toHaveLength(4);
    expect(d.words.blue).toHaveLength(4);
    // Sin solapamiento de palabras entre equipos.
    expect(d.words.red.some((w) => d.words.blue.includes(w))).toBe(false);
  });
  it('makeCode da 3 dígitos distintos de 1..4', () => {
    for (let s = 0; s < 30; s++) expect(validCode(makeCode(s * 17 + 1))).toBe(true);
    expect(validCode([1, 1, 2])).toBe(false);
    expect(validCode([1, 2])).toBe(false);
    expect(validCode([1, 2, 5])).toBe(false);
  });
  it('encoderId sigue el índice del equipo', () => {
    const g = base();
    expect(teamMembers(g, 'red')).toEqual(['p-a', 'p-b']);
    expect(encoderId(g, 'red')).toBe('p-a');
    expect(encoderId(base({ encoderIdx: { red: 1, blue: 0 } }), 'red')).toBe('p-b');
  });
});

describe('flujo de una transmisión', () => {
  it('pistas → interceptar (rival) → descifrar (propio) → reparto de fichas', () => {
    const g = base(); // round 2 → hay intercepción
    // Solo el encriptador rojo (p-a) da pistas.
    expect(giveClues(g, 'p-b', ['a', 'b', 'c'])).toBe(false);
    expect(giveClues(g, 'p-a', ['calor', 'noche', 'agua'])).toBe(true);
    expect(g.phase).toBe('intercept');
    // Intercepta el rival (azul). p-a (rojo) no puede.
    expect(submitIntercept(g, 'p-a', [4, 2, 1])).toBe(false);
    expect(submitIntercept(g, 'p-c', [1, 2, 3])).toBe(true); // falla
    expect(g.phase).toBe('decode');
    // Descifra el propio equipo, y NO el encriptador.
    expect(submitDecode(g, 'p-a', [4, 2, 1])).toBe(false);
    expect(submitDecode(g, 'p-b', [4, 2, 1])).toBe(true); // acierta su código
    expect(g.phase).toBe('reveal');
    expect(g.tokens.red.errors).toBe(0);
    expect(g.tokens.blue.intercepts).toBe(0);
    expect(g.history).toHaveLength(1);
  });
  it('fallar el propio código suma un error; interceptar suma intercepción al rival', () => {
    const g = base();
    giveClues(g, 'p-a', ['x', 'y', 'z']);
    submitIntercept(g, 'p-c', [4, 2, 1]); // el rival ACIERTA
    submitDecode(g, 'p-b', [1, 2, 4]); // el propio FALLA
    expect(g.tokens.red.errors).toBe(1);
    expect(g.tokens.blue.intercepts).toBe(1);
  });
  it('en la ronda 1 no hay intercepción: de pistas se pasa directo a descifrar', () => {
    const g = base({ round: 1 });
    giveClues(g, 'p-a', ['x', 'y', 'z']);
    expect(g.phase).toBe('decode');
  });
});

describe('victoria', () => {
  it('dos intercepciones ganan la partida', () => {
    const g = base({ tokens: { red: { intercepts: 0, errors: 0 }, blue: { intercepts: 1, errors: 0 } } });
    giveClues(g, 'p-a', ['x', 'y', 'z']);
    submitIntercept(g, 'p-c', [4, 2, 1]); // 2ª intercepción del azul
    submitDecode(g, 'p-b', [4, 2, 1]);
    expect(g.phase).toBe('end');
    expect(g.winner).toBe('blue');
    expect(g.scores['p-c']).toBe(1);
    expect(g.scores['p-d']).toBe(1);
  });
  it('dos errores hacen perder (gana el rival)', () => {
    const g = base({ tokens: { red: { intercepts: 0, errors: 1 }, blue: { intercepts: 0, errors: 0 } } });
    giveClues(g, 'p-a', ['x', 'y', 'z']);
    submitIntercept(g, 'p-c', [1, 2, 3]);
    submitDecode(g, 'p-b', [1, 2, 3]); // 2º error del rojo
    expect(g.winner).toBe('blue');
  });
});

describe('alternancia de medios-turnos', () => {
  it('tras el rojo transmite el azul; al volver al rojo sube la ronda y rota encriptadores', () => {
    const g = base({ round: 2, active: 'red', phase: 'reveal' });
    nextTransmission(g, 9);
    expect(g.active).toBe('blue');
    expect(g.round).toBe(2);
    g.phase = 'reveal';
    nextTransmission(g, 9);
    expect(g.active).toBe('red');
    expect(g.round).toBe(3);
    expect(g.encoderIdx.red).toBe(1);
  });
});

it('beginTransmission fija un código válido y fase de pistas', () => {
  const g = base({ phase: 'reveal' });
  beginTransmission(g, 123);
  expect(validCode(g.code)).toBe(true);
  expect(g.phase).toBe('clue');
  expect(other('red')).toBe('blue');
  expect(MIN_PLAYERS).toBe(4);
  expect(TOKENS_TO_WIN).toBe(2);
});
