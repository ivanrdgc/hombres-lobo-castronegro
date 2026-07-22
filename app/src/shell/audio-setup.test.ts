// La pantalla de activación de audio aparece en el PRIMER acceso, salvo cuando
// ya hay una partida en curso cuyo altavoz es otro dispositivo.
import { expect, test } from 'vitest';
import { liveGameElsewhere, shouldShowAudioSetup } from './audio-setup';
import type { GameState } from '../games/hombres-lobo/types';
import type { MatchDoc } from '../core/sync/schema';

const match = (over: Partial<MatchDoc>): MatchDoc => ({
  id: 'm1', gameId: 'hombres_lobo', createdAt: 0, members: [], masterId: null,
  lastNarratorId: null, settings: {}, extraRoles: [], game: null, ...over,
});
const G = {} as GameState; // basta con que `game` no sea null para contar como «en curso»

test('altavoz en otro dispositivo: una partida viva con masterId ajeno cuenta', () => {
  expect(liveGameElsewhere([match({ game: G, masterId: 'p-tele' })], 'p-yo')).toBe(true);
});

test('mi propia narración no cuenta como «en otro dispositivo»', () => {
  expect(liveGameElsewhere([match({ game: G, masterId: 'p-yo' })], 'p-yo')).toBe(false);
});

test('una partida sin estado de juego (aún sin arrancar) no cuenta', () => {
  expect(liveGameElsewhere([match({ game: null, masterId: 'p-tele' })], 'p-yo')).toBe(false);
});

const base = { done: false, testMode: false, matchesReady: true, liveElsewhere: false } as const;

test('primer acceso en la portada: se muestra', () => {
  expect(shouldShowAudioSetup({ ...base, view: 'landing' })).toBe(true);
});

test('ya activado antes: no se muestra', () => {
  expect(shouldShowAudioSetup({ ...base, view: 'landing', done: true })).toBe(false);
});

test('en los e2e nunca se muestra', () => {
  expect(shouldShowAudioSetup({ ...base, view: 'landing', testMode: true })).toBe(false);
});

test('en una mesa con partida cuyo altavoz es otro móvil: no se muestra', () => {
  expect(shouldShowAudioSetup({ ...base, view: 'group', liveElsewhere: true })).toBe(false);
});

test('en una mesa sin partida en curso: se muestra', () => {
  expect(shouldShowAudioSetup({ ...base, view: 'group', liveElsewhere: false })).toBe(true);
});

test('en una mesa aún sin el primer snapshot de partidas: espera (no parpadea)', () => {
  expect(shouldShowAudioSetup({ ...base, view: 'group', matchesReady: false })).toBe(false);
});
