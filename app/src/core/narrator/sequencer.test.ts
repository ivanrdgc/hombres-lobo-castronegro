// Tests-simulador del kernel del narrador: reloj falso, player falso y store
// falso. Verifican el contrato del reconciliador (idempotencia, cancelación,
// ledger marca-tras-completar) sin tocar audio ni Firestore.
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createNarrator, type NarratorDeps, type SceneDef } from './sequencer';
import type { Utterance } from '../audio/player';
import { PACING, pauseMs } from './pacing';

interface S {
  key: string | null;
  acted: boolean;
}

function makeWorld(sceneFor: (s: S, log: string[]) => SceneDef<S> | null) {
  const snap: S = { key: null, acted: false };
  const log: string[] = [];
  let playing: { u: Utterance; resolve: (o: string) => void } | null = null;
  const deps: NarratorDeps<S> = {
    getSnapshot: () => ({ ...snap }),
    sceneOf: (s) => sceneFor(s, log),
    gameIdOf: () => 'g1',
    profileOf: () => 'normal',
    isMuted: () => false,
    rnd: () => 0.5, // jitter determinista
    play: (u, opts) =>
      new Promise((resolve) => {
        log.push('play:' + u.id);
        playing = { u, resolve };
        const t = setTimeout(() => {
          playing = null;
          log.push('end:' + u.id);
          resolve('completed');
        }, 1000); // cada locución dura 1 s
        opts?.signal?.addEventListener('abort', () => {
          clearTimeout(t);
          playing = null;
          log.push('abort:' + u.id);
          resolve('aborted');
        }, { once: true });
      }),
    stopSpeech: (mode) => log.push('stop:' + mode),
  };
  const narrator = createNarrator(deps);
  return {
    snap,
    log,
    narrator,
    set(patch: Partial<S>) {
      Object.assign(snap, patch);
      narrator.tick();
    },
    isPlaying: () => !!playing,
  };
}

const say = (id: string): Utterance => ({ id, segments: [{ kind: 'clip', text: id }] });

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

test('misma clave de escena → no-op estricto (la escena corre una sola vez)', async () => {
  const runs: string[] = [];
  const world = makeWorld((s) =>
    s.key ? { key: s.key, run: async (ctx) => { runs.push(s.key!); await ctx.play(say('a')); } } : null,
  );
  world.set({ key: 'e1' });
  world.set({ key: 'e1' });
  world.set({ key: 'e1' });
  await vi.advanceTimersByTimeAsync(2000);
  expect(runs).toEqual(['e1']);
  expect(world.log.filter((l) => l === 'play:a').length).toBe(1);
});

test('cambio de clave cancela la escena (drain) y clave null corta en seco (hard)', async () => {
  const world = makeWorld((s) =>
    s.key ? { key: s.key, run: async (ctx) => { await ctx.play(say('locucion-' + s.key)); await ctx.sleep(60000); } } : null,
  );
  world.set({ key: 'e1' });
  await vi.advanceTimersByTimeAsync(100); // e1 sonando
  world.set({ key: 'e2' });
  expect(world.log).toContain('stop:drain');
  expect(world.log).toContain('abort:locucion-e1');
  await vi.advanceTimersByTimeAsync(1100); // e2 suena y termina
  world.set({ key: null });
  expect(world.log).toContain('stop:hard');
});

test('sayOnce: marca SOLO tras completarse; una escena re-arrancada re-reproduce la frase cortada y salta lo ya dicho', async () => {
  const world = makeWorld((s) =>
    s.key
      ? {
        key: s.key,
        run: async (ctx) => {
          await ctx.sayOnce('m:intro', () => say('intro'));
          await ctx.sayOnce('m:outro', () => say('outro'));
          await ctx.sleep(60000);
        },
      }
      : null,
  );
  world.set({ key: 'e1' });
  await vi.advanceTimersByTimeAsync(1500); // intro completada, outro sonando
  // Relevo/pausa a mitad del outro: la escena se re-arranca.
  world.narrator.respawn();
  await vi.advanceTimersByTimeAsync(3000);
  const plays = world.log.filter((l) => l.startsWith('play:'));
  expect(plays).toEqual(['play:intro', 'play:outro', 'play:outro']); // intro NO se repite; outro sí (fue cortado)
});

test('waitFor se resuelve por push del estado (sin sondeo)', async () => {
  const order: string[] = [];
  const world = makeWorld((s) =>
    s.key
      ? {
        key: s.key,
        run: async (ctx) => {
          order.push('espera');
          await ctx.waitFor((st) => st.acted);
          order.push('resuelto');
        },
      }
      : null,
  );
  world.set({ key: 'paso' });
  await vi.advanceTimersByTimeAsync(5000);
  expect(order).toEqual(['espera']);
  world.set({ acted: true });
  await vi.advanceTimersByTimeAsync(1);
  expect(order).toEqual(['espera', 'resuelto']);
});

test('waitOrNag: avisos con cadencia y escalada tras N sin respuesta', async () => {
  let escalated = false;
  const world = makeWorld((s) =>
    s.key
      ? {
        key: s.key,
        run: async (ctx) => {
          const res = await ctx.waitOrNag((st) => st.acted, {
            nagKey: 'nags',
            escalateAfter: 3,
            nag: (n) => say('nag' + n),
          });
          if (res === 'escalate') escalated = true;
        },
      }
      : null,
  );
  world.set({ key: 'paso' });
  await vi.advanceTimersByTimeAsync(31000 + 1000); // 1er aviso + su audio
  expect(world.log).toContain('play:nag0');
  await vi.advanceTimersByTimeAsync(31000 + 1000);
  expect(world.log).toContain('play:nag1');
  await vi.advanceTimersByTimeAsync(31000 + 1000);
  expect(escalated).toBe(true);
});

test('anti-pistas: los colchones scaled:false ignoran el perfil de ritmo', () => {
  const rnd = () => 0; // sin jitter: valor mínimo
  expect(pauseMs('postActionHold', 'rapido', rnd)).toBe(PACING.postActionHold.min);
  expect(pauseMs('postActionHold', 'teatral', rnd)).toBe(PACING.postActionHold.min);
  expect(pauseMs('fakeConfirmHold', 'rapido', rnd)).toBe(PACING.fakeConfirmHold.min);
  // …y los escalables sí se escalan.
  expect(pauseMs('advanceGap', 'rapido', rnd)).toBe(Math.round(PACING.advanceGap.min * 0.6));
  expect(pauseMs('advanceGap', 'teatral', rnd)).toBe(Math.round(PACING.advanceGap.min * 1.4));
});
