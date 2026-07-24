import { describe, it, expect } from 'vitest';
import { average, dealRound, goalMet, goalOptions, scoreFor, psychicId, isPsychic, targetHint, MIN_PLAYERS } from './engine';
import { SPECTRUMS, spectrumSpeech } from './spectrums';
import type { WavelengthState } from './types';

const IDS = ['p-a', 'p-b', 'p-c'];
function base(over: Partial<WavelengthState> = {}): WavelengthState {
  return {
    wavelength: true, phase: 'clue', startedAt: 0, seed: 1, round: 1,
    playerIds: IDS.slice(), names: Object.fromEntries(IDS.map((id) => [id, id.toUpperCase()])),
    psychicIdx: 0, spectrumId: 'temp', target: 50, clue: false, pick: null, marker: null,
    lastScore: null, scores: {}, psychicRounds: {}, teamScore: 0, scored: 0,
    usedSpectrums: ['temp'], log: [],
    ...over,
  };
}

describe('dealRound', () => {
  it('elige un espectro válido y un objetivo dentro de la diana jugable (10..90)', () => {
    for (let s = 0; s < 40; s++) {
      const d = dealRound([], s * 131 + 7);
      expect(SPECTRUMS.some((x) => x.id === d.spectrumId)).toBe(true);
      expect(d.target).toBeGreaterThanOrEqual(10);
      expect(d.target).toBeLessThanOrEqual(90);
    }
  });
  it('no repite espectro hasta agotar el mazo', () => {
    const used = SPECTRUMS.slice(0, -1).map((s) => s.id);
    expect(dealRound(used, 3).spectrumId).toBe(SPECTRUMS[SPECTRUMS.length - 1].id);
  });
});

describe('scoreFor (cercanía)', () => {
  it('da 4 en el centro, bajando por bandas hasta 0', () => {
    expect(scoreFor(50, 50)).toBe(4);
    expect(scoreFor(50, 46)).toBe(4); // d=4
    expect(scoreFor(50, 41)).toBe(3); // d=9
    expect(scoreFor(50, 35)).toBe(2); // d=15
    expect(scoreFor(50, 30)).toBe(0); // d=20
  });
  it('es simétrica', () => {
    expect(scoreFor(70, 62)).toBe(scoreFor(70, 78));
  });
});

describe('rotación del Psíquico', () => {
  it('psychicId sigue psychicIdx y da la vuelta a la mesa', () => {
    expect(psychicId(base({ psychicIdx: 0 }))).toBe('p-a');
    expect(psychicId(base({ psychicIdx: 2 }))).toBe('p-c');
    expect(psychicId(base({ psychicIdx: 3 }))).toBe('p-a'); // vuelta
    expect(isPsychic(base({ psychicIdx: 1 }), 'p-b')).toBe(true);
  });
});

describe('targetHint', () => {
  it('apunta al extremo correcto del espectro', () => {
    expect(targetHint(base({ spectrumId: 'temp', target: 15 }))).toBe('Frío');
    expect(targetHint(base({ spectrumId: 'temp', target: 85 }))).toBe('Caliente');
    expect(targetHint(base({ spectrumId: 'temp', target: 50 }))).toBe('el centro');
  });
});

describe('meta de la partida', () => {
  it('sin meta, la partida no termina sola', () => {
    expect(goalMet(base({ round: 99, teamScore: 999 }))).toBe(false);
  });
  it('por rondas: se cumple al llegar a la ronda pactada', () => {
    const g = { kind: 'rounds' as const, n: 3, label: 'Una vuelta' };
    expect(goalMet(base({ goal: g, round: 2 }))).toBe(false);
    expect(goalMet(base({ goal: g, round: 3 }))).toBe(true);
  });
  it('por puntos: se cumple al alcanzar el total de equipo', () => {
    const g = { kind: 'points' as const, n: 20, label: 'Hasta 20' };
    expect(goalMet(base({ goal: g, teamScore: 19 }))).toBe(false);
    expect(goalMet(base({ goal: g, teamScore: 20 }))).toBe(true);
  });
  it('la primera opción es una vuelta a la mesa (una ronda por jugador) y la última, sin meta', () => {
    const opts = goalOptions(5);
    expect(opts[0]).toMatchObject({ kind: 'rounds', n: 5 });
    expect(opts.at(-1)).toBeNull();
  });
});

it('la media por ronda evita dividir entre cero', () => {
  expect(average(0, 0)).toBe('—');
  expect(average(7, 2)).toBe('3,5');
});

it('el espectro hablado nombra los dos extremos (sin el ↔, que se lee fatal)', () => {
  const said = spectrumSpeech('deporte');
  expect(said).toContain('No es deporte');
  expect(said).toContain('Es deporte');
  expect(said).not.toContain('↔');
});

it('constantes de jugadores coherentes', () => {
  // Con 2 el «equipo» sería una sola persona: el mínimo real es 3.
  expect(MIN_PLAYERS).toBe(3);
  expect(SPECTRUMS.length).toBeGreaterThanOrEqual(40); // mazo para una noche
  expect(new Set(SPECTRUMS.map((s) => s.id)).size).toBe(SPECTRUMS.length);
});
