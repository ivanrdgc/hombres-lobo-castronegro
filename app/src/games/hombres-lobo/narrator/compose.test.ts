// La flecha del Cazador se anuncia por voz con el rol de la víctima (bug de la
// v1: solo se repetía el rol del cazador y la víctima quedaba muda).
import { expect, test } from 'vitest';
import { shotUtterance } from './compose';
import { hunterKillLine } from '../texts/corpus';
import type { GameState } from '../types';

test('hunterKillLine: nombra a la víctima y su rol (si se revela)', () => {
  const s = hunterKillLine('Beto', 'La Vidente', 'd1');
  expect(s).toMatch(/Beto/);
  expect(s).toMatch(/Era La Vidente\./);
  // Roles ocultos: solo la víctima, sin rol.
  expect(hunterKillLine('Beto', null, 'd1')).not.toMatch(/Era/);
});

const mkGame = (over: Partial<GameState>): GameState => ({
  seed: 42, dayNum: 1, night: 0, steps: [], stepIdx: 0, acts: {}, pending: [], revealDead: true,
  shotNonce: 1, lastShot: [{ name: 'Beto', role: 'vidente', hideRole: false }], ...over,
} as GameState);

test('shotUtterance: una locución por víctima, con su rol si la mesa lo revela', () => {
  const u = shotUtterance(mkGame({}));
  expect(u.segments.length).toBe(1);
  expect(u.display).toMatch(/Beto/);
  expect(u.display).toMatch(/Era La Vidente\./);
});

test('shotUtterance: con roles ocultos, la víctima sin rol', () => {
  const u = shotUtterance(mkGame({ revealDead: false }));
  expect(u.display).toMatch(/Beto/);
  expect(u.display).not.toMatch(/Era/);
});

test('shotUtterance: anuncia toda la cadena de la flecha (p. ej. enamorado que muere de amor)', () => {
  const u = shotUtterance(mkGame({
    lastShot: [
      { name: 'Beto', role: 'aldeano', hideRole: false },
      { name: 'Ana', role: 'vidente', hideRole: false },
    ],
  }));
  expect(u.segments.length).toBe(2);
  expect(u.display).toMatch(/Beto/);
  expect(u.display).toMatch(/Ana/);
});
