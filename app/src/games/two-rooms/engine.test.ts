import { describe, it, expect } from 'vitest';
import {
  dealGame, roomMembers, allVotedInRoom, tallyRoom, decideWinner, minutesForRound,
  presidentId, bomberId, narrates, MIN_PLAYERS, MAX_PLAYERS, TOTAL_ROUNDS,
} from './engine';
import type { TwoRoomsState } from './types';

const IDS = ['p-a', 'p-b', 'p-c', 'p-d', 'p-e', 'p-f'];

function base(over: Partial<TwoRoomsState> = {}): TwoRoomsState {
  return {
    tworooms: true, phase: 'hostages', startedAt: 0, seed: 1, round: 1, totalRounds: 3,
    playerIds: IDS.slice(), names: Object.fromEntries(IDS.map((id) => [id, id.toUpperCase()])),
    voiceMode: 'single', roomSpeakers: ['p-a', null],
    teams: { 'p-a': 'blue', 'p-b': 'blue', 'p-c': 'blue', 'p-d': 'red', 'p-e': 'red', 'p-f': 'red' },
    roles: { 'p-a': 'president', 'p-b': 'none', 'p-c': 'none', 'p-d': 'bomber', 'p-e': 'none', 'p-f': 'none' },
    room: { 'p-a': 0, 'p-b': 0, 'p-c': 0, 'p-d': 1, 'p-e': 1, 'p-f': 1 },
    seen: {}, durationMs: 1000, deadline: null, hVotes: {}, pick: [null, null], swaps: [],
    winner: null, scores: {}, log: [],
    ...over,
  };
}

describe('dealGame', () => {
  it('reparte bandos casi a la par (azul se lleva el impar) con Presidente azul y Bombardero rojo', () => {
    const d = dealGame(IDS, 123);
    const blues = IDS.filter((p) => d.teams[p] === 'blue');
    const reds = IDS.filter((p) => d.teams[p] === 'red');
    expect(blues).toHaveLength(3);
    expect(reds).toHaveLength(3);
    expect(d.teams[d.presidentId]).toBe('blue');
    expect(d.teams[d.bomberId]).toBe('red');
    expect(d.roles[d.presidentId]).toBe('president');
    expect(d.roles[d.bomberId]).toBe('bomber');
  });
  it('reparte las salas a la par e independientes del bando', () => {
    const d = dealGame(IDS, 77);
    const r0 = IDS.filter((p) => d.room[p] === 0);
    expect(r0).toHaveLength(3); // ceil(6/2)
  });
  it('con 7 jugadores, azul y la sala 0 se llevan el sobrante', () => {
    const ids7 = [...IDS, 'p-g'];
    const d = dealGame(ids7, 5);
    expect(ids7.filter((p) => d.teams[p] === 'blue')).toHaveLength(4);
    expect(ids7.filter((p) => d.room[p] === 0)).toHaveLength(4);
  });
});

describe('tallyRoom', () => {
  it('elige al más votado por los de su sala', () => {
    const g = base({ hVotes: { 'p-a': 'p-b', 'p-b': 'p-b', 'p-c': 'p-a' } });
    expect(tallyRoom(g, 0)).toBe('p-b'); // p-b: 2, p-a: 1
  });
  it('no cuenta votos a gente de la otra sala', () => {
    const g = base({ hVotes: { 'p-a': 'p-d', 'p-b': 'p-c', 'p-c': 'p-c' } });
    expect(tallyRoom(g, 0)).toBe('p-c'); // el voto a p-d (sala 1) no cuenta
  });
  it('empate en cabeza → el primero por orden de mesa', () => {
    const g = base({ hVotes: { 'p-a': 'p-b', 'p-b': 'p-a', 'p-c': 'p-c' } });
    expect(tallyRoom(g, 0)).toBe('p-a'); // triple empate a 1 → p-a
  });
});

describe('allVotedInRoom', () => {
  it('exige el voto de todos los de la sala', () => {
    const g = base({ hVotes: { 'p-a': 'p-b', 'p-b': 'p-b' } });
    expect(allVotedInRoom(g, 0)).toBe(false);
    g.hVotes['p-c'] = 'p-a';
    expect(allVotedInRoom(g, 0)).toBe(true);
  });
});

describe('decideWinner', () => {
  it('rojo si el Bombardero acaba en la sala del Presidente', () => {
    const g = base({ room: { 'p-a': 0, 'p-b': 0, 'p-c': 0, 'p-d': 0, 'p-e': 1, 'p-f': 1 } });
    expect(decideWinner(g)).toBe('red');
  });
  it('azul si el Bombardero acaba en la otra sala', () => {
    const g = base(); // presidente sala 0, bombardero sala 1
    expect(decideWinner(g)).toBe('blue');
  });
});

describe('narrates (modos de voz)', () => {
  const master = 'p-a';
  it('single: solo narra el altavoz principal (masterId)', () => {
    const g = base({ voiceMode: 'single' });
    expect(narrates(g, 'p-a', master)).toBe(true);
    expect(narrates(g, 'p-c', master)).toBe(false);
  });
  it('perRoom: narran los dos altavoces designados', () => {
    const g = base({ voiceMode: 'perRoom', roomSpeakers: ['p-a', 'p-d'] });
    expect(narrates(g, 'p-a', master)).toBe(true);
    expect(narrates(g, 'p-d', master)).toBe(true);
    expect(narrates(g, 'p-b', master)).toBe(false);
  });
  it('all: narran todos los jugadores', () => {
    const g = base({ voiceMode: 'all' });
    for (const pid of g.playerIds) expect(narrates(g, pid, master)).toBe(true);
  });
});

describe('utilidades', () => {
  it('el reloj de la última ronda es el más corto', () => {
    expect(minutesForRound(1, 3)).toBe(3);
    expect(minutesForRound(2, 3)).toBe(2);
    expect(minutesForRound(3, 3)).toBe(1);
  });
  it('localiza al Presidente y al Bombardero', () => {
    const g = base();
    expect(presidentId(g)).toBe('p-a');
    expect(bomberId(g)).toBe('p-d');
    expect(roomMembers(g, 0)).toEqual(['p-a', 'p-b', 'p-c']);
  });
  it('rangos', () => {
    expect(MIN_PLAYERS).toBe(6);
    expect(MAX_PLAYERS).toBe(30);
    expect(TOTAL_ROUNDS).toBe(3);
  });
});
