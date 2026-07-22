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
  const displays: string[] = [];
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
        displays.push(u.display ?? '');
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
    displays,
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

test('teatro de victoria: los lobos ganan al amanecer → se despierta al pueblo y LUEGO se proclama', async () => {
  // La partida terminó en el amanecer (winner ya resuelto), con una muerte
  // nocturna sin anunciar. Debe sonar el amanecer antes que la victoria.
  const world = makeWorld(mkSnap({
    phase: 'end', winner: 'lobos', dayNum: 1,
    lastDawn: { deaths: [{ name: 'Aldo', role: 'aldeano' }] },
  }, [
    { id: 'p-l', name: 'Lobo', role: 'hombre_lobo', alive: true, inGame: true, order: 1, powers: {} },
  ]));
  world.narrator.tick();
  await vi.advanceTimersByTimeAsync(6000);
  const plays = world.timeline.filter(([e]) => e.startsWith('▶')).map(([e]) => e);
  expect(plays).toEqual(['▶dawn', '▶lobos']); // amanecer primero, victoria después
});

test('infectado: la noche del mordisco y una sin infección suenan IGUAL (señuelos + espera humana)', async () => {
  const base = {
    steps: ['durmiendo', 'lobos', 'infecto_decision', 'infectado', 'amanecer'] as GameState['steps'],
    stepIdx: 3,
    keywordsActive: true,
    composition: { infecto: 1, aldeano: 2 },
    kwDecoys: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10'],
  };
  const players: PlayerDoc[] = [
    { id: 'p-i', name: 'Iker', role: 'infecto', alive: true, inGame: true, order: 1, powers: {}, keyword: 'Luna de Plata' },
    { id: 'p-a', name: 'Aldo', role: 'aldeano', alive: true, inGame: true, order: 2, powers: {}, keyword: 'Búho de Niebla' },
    { id: 'p-b', name: 'Bea', role: 'aldeano', alive: true, inGame: true, order: 3, powers: {}, keyword: 'Zarza de Roble' },
  ];

  // — Noche CON infección: Aldo, mordido e infectado, confirma cuando el
  //   colchón humano de la llamada falsa habría terminado (rnd 0.5 → 6500 ms).
  const real = makeWorld(mkSnap({
    ...base,
    acts: { wolfVictim: 'p-a', infectoDecided: true, infectoUsed: true },
  }, JSON.parse(JSON.stringify(players)) as PlayerDoc[]));
  real.narrator.tick();
  await vi.advanceTimersByTimeAsync(1000); // suena la llamada (1 s)
  await vi.advanceTimersByTimeAsync(6500); // …y el mordido tarda lo que un señuelo
  real.patch((s) => {
    s.group!.game!.acts.infectadoSeen = { 'p-a': true };
  });
  await vi.advanceTimersByTimeAsync(20000);

  // — Noche SIN infección (el Infecto se guardó el poder): señuelos.
  vi.setSystemTime(0);
  const fake = makeWorld(mkSnap({
    ...base,
    acts: { wolfVictim: 'p-a', infectoDecided: true },
  }, JSON.parse(JSON.stringify(players)) as PlayerDoc[]));
  fake.narrator.tick();
  await vi.advanceTimersByTimeAsync(30000);

  // Ambas noches: llamada → espera → despedida → avance, con el mismo compás
  // (la real espera outroKnown 400 ms tras confirmar; la falsa integra ese
  // margen en su colchón humano muestreado: aquí ambas suman 6900 ms).
  expect(fake.timeline.map(([e]) => e)).toEqual(['▶fake', '■fake', '▶outro', '■outro', 'advance']);
  expect(real.timeline.map(([e]) => e)).toEqual(['▶call', '■call', '▶outro', '■outro', 'advance']);
  const gapOf = (w: { timeline: [string, number][] }) => w.timeline[2][1] - w.timeline[1][1];
  expect(Math.abs(gapOf(real) - gapOf(fake))).toBeLessThanOrEqual(400);

  // UNA sola palabra por llamada: la real nombra SOLO la del mordido; la
  // falsa, UN señuelo. Nunca la palabra de otro jugador vivo.
  const realCall = real.displays[0];
  const fakeCall = fake.displays[0];
  expect(realCall).toContain('Búho de Niebla');
  expect(realCall).not.toContain('Luna de Plata');
  expect(realCall).not.toContain('Zarza de Roble');
  expect((realCall.match(/d\d+/g) || []).length).toBe(0);
  expect(fakeCall).not.toContain('Búho de Niebla');
  expect(fakeCall).not.toContain('Luna de Plata');
  expect(fakeCall).not.toContain('Zarza de Roble');
  expect((fakeCall.match(/d\d+/g) || []).length).toBe(1);
});

test('infectado con la víctima protegida por el Defensor: suenan señuelos (no hubo mordisco)', async () => {
  const world = makeWorld(mkSnap({
    steps: ['durmiendo', 'lobos', 'infecto_decision', 'infectado', 'amanecer'] as GameState['steps'],
    stepIdx: 3,
    keywordsActive: true,
    composition: { infecto: 1, defensor: 1, aldeano: 1 },
    kwDecoys: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'],
    acts: { wolfVictim: 'p-a', infectoDecided: true, infectoUsed: true, defensorTarget: 'p-a' },
  }, [
    { id: 'p-i', name: 'Iker', role: 'infecto', alive: true, inGame: true, order: 1, powers: {}, keyword: 'Luna de Plata' },
    { id: 'p-a', name: 'Aldo', role: 'aldeano', alive: true, inGame: true, order: 2, powers: {}, keyword: 'Búho de Niebla' },
  ]));
  world.narrator.tick();
  await vi.advanceTimersByTimeAsync(30000);
  expect(world.timeline.map(([e]) => e)).toEqual(['▶fake', '■fake', '▶outro', '■outro', 'advance']);
  expect(world.displays[0]).not.toContain('Búho de Niebla');
  expect((world.displays[0].match(/d\d+/g) || []).length).toBe(1);
});

test('fin sin amanecer pendiente (partida forzada): solo la victoria', async () => {
  const world = makeWorld(mkSnap({
    phase: 'end', winner: 'pueblo', dayNum: 1, lastDawn: null,
  }, [
    { id: 'p-a', name: 'Aldo', role: 'aldeano', alive: true, inGame: true, order: 1, powers: {} },
  ]));
  world.narrator.tick();
  await vi.advanceTimersByTimeAsync(6000);
  const plays = world.timeline.filter(([e]) => e.startsWith('▶')).map(([e]) => e);
  expect(plays).toEqual(['▶pueblo']); // sin lastDawn no se narra ningún amanecer
});
