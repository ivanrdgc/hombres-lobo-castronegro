// Simulador de las escenas reales del narrador (acciones y síntesis simuladas):
// EL test del contrato anti-pistas — un paso con actor vivo que actúa y un
// turno fantasma (rol muerto con roles ocultos) deben producir la MISMA línea
// temporal de audio y avance. Cualquier divergencia sería una pista.
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../actions', () => ({
  advanceGhostStep: vi.fn(async () => {}),
  runDawn: vi.fn(async () => {}),
  startRoleRefresh: vi.fn(async () => {}),
  finishRoleRefreshClose: vi.fn(async () => {}),
  resolveSirvienta: vi.fn(async () => {}),
  heartbeat: vi.fn(async () => {}),
}));
vi.mock('../../../core/audio/clips', () => ({
  prewarmSynth: () => {},
  prewarmBuffers: () => {},
}));

import { createNarrator, type NarratorDeps } from '../../../core/narrator/sequencer';
import { sceneOf, type Snap } from './scenes';
import * as A from '../actions';
import type { GameState } from '../types';
import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';

function mkSnap(gameOver: Partial<GameState>, players: PlayerDoc[]): Snap {
  const game: GameState = {
    mode: 'auto', phase: 'night', startedAt: 123, seed: 42,
    night: 1, dayNum: 0, steps: ['durmiendo', 'vidente', 'amanecer'], stepIdx: 1,
    acts: {}, pending: [], log: [], votesLeft: 0, refreshNonce: 0,
    revealDead: true, composition: { vidente: 1 },
    ...gameOver,
  };
  const group: GroupDoc = {
    id: 'mesa', name: 'Mesa', createdAt: 0, masterId: 'p-narr', lastNarratorId: 'p-narr',
    currentGame: 'hombres_lobo', status: 'playing', settings: {}, extraRoles: [], game,
  };
  return {
    group,
    players: [
      { id: 'p-narr', name: 'Tele', deviceToken: 't1', inGame: false, order: 0 },
      ...players,
    ],
    session: { pid: 'p-narr', token: 't1', name: 'Tele' },
  };
}

function makeWorld(snap0: Snap) {
  let snap = snap0;
  const timeline: [string, number][] = [];
  const deps: NarratorDeps<Snap> = {
    getSnapshot: () => snap,
    sceneOf,
    gameIdOf: (s) => s.group?.game?.startedAt ?? null,
    profileOf: () => 'normal',
    isMuted: () => false,
    rnd: () => 0.5,
    play: (u, opts) =>
      new Promise((resolve) => {
        timeline.push(['▶' + u.id.split(':').pop(), Date.now()]);
        const t = setTimeout(() => {
          timeline.push(['■' + u.id.split(':').pop(), Date.now()]);
          resolve('completed');
        }, 1000);
        opts?.signal?.addEventListener('abort', () => {
          clearTimeout(t);
          resolve('aborted');
        }, { once: true });
      }),
    stopSpeech: () => {},
  };
  const narrator = createNarrator(deps);
  const advance = A.advanceGhostStep as unknown as ReturnType<typeof vi.fn>;
  advance.mockImplementation(async () => {
    timeline.push(['advance', Date.now()]);
  });
  return {
    timeline,
    narrator,
    patch(fn: (s: Snap) => void) {
      const copy = JSON.parse(JSON.stringify(snap)) as Snap;
      fn(copy);
      snap = copy;
      narrator.tick();
    },
  };
}

/** Normaliza la línea temporal a (evento, Δms desde el anterior). */
function deltas(timeline: [string, number][]): [string, number][] {
  return timeline.map(([e, t], i) => [e, i === 0 ? 0 : t - timeline[i - 1][1]]);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
});

test('anti-pistas: la vidente que actúa y su turno fantasma suenan IGUAL', async () => {
  // — Paso REAL: vidente viva; elige y confirma justo cuando acaba la entrada.
  const real = makeWorld(mkSnap({}, [
    { id: 'p-v', name: 'Vera', role: 'vidente', alive: true, inGame: true, order: 1, powers: {} },
    { id: 'p-a', name: 'Aldo', role: 'aldeano', alive: true, inGame: true, order: 2, powers: {} },
  ]));
  real.narrator.tick();
  await vi.advanceTimersByTimeAsync(1000); // suena la entrada (1 s)
  real.patch((s) => {
    s.group!.game!.acts = { videnteTarget: 'p-a', videnteSeen: true };
  });
  await vi.advanceTimersByTimeAsync(10000);

  // — Turno FANTASMA: vidente muerta y roles ocultos (hay que fingir).
  vi.setSystemTime(0);
  const ghost = makeWorld(mkSnap({ revealDead: false }, [
    { id: 'p-v', name: 'Vera', role: 'vidente', alive: false, inGame: true, order: 1, powers: {} },
    { id: 'p-a', name: 'Aldo', role: 'aldeano', alive: true, inGame: true, order: 2, powers: {} },
  ]));
  ghost.narrator.tick();
  await vi.advanceTimersByTimeAsync(20000);

  const realDeltas = deltas(real.timeline);
  const ghostDeltas = deltas(ghost.timeline);
  // Misma secuencia de eventos y las MISMAS esperas (jitter fijado):
  expect(ghostDeltas).toEqual(realDeltas);
  // Y la forma esperada: entrada → (postActionHold) → despedida → (advanceGap) → avance.
  expect(realDeltas.map(([e]) => e)).toEqual(['▶intro', '■intro', '▶outro', '■outro', 'advance']);
  expect((A.advanceGhostStep as unknown as ReturnType<typeof vi.fn>).mock.calls.every(([idx]) => idx === 1)).toBe(true);
});

test('paso públicamente muerto (roles revelados): salto discreto sin locución', async () => {
  const world = makeWorld(mkSnap({ revealDead: true }, [
    { id: 'p-v', name: 'Vera', role: 'vidente', alive: false, inGame: true, order: 1, powers: {} },
    { id: 'p-a', name: 'Aldo', role: 'aldeano', alive: true, inGame: true, order: 2, powers: {} },
  ]));
  world.narrator.tick();
  await vi.advanceTimersByTimeAsync(5000);
  expect(world.timeline.map(([e]) => e)).toEqual(['advance']); // sin audio
});

test('durmiendo: colchón y avance sin locución propia', async () => {
  const world = makeWorld(mkSnap({ stepIdx: 0 }, [
    { id: 'p-v', name: 'Vera', role: 'vidente', alive: true, inGame: true, order: 1, powers: {} },
  ]));
  world.narrator.tick();
  await vi.advanceTimersByTimeAsync(10000);
  const events = world.timeline.map(([e]) => e);
  expect(events[0]).toBe('▶cae'); // «cae la noche…»
  expect(events).toContain('advance');
});
