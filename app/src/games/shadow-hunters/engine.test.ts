import { describe, it, expect } from 'vitest';
import {
  dealGame, givePista, attack, rest, revealSelf, checkWin, isAlive, aliveIds, nextAlive,
  factionOf, MIN_PLAYERS, MAX_HP,
} from './engine';
import { CHARS, factionCounts, PISTAS, pistaApplies } from './chars';
import type { ShadowHState } from './types';

const IDS = ['p-a', 'p-b', 'p-c', 'p-d'];

function base(over: Partial<ShadowHState> = {}): ShadowHState {
  return {
    shadowh: true, phase: 'turn', startedAt: 0, seed: 7, rng: 0,
    playerIds: IDS.slice(), names: Object.fromEntries(IDS.map((id) => [id, id.toUpperCase()])),
    chars: { 'p-a': 'georg', 'p-b': 'franklin', 'p-c': 'vampiro', 'p-d': 'licantropo' },
    hp: Object.fromEntries(IDS.map((id) => [id, MAX_HP])),
    maxHp: MAX_HP,
    alive: Object.fromEntries(IDS.map((id) => [id, true])),
    revealed: Object.fromEntries(IDS.map((id) => [id, false])),
    powerUsed: Object.fromEntries(IDS.map((id) => [id, false])),
    turn: 'p-a', pista: null, killsBy: {},
    winner: null, winners: [], winReason: null, scores: {}, log: [],
    ...over,
  };
}

describe('reparto', () => {
  it('reparte facciones según la tabla y un personaje distinto a cada uno', () => {
    for (const n of [4, 5, 6, 7, 8]) {
      const ids = Array.from({ length: n }, (_, i) => 'p-' + i);
      const d = dealGame(ids, 42 + n);
      const counts = { hunter: 0, shadow: 0, neutral: 0 };
      for (const pid of ids) counts[CHARS[d.chars[pid]].faction]++;
      expect(counts).toEqual(factionCounts(n));
      expect(new Set(Object.values(d.chars)).size).toBe(n);
    }
  });
});

describe('acciones del turno', () => {
  it('atacar tira dados por semilla, hace |d6−d4| de daño y pasa el turno', () => {
    const g = base();
    expect(attack(g, 'p-a', 'p-c')).toBe(true);
    expect(g.turn).toBe('p-b');
    const said = g.log[g.log.length - 1].txt;
    expect(said).toMatch(/dados \d y \d/);
    // El daño registrado en el log cuadra con la vida perdida.
    const m = said.match(/→ (\d) de daño/);
    const lost = MAX_HP - g.hp['p-c'];
    expect(lost).toBe(m ? Number(m[1]) : 0);
  });
  it('no puedes atacarte a ti mismo ni actuar fuera de turno', () => {
    const g = base();
    expect(attack(g, 'p-a', 'p-a')).toBe(false);
    expect(attack(g, 'p-b', 'p-a')).toBe(false);
    expect(rest(g, 'p-c')).toBe(false);
  });
  it('descansar cura 1 sin pasar del máximo', () => {
    const g = base();
    g.hp['p-a'] = 4;
    expect(rest(g, 'p-a')).toBe(true);
    expect(g.hp['p-a']).toBe(5);
    g.turn = 'p-a';
    g.hp['p-a'] = MAX_HP;
    rest(g, 'p-a');
    expect(g.hp['p-a']).toBe(MAX_HP);
  });
  it('la pista se aplica en secreto y registra a quién y el resultado', () => {
    const g = base();
    expect(givePista(g, 'p-a', 'p-c')).toBe(true);
    expect(g.pista).not.toBeNull();
    expect(g.pista!.by).toBe('p-a');
    expect(g.pista!.target).toBe('p-c');
    const p = PISTAS[g.pista!.idx];
    const applies = pistaApplies(p, factionOf(g, 'p-c'));
    if (!applies) expect(g.pista!.outcome).toBe('no le afecta');
    else expect(g.hp['p-c']).toBe(MAX_HP + (p.effect === 'heal1' ? 0 : -1)); // heal1 con vida llena no sube
  });
});

