import { expect, test } from 'vitest';
import { playerIdFor, randomId, slugify } from './ids';

test('slugify: idéntico a la v1 (acentos, símbolos, tope de 40)', () => {
  expect(slugify('Los Lobos de Medianoche')).toBe('los-lobos-de-medianoche');
  expect(slugify('Ángel & Cía.')).toBe('angel-cia');
  expect(slugify('  ¡¡La Camada de "El Páramo"!!  ')).toBe('la-camada-de-el-paramo');
  expect(slugify('ñoño')).toBe('nono');
  expect(slugify('x'.repeat(60)).length).toBe(40);
  expect(slugify('!!!')).toBe('');
});

test('playerIdFor: prefijo p- y null si el nombre no da slug', () => {
  expect(playerIdFor('Iván')).toBe('p-ivan');
  expect(playerIdFor('  ')).toBe(null);
});

test('randomId: prefijo y longitud razonable', () => {
  const id = randomId('t');
  expect(id.startsWith('t_')).toBe(true);
  expect(id.length).toBeGreaterThan(8);
  expect(randomId('t')).not.toBe(randomId('t'));
});
