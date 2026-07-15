// Port de los tests de seatInsertIndex de tests/engine.test.mjs (v1).
import { expect, test } from 'vitest';
import { seatInsertIndex } from './seat-insert';

test('seatInsertIndex: reordenar arrastrando en una rejilla de 2 columnas', () => {
  // 4 bloques (150×46, gap 8) en 2 columnas: [0 1] / [2 3]
  const rects = [
    { left: 0, top: 0, width: 150, height: 46 }, // 0 · centro (75, 23)
    { left: 158, top: 0, width: 150, height: 46 }, // 1 · centro (233, 23)
    { left: 0, top: 54, width: 150, height: 46 }, // 2 · centro (75, 77)
    { left: 158, top: 54, width: 150, height: 46 }, // 3 · centro (233, 77)
  ];
  expect(seatInsertIndex(rects, 10, 23), 'a la izquierda del primero → al principio').toBe(0);
  expect(seatInsertIndex(rects, 200, 23), 'entre el 0 y el 1 → índice 1').toBe(1);
  expect(seatInsertIndex(rects, 10, 77), 'inicio de la 2ª fila → índice 2').toBe(2);
  expect(seatInsertIndex(rects, 300, 77), 'a la derecha del último → al final').toBe(4);
  expect(seatInsertIndex(rects, 75, -20), 'por encima de todo → al principio').toBe(0);
  expect(seatInsertIndex(rects, 300, 23), 'a la derecha de la 1ª fila → antes de la 2ª').toBe(2);
});

test('seatInsertIndex: una sola columna decide por altura (mitad superior/inferior)', () => {
  const rects = [
    { left: 0, top: 0, width: 300, height: 46 },
    { left: 0, top: 54, width: 300, height: 46 },
    { left: 0, top: 108, width: 300, height: 46 },
  ];
  expect(seatInsertIndex(rects, 150, 5), 'mitad superior del primero → al principio').toBe(0);
  expect(seatInsertIndex(rects, 150, 40), 'mitad inferior del primero → tras él').toBe(1);
  expect(seatInsertIndex(rects, 150, 200), 'debajo de todo → al final').toBe(3);
});
