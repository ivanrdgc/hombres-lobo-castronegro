import { describe, it, expect } from 'vitest';
import {
  dealRound, playCard, validTargets, countessForced, playableIdx, startRound,
  isAlive, aliveIds, tokensToWin, MIN_PLAYERS, dropOut, myPeek, outCounts,
} from './engine';
import type { LoveLetterState } from './types';
import type { Card } from './cards';

const IDS = ['p-a', 'p-b', 'p-c'];
function base(hands: Record<string, Card[]>, over: Partial<LoveLetterState> = {}): LoveLetterState {
  return {
    loveletter: true, phase: 'turn', startedAt: 0, seed: 1, round: 1,
    playerIds: IDS.slice(), names: Object.fromEntries(IDS.map((id) => [id, id.toUpperCase()])),
    deck: ['guard', 'guard'], aside: 'princess', asideUsed: false, asideUp: [],
    hands: { 'p-a': [], 'p-b': [], 'p-c': [], ...hands },
    discards: Object.fromEntries(IDS.map((id) => [id, []])),
    alive: Object.fromEntries(IDS.map((id) => [id, true])),
    protected: Object.fromEntries(IDS.map((id) => [id, false])),
    turn: 'p-a', starter: 'p-a', peeks: {}, roundResult: null,
    tokens: Object.fromEntries(IDS.map((id) => [id, 0])), need: 5,
    winner: null, scores: {}, log: [],
    ...over,
  };
}

describe('reparto', () => {
  it('reparte 1 carta a cada uno, aparta 1, y 3 boca arriba con 2 jugadores', () => {
    const d2 = dealRound(['p-a', 'p-b'], 5);
    expect(d2.hands['p-a']).toHaveLength(1);
    expect(d2.asideUp).toHaveLength(3);
    expect(d2.deck.length).toBe(16 - 1 - 3 - 2); // aside + 3 arriba + 2 manos
    const d3 = dealRound(IDS, 5);
    expect(d3.asideUp).toHaveLength(0);
    expect(d3.deck.length).toBe(16 - 1 - 3); // aside + 3 manos
  });
  it('tokensToWin sigue la tabla oficial, y baja a 3 con 5-6 (mazo de 16)', () => {
    expect(tokensToWin(2)).toBe(7);
    expect(tokensToWin(3)).toBe(5);
    expect(tokensToWin(4)).toBe(4);
    expect(tokensToWin(5)).toBe(3);
    expect(tokensToWin(6)).toBe(3);
  });
});

describe('Guardia', () => {
  it('acierta y elimina', () => {
    const g = base({ 'p-a': ['guard', 'priest'], 'p-b': ['baron'], 'p-c': ['handmaid'] });
    expect(playCard(g, 'p-a', 0, { target: 'p-b', guess: 'baron' })).toBe(true);
    expect(isAlive(g, 'p-b')).toBe(false);
  });
  it('falla y no pasa nada', () => {
    const g = base({ 'p-a': ['guard', 'priest'], 'p-b': ['baron'], 'p-c': ['handmaid'] });
    playCard(g, 'p-a', 0, { target: 'p-b', guess: 'king' });
    expect(isAlive(g, 'p-b')).toBe(true);
  });
  it('no puede adivinar «Guardia» ni jugar sin adivinanza contra un objetivo', () => {
    const g = base({ 'p-a': ['guard', 'priest'], 'p-b': ['baron'], 'p-c': ['handmaid'] });
    expect(playCard(g, 'p-a', 0, { target: 'p-b', guess: 'guard' })).toBe(false);
    expect(playCard(g, 'p-a', 0, { target: 'p-b' })).toBe(false);
  });
});

describe('protección de la Doncella', () => {
  it('un protegido no puede ser objetivo', () => {
    const g = base({ 'p-a': ['guard', 'priest'], 'p-b': ['baron'], 'p-c': ['handmaid'] }, { protected: { 'p-a': false, 'p-b': true, 'p-c': false } });
    expect(validTargets(g, 'p-a', 'guard')).toEqual(['p-c']);
  });
});