describe('revelarse y poderes', () => {
  it('revelarte te destapa, gasta el poder y aplica su efecto (Georg: 2 de daño)', () => {
    const g = base();
    expect(revealSelf(g, 'p-a', 'p-c')).toBe(true);
    expect(g.revealed['p-a']).toBe(true);
    expect(g.powerUsed['p-a']).toBe(true);
    expect(g.hp['p-c']).toBe(MAX_HP - 2);
    // No puedes revelarte dos veces.
    g.turn = 'p-a';
    expect(revealSelf(g, 'p-a', 'p-c')).toBe(false);
  });
  it('el Licántropo se cura 3 sin objetivo; la Valquiria daña a todos los demás', () => {
    const g = base({ chars: { 'p-a': 'licantropo', 'p-b': 'valquiria', 'p-c': 'georg', 'p-d': 'fuka' } });
    g.hp['p-a'] = 5;
    expect(revealSelf(g, 'p-a', null)).toBe(true);
    expect(g.hp['p-a']).toBe(8);
    expect(revealSelf(g, 'p-b', null)).toBe(true);
    expect(g.hp['p-a']).toBe(7);
    expect(g.hp['p-c']).toBe(MAX_HP - 1);
    expect(g.hp['p-d']).toBe(MAX_HP - 1);
    expect(g.hp['p-b']).toBe(MAX_HP);
  });
  it('los poderes con objetivo lo exigen; solo Fuka puede elegirse a sí misma', () => {
    const g = base({ chars: { 'p-a': 'georg', 'p-b': 'fuka', 'p-c': 'vampiro', 'p-d': 'licantropo' } });
    expect(revealSelf(g, 'p-a', null)).toBe(false);
    expect(revealSelf(g, 'p-a', 'p-a')).toBe(false);
    expect(revealSelf(g, 'p-a', 'p-c')).toBe(true);
    g.turn = 'p-b';
    g.hp['p-b'] = 5;
    expect(revealSelf(g, 'p-b', 'p-b')).toBe(true);
    expect(g.hp['p-b']).toBe(8);
  });
  it('el Vampiro roba vida: 2 de daño y se cura 2', () => {
    const g = base({ turn: 'p-c' });
    g.hp['p-c'] = 5;
    expect(revealSelf(g, 'p-c', 'p-a')).toBe(true);
    expect(g.hp['p-a']).toBe(MAX_HP - 2);
    expect(g.hp['p-c']).toBe(7);
  });
});

describe('muerte y victoria', () => {
  it('al morir se revela el personaje y gana la facción rival cuando cae la última', () => {
    const g = base();
    g.hp['p-c'] = 1;
    g.hp['p-d'] = 1;
    // Georg remata al Vampiro con su poder (2 ≥ 1).
    expect(revealSelf(g, 'p-a', 'p-c')).toBe(true);
    expect(isAlive(g, 'p-c')).toBe(false);
    expect(g.revealed['p-c']).toBe(true);
    expect(g.winner).toBeNull(); // queda el Licántropo
    // Franklin remata al Licántropo (rayo 1-4 ≥ 1).
    expect(revealSelf(g, 'p-b', 'p-d')).toBe(true);
    expect(g.winner).toBe('hunter');
    expect(g.phase).toBe('end');
    expect(g.winners.sort()).toEqual(['p-a', 'p-b']);
    expect(g.scores['p-a']).toBe(1);
    // Todos destapados al final.
    expect(Object.values(g.revealed).every(Boolean)).toBe(true);
  });
  it('las Sombras ganan si no queda ningún Cazador', () => {
    const g = base({ alive: { 'p-a': false, 'p-b': true, 'p-c': true, 'p-d': true }, turn: 'p-c' });
    g.hp['p-a'] = 0;
    g.hp['p-b'] = 1;
    g.turn = 'p-c';
    expect(revealSelf(g, 'p-c', 'p-b')).toBe(true); // Vampiro remata al último Cazador
    expect(g.winner).toBe('shadow');
    expect(g.winners.sort()).toEqual(['p-c', 'p-d']);
  });
  it('Allie gana con el bando que sea si sigue viva; Bob, si remató a alguien', () => {
    const g = base({
      playerIds: ['p-a', 'p-b', 'p-c', 'p-d', 'p-e', 'p-f'],
      chars: { 'p-a': 'georg', 'p-b': 'franklin', 'p-c': 'vampiro', 'p-d': 'licantropo', 'p-e': 'allie', 'p-f': 'bob' },
      hp: { 'p-a': 10, 'p-b': 10, 'p-c': 1, 'p-d': 1, 'p-e': 10, 'p-f': 10 },
      alive: { 'p-a': true, 'p-b': true, 'p-c': true, 'p-d': true, 'p-e': true, 'p-f': true },
      revealed: { 'p-a': false, 'p-b': false, 'p-c': false, 'p-d': false, 'p-e': false, 'p-f': false },
      powerUsed: { 'p-a': false, 'p-b': false, 'p-c': false, 'p-d': false, 'p-e': false, 'p-f': false },
      names: { 'p-a': 'A', 'p-b': 'B', 'p-c': 'C', 'p-d': 'D', 'p-e': 'E', 'p-f': 'F' },
      turn: 'p-f',
    });
    // Bob remata al Vampiro con su poder (2 ≥ 1)…
    expect(revealSelf(g, 'p-f', 'p-c')).toBe(true);
    expect(g.killsBy['p-f']).toBe(1);
    // …y Georg remata al Licántropo: ganan los Cazadores + Allie (viva) + Bob (remató).
    g.turn = 'p-a';
    expect(revealSelf(g, 'p-a', 'p-d')).toBe(true);
    expect(g.winner).toBe('hunter');
    expect(g.winners.sort()).toEqual(['p-a', 'p-b', 'p-e', 'p-f']);
  });
  it('nextAlive salta a los muertos y checkWin no dispara con ambas facciones vivas', () => {
    const g = base({ alive: { 'p-a': true, 'p-b': false, 'p-c': true, 'p-d': true } });
    expect(nextAlive(g, 'p-a')).toBe('p-c');
    expect(aliveIds(g)).toEqual(['p-a', 'p-c', 'p-d']);
    expect(checkWin(g)).toBe(false);
    expect(MIN_PLAYERS).toBe(4);
  });
});
