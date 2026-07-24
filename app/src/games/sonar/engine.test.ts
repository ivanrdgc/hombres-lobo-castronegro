import { describe, it, expect } from 'vitest';
import {
  dealGame, move, silence, torpedo, drone, surface, legalDirs, torpedoTargets, teamOf, canAct,
  narrates, MIN_PLAYERS, MAX_HP, MAX_ENERGY, COST_TORPEDO, COST_DRONE, COST_SILENCE,
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