describe('Barón', () => {
  it('el de carta menor cae', () => {
    const g = base({ 'p-a': ['baron', 'king'], 'p-b': ['guard'], 'p-c': ['handmaid'] });
    playCard(g, 'p-a', 0, { target: 'p-b' }); // p-a queda con Rey(6) vs Guardia(1)
    expect(isAlive(g, 'p-b')).toBe(false);
    expect(isAlive(g, 'p-a')).toBe(true);
  });
  it('el diario solo canta la carta del PERDEDOR; la del ganador va en privado', () => {
    const g = base({ 'p-a': ['baron', 'king'], 'p-b': ['guard'], 'p-c': ['handmaid'] });
    playCard(g, 'p-a', 0, { target: 'p-b' });
    const diario = g.log.map((l) => l.txt).join('\n');
    expect(diario).toContain('💂 Guardia'); // el perdedor se destapa
    expect(diario).not.toContain('👑 Rey'); // el ganador NO
    expect(myPeek(g, 'p-b')?.card).toBe('king');
    expect(myPeek(g, 'p-a')).toMatchObject({ target: 'p-b', card: 'guard', via: 'baron' });
  });
  it('en el empate no cae nadie y cada duelista ve la carta del otro', () => {
    const g = base({ 'p-a': ['baron', 'priest'], 'p-b': ['priest'], 'p-c': ['handmaid'] });
    playCard(g, 'p-a', 0, { target: 'p-b' });
    expect(isAlive(g, 'p-a')).toBe(true);
    expect(isAlive(g, 'p-b')).toBe(true);
    expect(myPeek(g, 'p-a')?.card).toBe('priest');
    expect(myPeek(g, 'p-b')?.card).toBe('priest');
  });
});

describe('vistazos privados', () => {
  it('sobrevive a las jugadas ajenas, acompaña tu turno y caduca en el siguiente', () => {
    const g = base({ 'p-a': ['priest', 'handmaid'], 'p-b': ['handmaid'], 'p-c': ['handmaid'] },
      { deck: Array(8).fill('guard') as Card[] });
    playCard(g, 'p-a', 0, { target: 'p-b' }); // p-a espía
    expect(myPeek(g, 'p-a')?.card).toBe('handmaid');
    playCard(g, 'p-b', 0, {}); // juegan otros: el vistazo NO se borra
    playCard(g, 'p-c', 0, {});
    expect(g.turn).toBe('p-a');
    expect(myPeek(g, 'p-a')?.card).toBe('handmaid'); // sigue delante mientras decide
    playCard(g, 'p-a', 0, {});
    playCard(g, 'p-b', 0, {}); // todos protegidos: Guardia sin objetivo
    playCard(g, 'p-c', 0, { target: 'p-b', guess: 'baron' });
    expect(g.turn).toBe('p-a');
    expect(myPeek(g, 'p-a')).toBe(null); // caduca a la vuelta siguiente
  });
});

describe('Príncipe y Princesa', () => {
  it('forzar descartar la Princesa elimina', () => {
    const g = base({ 'p-a': ['prince', 'guard'], 'p-b': ['princess'], 'p-c': ['handmaid'] });
    playCard(g, 'p-a', 0, { target: 'p-b' });
    expect(isAlive(g, 'p-b')).toBe(false);
  });
  it('descartar tu propia Princesa te elimina', () => {
    const g = base({ 'p-a': ['princess', 'guard'], 'p-b': ['baron'], 'p-c': ['handmaid'] });
    playCard(g, 'p-a', 0, {});
    expect(isAlive(g, 'p-a')).toBe(false);
  });
});

describe('Rey y Condesa', () => {
  it('el Rey intercambia manos', () => {
    const g = base({ 'p-a': ['king', 'guard'], 'p-b': ['baron'], 'p-c': ['handmaid'] });
    playCard(g, 'p-a', 0, { target: 'p-b' }); // p-a tenía Guardia tras jugar Rey; intercambia con Barón de p-b
    expect(g.hands['p-a'][0]).toBe('baron');
    expect(g.hands['p-b'][0]).toBe('guard');
  });
  it('la Condesa es forzada con el Rey o el Príncipe', () => {
    expect(countessForced(['countess', 'king'])).toBe(true);
    expect(countessForced(['countess', 'guard'])).toBe(false);
    const g = base({ 'p-a': ['countess', 'prince'], 'p-b': ['guard'], 'p-c': ['guard'] });
    expect(playableIdx(g, 'p-a')).toEqual([0]); // solo la Condesa
    expect(playCard(g, 'p-a', 1, { target: 'p-b' })).toBe(false); // no puede jugar el Príncipe
  });
});

