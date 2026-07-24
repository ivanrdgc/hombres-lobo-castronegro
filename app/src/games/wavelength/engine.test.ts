import { describe, it, expect } from 'vitest';
import { dealRound, scoreFor, psychicId, isPsychic, targetHint, MIN_PLAYERS } from './engine';
import { SPECTRUMS } from './spectrums';
import type { WavelengthState } from './types';

const IDS = ['p-a', 'p-b', 'p-c'];
function base(over: Partial<WavelengthState> = {}): WavelengthState {
  return {
    wavelength: true, phase: 'clue', startedAt: 0, seed: 1, round: 1,
    playerIds: IDS.slice(), names: Object.fromEntries(IDS.map((id) => [id, id.toUpperCase()])),
    psychicIdx: 0, spectrumId: 'temp', target: 50, clue: false, marker: null,
    lastScore: null, scores: {}, teamScore: 0, usedSpectrums: ['temp'], log: [],
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

it('constantes de jugadores coherentes', () => {
  expect(MIN_PLAYERS).toBeLessThanOrEqual(3);
});
