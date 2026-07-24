import { describe, it, expect } from 'vitest';
import {
  dealGame, move, silence, silenceSteps, torpedo, drone, surface, legalDirs, torpedoTargets,
  teamOf, canAct, narrates, resetForRematch, splitSpeakers,
  MIN_PLAYERS, MAX_HP, MAX_ENERGY, COST_TORPEDO, COST_DRONE, COST_SILENCE,
} from './engine';
import { isIsland, manhattan, cellName, quadrantOf } from './map';
import type { SonarState } from './types';

const IDS = ['p-a', 'p-b', 'p-c', 'p-d'];

function base(over: Partial<SonarState> = {}): SonarState {
  return {
    sonar: true, phase: 'turn', startedAt: 0, seed: 7,
    playerIds: IDS.slice(), names: Object.fromEntries(IDS.map((id) => [id, id.toUpperCase()])),
    teams: { red: ['p-a', 'p-c'], blue: ['p-b', 'p-d'] },
    subs: {
      red: { pos: { x: 1, y: 3 }, trail: [], hp: MAX_HP, energy: 0 },
      blue: { pos: { x: 6, y: 4 }, trail: [], hp: MAX_HP, energy: 0 },
    },
    turnTeam: 'red', moves: { red: [], blue: [] },
    voiceMode: 'single', teamSpeakers: ['p-a', null],
    winner: null, winReason: null, scores: {}, log: [],
    ...over,
  };
}

describe('reparto', () => {
  it('parte en dos tripulaciones y coloca los submarinos lejos y fuera de islas', () => {
    const d = dealGame(IDS, 42);
    expect(d.teams.red.length).toBe(2);
    expect(d.teams.blue.length).toBe(2);
    expect(isIsland(d.subs.red.pos)).toBe(false);
    expect(isIsland(d.subs.blue.pos)).toBe(false);
    expect(d.subs.red.pos.x).toBeLessThan(3);
    expect(d.subs.blue.pos.x).toBeGreaterThan(4);
    expect(manhattan(d.subs.red.pos, d.subs.blue.pos)).toBeGreaterThanOrEqual(3);
  });
});

describe('navegar', () => {
  it('anuncia el rumbo, deja estela, gana energía y pasa el turno', () => {
    const g = base();
    expect(move(g, 'p-a', 'E')).toBe(true);
    expect(g.subs.red.pos).toEqual({ x: 2, y: 3 });
    expect(g.subs.red.trail).toEqual([{ x: 1, y: 3 }]);
    expect(g.subs.red.energy).toBe(1);
    expect(g.moves.red).toEqual(['E']);
    expect(g.turnTeam).toBe('blue');
    expect(g.log[g.log.length - 1].txt).toContain('navega al Este');
  });
  it('no puedes cruzar islas, bordes ni tu propia estela', () => {
    const g = base();
    // (1,3)→E→(2,3); volver W a (1,3) está en la estela.
    move(g, 'p-a', 'E'); g.turnTeam = 'red';
    expect(move(g, 'p-a', 'W')).toBe(false);
    expect(legalDirs(g, 'red')).not.toContain('W');
    // Isla en (2,2): desde (2,3), N es ilegal.
    expect(legalDirs(g, 'red')).not.toContain('N');
    // Bordes: desde (0,0), ni N ni W.
    const g2 = base({ subs: { ...base().subs, red: { pos: { x: 0, y: 0 }, trail: [], hp: 3, energy: 0 } } });
    expect(legalDirs(g2, 'red').sort()).toEqual(['E', 'S']);
  });
  it('solo actúa la tripulación del submarino de turno (cualquiera de ella)', () => {
    const g = base();
    expect(canAct(g, 'p-b')).toBe(false); // azul, no le toca
    expect(move(g, 'p-b', 'W')).toBe(false);
    expect(canAct(g, 'p-c')).toBe(true); // rojo, cualquiera de los dos
    expect(teamOf(g, 'p-c')).toBe('red');
  });
});

