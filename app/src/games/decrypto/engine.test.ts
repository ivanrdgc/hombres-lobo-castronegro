import { describe, it, expect } from 'vitest';
import {
  dealGame, makeCode, validCode, giveClues, submitIntercept, submitDecode, nextTransmission,
  beginTransmission, encoderId, teamMembers, other, TOKENS_TO_WIN, MIN_PLAYERS, MAX_ROUNDS,
  cluesForWord, pendingWin, relieveEncoder, resetForRematch,
} from './engine';
import type { DecryptoState } from './types';

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
    history: [], usedCodes: { red: [], blue: [] }, winner: null, winReason: null, scores: {}, log: [],
    ...over,
  };
}

/** Juega una transmisión entera del equipo activo y devuelve el estado en 'reveal'. */
function playTransmission(g: DecryptoState, opts: { intercepted?: boolean; error?: boolean } = {}): void {
  const enc = encoderId(g, g.active);
  const mate = teamMembers(g, g.active).find((p) => p !== enc)!;
  const rival = teamMembers(g, other(g.active))[0];
  const wrong = (c: readonly number[]): [number, number, number] => [c[1], c[0], c[2]];
  const code = g.code;
  giveClues(g, enc, ['a', 'b', 'c']);
  if (g.phase === 'intercept') submitIntercept(g, rival, opts.intercepted ? [...code] : wrong(code));
  submitDecode(g, mate, opts.error ? wrong(code) : [...code]);
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
  it('dos intercepciones ganan, pero antes se ve el destape (reveal → end)', () => {
    const g = base({ tokens: { red: { intercepts: 0, errors: 0 }, blue: { intercepts: 1, errors: 0 } } });
    giveClues(g, 'p-a', ['x', 'y', 'z']);
    submitIntercept(g, 'p-c', [4, 2, 1]); // 2ª intercepción del azul
    submitDecode(g, 'p-b', [4, 2, 1]);
    // La transmisión ganadora TIENE que destaparse: no se salta al final.
    expect(g.phase).toBe('reveal');
    expect(g.winner).toBe(null);
    expect(pendingWin(g)?.winner).toBe('blue');
    nextTransmission(g, 9);
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
    nextTransmission(g, 9);
    expect(g.winner).toBe('blue');
  });
});

describe('fin por límite de rondas', () => {
  // Deja la partida a punto de agotar la última ronda con las fichas dadas.
  function atLastRound(tokens: DecryptoState['tokens']): DecryptoState {
    return base({ round: MAX_ROUNDS, active: 'blue', phase: 'reveal', tokens });
  }
  it('con más intercepciones gana ese equipo, y lo dice el motivo', () => {
    const g = atLastRound({ red: { intercepts: 1, errors: 0 }, blue: { intercepts: 0, errors: 0 } });
    nextTransmission(g, 9);
    expect(g.phase).toBe('end');
    expect(g.winner).toBe('red');
    expect(g.winReason).toMatch(/interceptó más veces/);
  });
  it('empatadas las intercepciones, decide quien menos errores tiene', () => {
    const g = atLastRound({ red: { intercepts: 1, errors: 1 }, blue: { intercepts: 1, errors: 0 } });
    nextTransmission(g, 9);
    expect(g.winner).toBe('blue');
    expect(g.winReason).toMatch(/menos errores/);
  });
  it('si TODO empata son tablas: nadie gana ni suma punto', () => {
    const g = atLastRound({ red: { intercepts: 1, errors: 1 }, blue: { intercepts: 1, errors: 1 } });
    nextTransmission(g, 9);
    expect(g.phase).toBe('end');
    expect(g.winner).toBe(null);
    expect(g.winReason).toMatch(/nadie gana/);
    expect(Object.values(g.scores)).toEqual([]);
    expect(g.log.some((l) => /Tablas/.test(l.txt))).toBe(true);
  });
});

