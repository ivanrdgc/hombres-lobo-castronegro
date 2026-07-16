// El altavoz recordado solo hereda la voz si su dispositivo sigue activo:
// si duerme, la voz se mueve sola al dispositivo que abre «Empezar partida».
import { expect, test } from 'vitest';
import { defaultNarrator } from './ui-helpers';
import { PRESENCE_STALE_MS } from '../core/sync/presence';
import type { PlayerDoc } from '../core/sync/schema';

const NOW = 1_000_000_000;
const p = (id: string, freshness: 'activo' | 'dormido' | 'sin-latido'): PlayerDoc => ({
  id,
  heartbeatAt: freshness === 'activo' ? NOW - 1000 : freshness === 'dormido' ? NOW - PRESENCE_STALE_MS - 1000 : undefined,
}) as PlayerDoc;

test('el altavoz recordado se mantiene si sigue activo', () => {
  const players = [p('p-tele', 'activo'), p('p-ana', 'activo')];
  expect(defaultNarrator(players, 'p-tele', 'p-ana', NOW)).toBe('p-tele');
});

test('si el altavoz recordado está dormido, la voz pasa al dispositivo que abre la pantalla', () => {
  const players = [p('p-tele', 'dormido'), p('p-ana', 'activo')];
  expect(defaultNarrator(players, 'p-tele', 'p-ana', NOW)).toBe('p-ana');
});

test('un altavoz sin latido (doc antiguo) también cuenta como inactivo', () => {
  const players = [p('p-tele', 'sin-latido'), p('p-ana', 'activo')];
  expect(defaultNarrator(players, 'p-tele', 'p-ana', NOW)).toBe('p-ana');
});

test('si el altavoz recordado ya no está en el grupo, narra este dispositivo', () => {
  const players = [p('p-ana', 'activo')];
  expect(defaultNarrator(players, 'p-fuera', 'p-ana', NOW)).toBe('p-ana');
});