describe('sistemas', () => {
  it('el torpedo exige energía y alcance; impacto directo 2, onda 1, agua 0', () => {
    const g = base();
    expect(torpedo(g, 'p-a', { x: 3, y: 3 })).toBe(false); // sin energía
    g.subs.red.energy = COST_TORPEDO;
    expect(torpedo(g, 'p-a', { x: 6, y: 4 })).toBe(false); // fuera de alcance (dist 6)
    g.subs.blue.pos = { x: 3, y: 3 };
    expect(torpedo(g, 'p-a', { x: 3, y: 3 })).toBe(true); // directo (dist 2)
    expect(g.subs.blue.hp).toBe(MAX_HP - 2);
    expect(g.subs.red.energy).toBe(0);
    expect(g.log[g.log.length - 1].txt).toContain('IMPACTO DIRECTO');
  });
  it('la onda expansiva roza a los adyacentes… incluido tu propio submarino', () => {
    const g = base();
    g.subs.red.energy = COST_TORPEDO;
    g.subs.blue.pos = { x: 3, y: 3 };
    expect(torpedo(g, 'p-a', { x: 2, y: 4 })).toBe(true); // adyacente a ambos (diagonal)
    expect(g.subs.blue.hp).toBe(MAX_HP - 1);
    expect(g.subs.red.hp).toBe(MAX_HP - 1);
  });
  it('hundir al rival gana la partida (y hundirte tú se la da a él)', () => {
    const g = base();
    g.subs.red.energy = COST_TORPEDO;
    g.subs.blue.pos = { x: 3, y: 3 };
    g.subs.blue.hp = 2;
    expect(torpedo(g, 'p-a', { x: 3, y: 3 })).toBe(true);
    expect(g.phase).toBe('end');
    expect(g.winner).toBe('red');
    expect(g.scores['p-a']).toBe(1);
    expect(g.scores['p-c']).toBe(1);
    expect(g.scores['p-b']).toBeUndefined();
    expect(g.log.some((l) => /Posiciones finales/.test(l.txt))).toBe(true);
    // Autohundimiento: pierde quien dispara.
    const g2 = base();
    g2.subs.red.energy = COST_TORPEDO;
    g2.subs.red.hp = 1;
    g2.subs.blue.pos = { x: 6, y: 6 };
    expect(torpedo(g2, 'p-a', { x: 2, y: 3 })).toBe(true); // pegado a sí mismo
    expect(g2.winner).toBe('blue');
  });
  it('si un torpedo hunde a los DOS, gana el que no disparó (no hay empate)', () => {
    const g = base();
    g.subs.red.energy = COST_TORPEDO;
    g.subs.red.hp = 1;
    g.subs.blue.pos = { x: 2, y: 3 }; // pegado al Rojo
    g.subs.blue.hp = 2;
    expect(torpedo(g, 'p-a', { x: 2, y: 3 })).toBe(true); // directo al Azul, onda al Rojo
    expect(g.subs.red.hp).toBe(0);
    expect(g.subs.blue.hp).toBe(0);
    expect(g.winner).toBe('blue'); // lo que promete la ayuda: no gana quien se acaba de hundir
    expect(g.winReason).toMatch(/su propio torpedo/);
    expect(g.scores['p-b']).toBe(1);
    expect(g.scores['p-a']).toBeUndefined();
  });
  it('el diario no concatena «de el»/«a el» tras preposición', () => {
    const g = base();
    g.subs.red.energy = MAX_ENERGY;
    move(g, 'p-a', 'E'); g.turnTeam = 'red';
    drone(g, 'p-a'); g.turnTeam = 'red';
    g.subs.blue.pos = { x: 4, y: 4 }; // a 3 de recorrido y a 2 de la onda: no se roza solo
    torpedo(g, 'p-a', { x: 4, y: 4 });
    const todo = g.log.map((l) => l.txt).join(' | ');
    expect(todo).not.toMatch(/\b(de|a) el submarino/);
    expect(todo).toMatch(/Torpedo del submarino/);
    expect(todo).toMatch(/Dron del submarino/);
  });
  it('el dron canta el cuadrante REAL del rival y gasta energía', () => {
    const g = base();
    g.subs.red.energy = COST_DRONE;
    expect(drone(g, 'p-a')).toBe(true);
    expect(g.subs.red.energy).toBe(0);
    expect(g.log[g.log.length - 1].txt).toContain(quadrantOf(g.subs.blue.pos));
  });
  it('el silencio mueve sin anunciar rumbo y sin ganar energía', () => {
    const g = base();
    g.subs.red.energy = COST_SILENCE;
    expect(silence(g, 'p-a', 'S')).toBe(true);
    expect(g.subs.red.pos).toEqual({ x: 1, y: 4 });
    expect(g.subs.red.energy).toBe(0);
    expect(g.moves.red).toEqual(['silence']);
    expect(g.log[g.log.length - 1].txt).not.toMatch(/Norte|Sur|Este|Oeste/);
  });
  it('el silencio puede recorrer 2 casillas (y las atravesadas quedan de estela)', () => {
    const g = base(); // Rojo en (1,3)
    g.subs.red.energy = COST_SILENCE;
    expect(silenceSteps(g, 'red', 'E')).toBe(2); // (2,3) y (3,3), agua las dos
    expect(silence(g, 'p-a', 'E', 3)).toBe(false); // más de 2, nunca
    expect(silence(g, 'p-a', 'E', 2)).toBe(true);
    expect(g.subs.red.pos).toEqual({ x: 3, y: 3 });
    expect(g.subs.red.trail).toEqual([{ x: 1, y: 3 }, { x: 2, y: 3 }]);
    expect(g.subs.red.energy).toBe(0);
    expect(g.moves.red).toEqual(['silence']); // la mesa no sabe ni el rumbo ni cuánto
  });
  it('el silencio respeta islas, bordes y estela (y no mueve si no cabe)', () => {
    const g = base({ subs: { ...base().subs, red: { pos: { x: 1, y: 1 }, trail: [], hp: 3, energy: COST_SILENCE } } });
    expect(silenceSteps(g, 'red', 'E')).toBe(0); // isla en (2,1)
    expect(silence(g, 'p-a', 'E')).toBe(false);
    expect(silenceSteps(g, 'red', 'N')).toBe(1); // (1,0) sí; más allá, borde
    expect(silence(g, 'p-a', 'N', 2)).toBe(false);
    expect(silence(g, 'p-a', 'N')).toBe(true);
    expect(g.subs.red.pos).toEqual({ x: 1, y: 0 });
  });
  it('emerger siempre es legal: borra la estela y canta el cuadrante', () => {
    const g = base();
    move(g, 'p-a', 'E'); g.turnTeam = 'red';
    expect(g.subs.red.trail.length).toBe(1);
    expect(surface(g, 'p-a')).toBe(true);
    expect(g.subs.red.trail).toEqual([]);
    expect(g.moves.red).toEqual(['E', 'surface']);
    expect(g.log[g.log.length - 1].txt).toContain('emerge en el cuadrante');
  });
  it('la energía tiene tope y los objetivos de torpedo excluyen islas', () => {
    const g = base();
    g.subs.red.energy = MAX_ENERGY;
    move(g, 'p-a', 'S');
    expect(g.subs.red.energy).toBe(MAX_ENERGY);
    expect(torpedoTargets(g, 'red').every((c) => !isIsland(c) && manhattan(g.subs.red.pos, c) <= 4)).toBe(true);
  });
});

