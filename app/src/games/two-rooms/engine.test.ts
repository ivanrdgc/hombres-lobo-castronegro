import { describe, it, expect } from 'vitest';
import {
  dealGame, roomMembers, allVotedInRoom, majorityVotedInRoom, pendingInRoom, hostagesPerRoom,
  tallyRoom, decideWinner, minutesForRound, roundsFor, nameList, rebalanceSpeakers,
  presidentId, bomberId, narrates, leavePlayer, MIN_PLAYERS, MAX_PLAYERS,
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
    seen: {}, durationMs: 1000, deadline: null, hVotes: {}, picks: { 0: null, 1: null }, swaps: [],
    winner: null, winReason: null, scores: {}, log: [],
    ...over,
  };
}

/** Mesa de n jugadores repartida a la par entre las dos salas. */
function bigTable(n: number, over: Partial<TwoRoomsState> = {}): TwoRoomsState {
  const ids = Array.from({ length: n }, (_, i) => `q-${i}`);
  const half = Math.ceil(n / 2);
  return base({
    playerIds: ids,
    names: Object.fromEntries(ids.map((id) => [id, id])),
    teams: Object.fromEntries(ids.map((id, i) => [id, i < half ? 'blue' : 'red'])) as TwoRoomsState['teams'],
    roles: Object.fromEntries(ids.map((id, i) => [id, i === 0 ? 'president' : i === half ? 'bomber' : 'none'])) as TwoRoomsState['roles'],
    room: Object.fromEntries(ids.map((id, i) => [id, i < half ? 0 : 1])) as TwoRoomsState['room'],
    ...over,
  });
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
    expect(tallyRoom(g, 0)).toEqual(['p-b']); // p-b: 2, p-a: 1
  });
  it('no cuenta votos a gente de la otra sala', () => {
    const g = base({ hVotes: { 'p-a': 'p-d', 'p-b': 'p-c', 'p-c': 'p-c' } });
    expect(tallyRoom(g, 0)).toEqual(['p-c']); // el voto a p-d (sala 1) no cuenta
  });
  it('empate en cabeza → el primero por orden de mesa', () => {
    const g = base({ hVotes: { 'p-a': 'p-b', 'p-b': 'p-a', 'p-c': 'p-c' } });
    expect(tallyRoom(g, 0)).toEqual(['p-a']); // triple empate a 1 → p-a
  });
  it('con k rehenes devuelve los k más votados, en orden', () => {
    const g = base({ hVotes: { 'p-a': 'p-c', 'p-b': 'p-c', 'p-c': 'p-b' } });
    expect(tallyRoom(g, 0, 2)).toEqual(['p-c', 'p-b']);
  });
  it('si la sala concentró los votos en menos de k, completa por orden de mesa', () => {
    const g = base({ hVotes: { 'p-a': 'p-c', 'p-b': 'p-c', 'p-c': 'p-c' } });
    expect(tallyRoom(g, 0, 2)).toEqual(['p-c', 'p-a']);
  });
  it('nunca devuelve más gente de la que hay en la sala', () => {
    const g = base();
    expect(tallyRoom(g, 0, 9)).toHaveLength(3);
  });
});

describe('rondas y rehenes escalan con la mesa', () => {
  it('hasta 10 jugadores, 3 rondas de 3, 2 y 1 minutos', () => {
    expect(roundsFor(6)).toBe(3);
    expect(roundsFor(10)).toBe(3);
    expect([1, 2, 3].map((r) => minutesForRound(r, 3))).toEqual([3, 2, 1]);
  });
  it('de 11 en adelante, 5 rondas de 5, 4, 3, 2 y 1 minutos', () => {
    expect(roundsFor(11)).toBe(5);
    expect(roundsFor(30)).toBe(5);
    expect([1, 2, 3, 4, 5].map((r) => minutesForRound(r, 5))).toEqual([5, 4, 3, 2, 1]);
  });
  it('rehenes: uno de cada cuatro de la sala, mínimo uno', () => {
    expect(hostagesPerRoom(base())).toBe(1); // salas de 3
    expect(hostagesPerRoom(bigTable(14))).toBe(2); // salas de 7
    expect(hostagesPerRoom(bigTable(20))).toBe(3); // salas de 10
    expect(hostagesPerRoom(bigTable(30))).toBe(4); // salas de 15
  });
  it('con salas desiguales manda la pequeña (el trueque no descompensa las salas)', () => {
    expect(hostagesPerRoom(bigTable(9))).toBe(1); // salas de 5 y 4
  });
});

