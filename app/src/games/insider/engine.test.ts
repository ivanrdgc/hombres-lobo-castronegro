import { describe, it, expect } from 'vitest';
import { dealRound, tallyVotes, allVoted, roleOf, WIN_LABELS } from './engine';
import { WORDS } from './words';
import type { InsiderState } from './types';

const IDS = ['p-a', 'p-b', 'p-c', 'p-d'];

function base(over: Partial<InsiderState> = {}): InsiderState {
  return {
    insider: true, phase: 'vote', startedAt: 0, seed: 1, round: 1,
    playerIds: IDS.slice(), names: { 'p-a': 'A', 'p-b': 'B', 'p-c': 'C', 'p-d': 'D' },
    word: 'Faro', masterId: 'p-a', insiderId: 'p-b', seen: {}, starterIdx: 0,
    durationMs: 1000, deadline: null, guessedAt: null, votes: {}, accusedId: null,
    outcome: null, scores: {}, usedWords: ['Faro'], log: [],
    ...over,
  };
}

describe('dealRound', () => {
  it('el Maestro rota por rondas y nunca es el Insider', () => {
    for (let r = 1; r <= 8; r++) {
      const d = dealRound(IDS, r, [], 123 + r);
      expect(d.masterId).toBe(IDS[(r - 1) % IDS.length]);
      expect(d.insiderId).not.toBe(d.masterId);
      expect(IDS).toContain(d.insiderId);
    }
  });

  it('reparte una palabra válida del corpus, evitando las ya usadas', () => {
    const used = WORDS.slice(0, WORDS.length - 1); // solo queda 1 sin usar
    const d = dealRound(IDS, 1, used, 42);
    expect(d.word).toBe(WORDS[WORDS.length - 1]);
  });

  it('agotado el mazo, rebaraja sin repetir la última palabra', () => {
    const used = WORDS.slice();
    const last = used[used.length - 1];
    const d = dealRound(IDS, 2, used, 7);
    expect(WORDS).toContain(d.word);
    expect(d.word).not.toBe(last);
  });

  it('starterIdx cae dentro de la mesa', () => {
    const d = dealRound(IDS, 1, [], 99);
    expect(d.starterIdx).toBeGreaterThanOrEqual(0);
    expect(d.starterIdx).toBeLessThan(IDS.length);
  });
});

describe('tallyVotes', () => {
  it('señala por mayoría estricta', () => {
    const g = base({ votes: { 'p-a': 'p-b', 'p-c': 'p-b', 'p-d': 'p-b', 'p-b': 'p-c' } });
    expect(tallyVotes(g).accusedId).toBe('p-b'); // p-b: 3, p-c: 1 (el máster p-a también vota)
  });

  it('empate en cabeza → nadie señalado', () => {
    const g = base({ votes: { 'p-a': 'p-b', 'p-c': 'p-c', 'p-d': 'p-b', 'p-b': 'p-c' } });
    expect(tallyVotes(g).accusedId).toBeNull(); // p-b y p-c empatan a 2
  });

  it('no cuenta votos al Maestro (es público) ni fuera de la mesa', () => {
    const g = base({ votes: { 'p-b': 'p-a', 'p-c': 'p-a', 'p-d': 'zzz' } });
    expect(tallyVotes(g).accusedId).toBeNull(); // solo hubo votos al máster / inválidos
  });
});

describe('allVoted', () => {
  it('exige el voto de todos, también del Maestro', () => {
    const g = base({ votes: { 'p-a': 'p-b', 'p-b': 'p-c', 'p-c': 'p-b' } });
    expect(allVoted(g)).toBe(false);
    g.votes['p-d'] = 'p-b';
    expect(allVoted(g)).toBe(true);
  });
});

describe('roleOf', () => {
  it('distingue Maestro, Insider y común', () => {
    const g = base();
    expect(roleOf(g, 'p-a')).toBe('master');
    expect(roleOf(g, 'p-b')).toBe('insider');
    expect(roleOf(g, 'p-c')).toBe('common');
  });
});

describe('WIN_LABELS', () => {
  it('cubre los tres desenlaces', () => {
    expect(WIN_LABELS.group).toBeTruthy();
    expect(WIN_LABELS.insider).toBeTruthy();
    expect(WIN_LABELS.timeout).toBeTruthy();
  });
});