describe('revancha y altavoces', () => {
  it('«Otra partida» conserva las tripulaciones y solo recoloca los submarinos', () => {
    const g = base();
    g.subs.red = { pos: { x: 3, y: 3 }, trail: [{ x: 1, y: 3 }], hp: 1, energy: 4 };
    g.phase = 'end'; g.winner = 'blue'; g.moves.red = ['E', 'silence'];
    g.scores = { 'p-b': 1, 'p-d': 1 };
    const teamsAntes = JSON.parse(JSON.stringify(g.teams));
    resetForRematch(g, 108);
    expect(g.teams).toEqual(teamsAntes); // nadie cambia de corro (ni de altavoz)
    expect(g.phase).toBe('turn');
    expect(g.winner).toBeNull();
    expect(g.moves).toEqual({ red: [], blue: [] });
    expect(g.subs.red.hp).toBe(MAX_HP);
    expect(g.subs.red.energy).toBe(0);
    expect(g.subs.red.trail).toEqual([]);
    expect(g.subs.red.pos.x).toBeLessThan(3);
    expect(g.subs.blue.pos.x).toBeGreaterThan(4);
    expect(g.scores).toEqual({ 'p-b': 1, 'p-d': 1 }); // el marcador se acumula
  });
  it('con un altavoz por corro, los dos acaban en tripulaciones distintas', () => {
    const teams = { red: ['p-a', 'p-b'], blue: ['p-c', 'p-d'] };
    expect(splitSpeakers(teams, 'p-a', 'p-b')).toBe(true);
    expect(teams.red.includes('p-a')).toBe(true);
    expect(teams.blue.includes('p-b')).toBe(true);
    expect(teams.red.length).toBe(2); // los tamaños no cambian
    expect(teams.blue.length).toBe(2);
    expect([...teams.red, ...teams.blue].sort()).toEqual(['p-a', 'p-b', 'p-c', 'p-d']);
    // Ya separados o altavoz que no juega: no se toca nada.
    const ok = { red: ['p-a'], blue: ['p-b'] };
    expect(splitSpeakers(ok, 'p-a', 'p-b')).toBe(false);
    expect(splitSpeakers(ok, 'p-a', 'narrador-fuera')).toBe(false);
    expect(ok).toEqual({ red: ['p-a'], blue: ['p-b'] });
  });
});

it('narrates delega en el modo de voz compartido', () => {
  const g = base();
  expect(narrates(g, 'p-a', 'p-a')).toBe(true);
  expect(narrates(g, 'p-b', 'p-a')).toBe(false);
  g.voiceMode = 'perRoom'; g.teamSpeakers = ['p-a', 'p-b'];
  expect(narrates(g, 'p-b', 'p-a')).toBe(true);
  expect(narrates(g, 'p-c', 'p-a')).toBe(false);
  g.voiceMode = 'all';
  expect(narrates(g, 'p-d', 'p-a')).toBe(true);
  expect(MIN_PLAYERS).toBe(2);
  expect(cellName({ x: 4, y: 4 })).toBe('E5');
});