describe('cierre del voto de rehén', () => {
  it('allVotedInRoom exige el voto de todos los de la sala', () => {
    const g = base({ hVotes: { 'p-a': 'p-b', 'p-b': 'p-b' } });
    expect(allVotedInRoom(g, 0)).toBe(false);
    g.hVotes['p-c'] = 'p-a';
    expect(allVotedInRoom(g, 0)).toBe(true);
  });
  it('la mayoría basta para poder cerrar a mano (móvil muerto)', () => {
    const g = base({ hVotes: { 'p-a': 'p-b' } });
    expect(majorityVotedInRoom(g, 0)).toBe(false); // 1 de 3
    g.hVotes['p-b'] = 'p-b';
    expect(majorityVotedInRoom(g, 0)).toBe(true); // 2 de 3
  });
  it('se sabe a quién se espera en cada sala', () => {
    const g = base({ hVotes: { 'p-a': 'p-b' } });
    expect(pendingInRoom(g, 0)).toEqual(['p-b', 'p-c']);
  });
});

describe('nameList', () => {
  it('enumera en castellano', () => {
    const g = base();
    expect(nameList(g, [])).toBe('nadie');
    expect(nameList(g, ['p-a'])).toBe('P-A');
    expect(nameList(g, ['p-a', 'p-b'])).toBe('P-A y P-B');
    expect(nameList(g, ['p-a', 'p-b', 'p-c'])).toBe('P-A, P-B y P-C');
  });
});