describe('fin de ronda', () => {
  it('último en pie gana la ronda y suma favor', () => {
    const g = base({ 'p-a': ['guard', 'priest'], 'p-b': ['baron'], 'p-c': ['guard'] },
      { alive: { 'p-a': true, 'p-b': true, 'p-c': false } });
    playCard(g, 'p-a', 0, { target: 'p-b', guess: 'baron' }); // elimina a p-b → queda p-a
    expect(aliveIds(g)).toEqual(['p-a']);
    expect(g.tokens['p-a']).toBe(1);
    expect(['roundEnd', 'end']).toContain(g.phase);
  });
  it('alcanzar los favores gana la partida', () => {
    const g = base({ 'p-a': ['guard', 'priest'], 'p-b': ['baron'], 'p-c': ['guard'] },
      { alive: { 'p-a': true, 'p-b': true, 'p-c': false }, tokens: { 'p-a': 4, 'p-b': 0, 'p-c': 0 }, need: 5 });
    playCard(g, 'p-a', 0, { target: 'p-b', guess: 'baron' });
    expect(g.phase).toBe('end');
    expect(g.winner).toBe('p-a');
  });
});

describe('mazo agotado', () => {
  it('destapa todas las manos y explica el desempate por suma de descartes', () => {
    // Los dos vivos empatan a Rey; p-c ya ha descartado más valor.
    const g = base({ 'p-a': ['king', 'guard'], 'p-b': ['handmaid'], 'p-c': ['king'] }, {
      deck: [], alive: { 'p-a': true, 'p-b': true, 'p-c': true },
      discards: { 'p-a': [], 'p-b': [], 'p-c': ['princess'] },
    });
    playCard(g, 'p-a', 1, { target: 'p-b', guess: 'handmaid' }); // elimina a p-b y agota el mazo
    const diario = g.log.map((l) => l.txt).join('\n');
    expect(diario).toContain('todos enseñan su carta');
    expect(g.roundResult?.winner).toBe('p-c'); // 8 de descartes contra 1
    expect(g.roundResult?.reason).toContain('suma de descartes');
    expect(g.roundResult?.reveal).toEqual([{ pid: 'p-a', card: 'king' }, { pid: 'p-c', card: 'king' }]);
  });
  it('si también empatan en descartes gana quien va antes en la mesa, y lo dice', () => {
    const g = base({ 'p-a': ['king', 'guard'], 'p-b': ['handmaid'], 'p-c': ['king'] },
      { deck: [], discards: { 'p-a': [], 'p-b': [], 'p-c': ['guard'] } });
    playCard(g, 'p-a', 1, { target: 'p-b', guess: 'handmaid' });
    expect(g.roundResult?.winner).toBe('p-a');
    expect(g.roundResult?.reason).toContain('gana quien va antes en la mesa');
  });
});

describe('retirada de un ausente', () => {
  it('el máster lo saca de la ronda y el turno avanza', () => {
    const g = base({ 'p-a': ['guard', 'priest'], 'p-b': ['baron'], 'p-c': ['handmaid'] });
    expect(dropOut(g, 'p-a')).toBe(true); // era su turno
    expect(isAlive(g, 'p-a')).toBe(false);
    expect(g.turn).toBe('p-b');
    expect(g.discards['p-a']).toEqual(['guard', 'priest']); // su mano se descarta
  });
  it('retirar a quien no tiene el turno no se lo roba a nadie', () => {
    const g = base({ 'p-a': ['guard', 'priest'], 'p-b': ['baron'], 'p-c': ['handmaid'] });
    dropOut(g, 'p-c');
    expect(g.turn).toBe('p-a');
    expect(g.phase).toBe('turn');
  });
});

it('outCounts cuenta lo que ya ha salido (descartes + boca arriba)', () => {
  const g = base({ 'p-a': ['guard'] }, {
    discards: { 'p-a': ['guard', 'guard'], 'p-b': ['princess'], 'p-c': [] },
    asideUp: ['guard'],
  });
  expect(outCounts(g).guard).toBe(3);
  expect(outCounts(g).princess).toBe(1);
  expect(outCounts(g).king).toBe(0);
});

it('startRound reparte y da el turno con 2 cartas al starter', () => {
  const g = base({}, { starter: 'p-b' });
  startRound(g, 99);
  expect(g.turn).toBe('p-b');
  expect(g.hands['p-b']).toHaveLength(2);
  expect(g.hands['p-a']).toHaveLength(1);
  expect(MIN_PLAYERS).toBe(2);
});