describe('códigos sin reposición (como el mazo de la caja)', () => {
  it('partida entera: 8 rondas sin fichas acaban en tablas y ningún código se repite', () => {
    const g = base({ round: 1, active: 'red' });
    beginTransmission(g, 3);
    const seen: Record<string, string[]> = { red: [], blue: [] };
    for (let i = 0; i < 40 && g.phase !== 'end'; i++) {
      seen[g.active].push(g.code.join('-'));
      playTransmission(g); // nadie falla y nadie intercepta: 0-0
      nextTransmission(g, i * 37 + 5);
    }
    expect(g.phase).toBe('end');
    expect(g.round).toBe(MAX_ROUNDS + 1);
    expect(g.winner).toBe(null);
    expect(seen.red).toHaveLength(MAX_ROUNDS);
    for (const t of ['red', 'blue']) expect(new Set(seen[t]).size, `códigos repetidos del ${t}`).toBe(seen[t].length);
  });
  it('makeCode respeta la lista de usados y siempre da un código válido', () => {
    const used: string[] = [];
    for (let i = 0; i < 24; i++) {
      const c = makeCode(i * 13 + 1, used);
      expect(validCode(c)).toBe(true);
      expect(used).not.toContain(c.join('-'));
      used.push(c.join('-'));
    }
  });
});

describe('hoja de pistas y relevo', () => {
  it('cluesForWord agrupa por número de palabra, no por posición', () => {
    const g = base({
      history: [
        { team: 'red', round: 1, code: [4, 1, 3], clues: ['gaviota', 'amanecer', 'caudal'] },
        { team: 'red', round: 2, code: [4, 2, 1], clues: ['marea', 'noche', 'playa'] },
        { team: 'blue', round: 1, code: [2, 3, 1], clues: ['horno', 'lingote', 'corona'] },
      ],
    });
    expect(cluesForWord(g, 'red', 4).map((c) => c.clue)).toEqual(['gaviota', 'marea']);
    expect(cluesForWord(g, 'red', 1).map((c) => c.clue)).toEqual(['amanecer', 'playa']);
    expect(cluesForWord(g, 'red', 2)).toEqual([{ clue: 'noche', round: 2 }]);
    expect(cluesForWord(g, 'blue', 4)).toEqual([]);
  });
  it('el relevo rota el encriptador y reparte código nuevo (solo su equipo, solo en pistas)', () => {
    const g = base();
    const before = g.code.join('-');
    expect(relieveEncoder(g, 'p-c', 7)).toBe(false); // el rival no releva
    expect(relieveEncoder(g, 'p-b', 7)).toBe(true);
    expect(encoderId(g, 'red')).toBe('p-b');
    expect(g.code.join('-')).not.toBe(before); // el anterior ya lo había visto
    expect(g.phase).toBe('clue');
    g.phase = 'decode';
    expect(relieveEncoder(g, 'p-b', 7)).toBe(false); // fuera de la fase de pistas, no
  });
});

describe('revancha', () => {
  it('resetForRematch limpia fichas, historial y códigos usados, y conserva el marcador', () => {
    const g = base({
      round: 5, active: 'blue', phase: 'end', winner: 'red', winReason: 'algo',
      tokens: { red: { intercepts: 2, errors: 0 }, blue: { intercepts: 0, errors: 1 } },
      history: [{ team: 'red', round: 1, code: [1, 2, 3], clues: ['a', 'b', 'c'] }],
      usedCodes: { red: ['1-2-3'], blue: ['4-3-2'] },
      scores: { 'p-a': 1, 'p-b': 1 },
      encoderIdx: { red: 3, blue: 3 },
    });
    resetForRematch(g, 4242);
    expect(g.phase).toBe('clue');
    expect(g.round).toBe(1);
    expect(g.active).toBe('red');
    expect(g.winner).toBe(null);
    expect(g.history).toEqual([]);
    expect(g.tokens).toEqual({ red: { intercepts: 0, errors: 0 }, blue: { intercepts: 0, errors: 0 } });
    expect(g.encoderIdx).toEqual({ red: 0, blue: 0 });
    expect(g.usedCodes!.red).toEqual([g.code.join('-')]); // mazo nuevo, con el código en curso
    expect(g.scores['p-a']).toBe(1); // el marcador de la mesa se conserva
    expect(g.words.red.some((w) => g.words.blue.includes(w))).toBe(false);
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