describe('rebalanceSpeakers (la voz de cada sala)', () => {
  it('el altavoz jugador que cruza se lleva la voz a su nueva sala', () => {
    // p-a (voz de la sala 1) acaba en la sala 2 y p-d (voz de la 2) en la 1.
    const g = base({
      voiceMode: 'perRoom', roomSpeakers: ['p-a', 'p-d'],
      room: { 'p-a': 1, 'p-b': 0, 'p-c': 0, 'p-d': 0, 'p-e': 1, 'p-f': 1 },
    });
    rebalanceSpeakers(g);
    expect(g.roomSpeakers).toEqual(['p-d', 'p-a']);
  });
  it('si las dos voces acaban en la misma sala, la otra sala toma una nueva', () => {
    const g = base({
      voiceMode: 'perRoom', roomSpeakers: ['p-a', 'p-d'],
      room: { 'p-a': 0, 'p-b': 0, 'p-c': 0, 'p-d': 0, 'p-e': 1, 'p-f': 1 },
    });
    rebalanceSpeakers(g);
    expect(g.roomSpeakers[0]).toBe('p-a');
    expect(['p-e', 'p-f']).toContain(g.roomSpeakers[1]); // la sala 2 no se queda muda
  });
  it('un altavoz que NO juega se queda clavado en su sala', () => {
    const g = base({ voiceMode: 'perRoom', roomSpeakers: ['tele-1', 'p-d'] });
    rebalanceSpeakers(g);
    expect(g.roomSpeakers[0]).toBe('tele-1');
    expect(g.roomSpeakers[1]).toBe('p-d');
  });
  it('en los demás modos de voz no toca nada', () => {
    const g = base({ voiceMode: 'single', roomSpeakers: ['p-a', null] });
    rebalanceSpeakers(g);
    expect(g.roomSpeakers).toEqual(['p-a', null]);
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
  it('localiza al Presidente y al Bombardero', () => {
    const g = base();
    expect(presidentId(g)).toBe('p-a');
    expect(bomberId(g)).toBe('p-d');
    expect(roomMembers(g, 0)).toEqual(['p-a', 'p-b', 'p-c']);
  });
  it('rangos', () => {
    expect(MIN_PLAYERS).toBe(6);
    expect(MAX_PLAYERS).toBe(30);
  });
});

describe('leavePlayer (salidas a mitad de partida)', () => {
  it('un altavoz que no juega no toca el estado', () => {
    const g = base();
    expect(leavePlayer(g, 'p-x')).toBe('not-player');
    expect(g.playerIds).toHaveLength(6);
  });
  it('en el reparto: re-reparte entre los que quedan y todos vuelven a confirmar', () => {
    const g = base({ phase: 'reveal', playerIds: [...IDS, 'p-g'], seen: { 'p-a': true } });
    g.names['p-g'] = 'P-G'; g.teams['p-g'] = 'red'; g.roles['p-g'] = 'none'; g.room['p-g'] = 1;
    expect(leavePlayer(g, 'p-g')).toBe('redeal');
    expect(g.playerIds).toHaveLength(6);
    expect(g.seen).toEqual({});
    expect(presidentId(g)).toBeTruthy();
    expect(bomberId(g)).toBeTruthy();
    expect(g.teams[presidentId(g)!]).toBe('blue');
  });
  it('en el reparto por debajo del mínimo: se disuelve sin ganador', () => {
    const g = base({ phase: 'reveal' });
    expect(leavePlayer(g, 'p-b')).toBe('dissolved');
    expect(g.phase).toBe('end');
    expect(g.winner).toBeNull();
  });
  it('si abandona el Presidente a mitad de ronda, el azul se rinde: gana el rojo', () => {
    const g = base({ phase: 'discuss', deadline: 999, playerIds: [...IDS, 'p-g'] });
    g.names['p-g'] = 'P-G'; g.teams['p-g'] = 'blue'; g.roles['p-g'] = 'none'; g.room['p-g'] = 0;
    expect(leavePlayer(g, 'p-a')).toBe('forfeit');
    expect(g.phase).toBe('end');
    expect(g.winner).toBe('red');
    expect(g.scores['p-d']).toBe(1); // el bando rojo puntúa
    expect(g.scores['p-b'] || 0).toBe(0);
    expect(g.deadline).toBeNull();
  });
  it('si abandona el Bombardero, gana el azul', () => {
    const g = base({ phase: 'hostages', playerIds: [...IDS, 'p-g'] });
    g.names['p-g'] = 'P-G'; g.teams['p-g'] = 'blue'; g.roles['p-g'] = 'none'; g.room['p-g'] = 0;
    expect(leavePlayer(g, 'p-d')).toBe('forfeit');
    expect(g.winner).toBe('blue');
    expect(g.scores['p-a']).toBe(1);
  });
  it('un jugador normal sale del voto de rehén: sus votos y los votos hacia él caen', () => {
    const g = base({
      phase: 'hostages', playerIds: [...IDS, 'p-g'],
      hVotes: { 'p-b': 'p-c', 'p-c': 'p-b', 'p-g': 'p-b' },
    });
    g.names['p-g'] = 'P-G'; g.teams['p-g'] = 'blue'; g.roles['p-g'] = 'none'; g.room['p-g'] = 0;
    expect(leavePlayer(g, 'p-b')).toBe('removed');
    expect(g.playerIds).not.toContain('p-b');
    expect(g.hVotes['p-b']).toBeUndefined(); // su voto cae
    expect(g.hVotes['p-c']).toBeUndefined(); // votaba al que se fue: vuelve a votar
    expect(g.hVotes['p-g']).toBeUndefined(); // ídem
  });
  it('si el que se va ya era el rehén elegido, su sala vuelve a quedar sin decisión', () => {
    const g = base({
      phase: 'hostages', playerIds: [...IDS, 'p-g'],
      picks: { 0: ['p-b'], 1: null }, hVotes: { 'p-a': 'p-b', 'p-b': 'p-b', 'p-c': 'p-b', 'p-g': 'p-b' },
    });
    g.names['p-g'] = 'P-G'; g.teams['p-g'] = 'blue'; g.roles['p-g'] = 'none'; g.room['p-g'] = 0;
    expect(leavePlayer(g, 'p-b')).toBe('removed');
    expect(g.picks[0]).toBeNull();
  });
  it('la rendición por abandono NO se cuenta como un BOOM', () => {
    const g = base({ phase: 'discuss', deadline: 999, playerIds: [...IDS, 'p-g'] });
    g.names['p-g'] = 'P-G'; g.teams['p-g'] = 'blue'; g.roles['p-g'] = 'none'; g.room['p-g'] = 0;
    leavePlayer(g, 'p-a'); // el Presidente
    expect(g.winReason).toContain('abandonó');
    expect(g.winReason).not.toContain('BOOM');
  });
  it('con la partida acabada solo sale del censo (sin tocar el marcador de otros)', () => {
    const g = base({ phase: 'end', winner: 'blue', scores: { 'p-a': 2, 'p-b': 1 } });
    expect(leavePlayer(g, 'p-f')).toBe('roster');
    expect(g.playerIds).toHaveLength(5);
    expect(g.scores['p-a']).toBe(2);
  });
});
