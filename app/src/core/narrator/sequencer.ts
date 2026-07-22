// Secuenciador del narrador: patrón RECONCILIADOR. Cada snapshot del estado se
// proyecta a una «clave de escena»; el secuenciador mantiene UN programa de
// escena vivo (una función async lineal). Misma clave → no-op estricto (el
// reemplazo del tick re-entrante de la v1); clave distinta → cancelar y
// arrancar el nuevo. Sin sondeos: los finales de audio son eventos y las
// esperas de jugadores se resuelven por push del store.
// Dependencias inyectadas: en la app son el store y el player reales; en los
// tests-simulador, falsos con reloj controlado.
import type { Utterance } from '../audio/player';
import { Ledger } from './ledger';
import { pauseMs, type PacingKey, type PacingProfile } from './pacing';

export class SceneAborted extends Error {
  constructor() {
    super('escena cancelada');
  }
}

export interface SceneCtx<S> {
  signal: AbortSignal;
  state(): S;
  ledger: Ledger;
  /** Reproduce y espera el final real del audio. Lanza SceneAborted si se cancela. */
  play(u: Utterance): Promise<void>;
  /** play() con hito: solo una vez por clave, marcada TRAS completarse. */
  sayOnce(mkey: string, mk: () => Utterance): Promise<void>;
  /** Colchón de la tabla PACING (con jitter y perfil de la mesa). */
  pause(key: PacingKey): Promise<void>;
  sleep(ms: number): Promise<void>;
  /** Aleatorio inyectado (Math.random en la app; determinista en tests). */
  rnd(): number;
  /** Se resuelve cuando el estado cumple el predicado (por push, sin sondeo). */
  waitFor(pred: (s: S) => boolean): Promise<void>;
  /**
   * Espera con recordatorios: si nadie actúa, cada nagInterval reproduce un
   * aviso (priority low). Devuelve 'done' si el predicado se cumplió o
   * 'escalate' tras NAG_ESCALATE_COUNT avisos sin respuesta.
   */
  waitOrNag(
    pred: (s: S) => boolean,
    opts: {
      nagKey: string;
      nag: (n: number) => Utterance | null;
      escalateAfter?: number;
      filler?: Utterance | null;
    },
  ): Promise<'done' | 'escalate'>;
}

export interface SceneDef<S> {
  key: string;
  run: (ctx: SceneCtx<S>) => Promise<void>;
  /** Al entrar en esta escena se corta el audio EN SECO (pausa global, mute). */
  hardEntry?: boolean;
}

export interface NarratorDeps<S> {
  getSnapshot(): S;
  /** El motor de escenas: null → silencio total (no soy narrador / no hay partida). */
  sceneOf(s: S): SceneDef<S> | null;
  play(u: Utterance, opts?: { signal?: AbortSignal; muted?: boolean }): Promise<string>;
  stopSpeech(mode: 'hard' | 'drain'): void;
  /** Perfil de ritmo de la mesa (settings.pacing). */
  profileOf(s: S): PacingProfile;
  isMuted(): boolean;
  gameIdOf(s: S): string | number | null;
  rnd?: () => number;
  nagIntervalMs?: (s: S) => number;
  /** Duración de un colchón (ctx.pause). Sin esto, la tabla PACING estándar;
   *  los e2e la sustituyen por colchones mínimos. NO afecta a los intervalos
   *  de nag/filler (esos siguen su propio cómputo, sin comprimir). */
  pauseMsFor?(key: PacingKey, profile: PacingProfile): number;
}

export interface Narrator {
  /** Llamar en cada snapshot del store. */
  tick(): void;
  /** Cancela la escena actual y la re-arranca (relevo, repetición sin última locución). */
  respawn(opts?: { resetLedger?: boolean }): void;
  currentKey(): string | null;
  ledger: Ledger;
  dispose(): void;
}

export function createNarrator<S>(deps: NarratorDeps<S>): Narrator {
  const ledger = new Ledger();
  const rnd = deps.rnd || Math.random;
  let current: { key: string; ctrl: AbortController } | null = null;
  let disposed = false;
  const waiters: { pred: (s: S) => boolean; resolve: () => void }[] = [];

  function throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) throw new SceneAborted();
  }

  function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      throwIfAborted(signal);
      const t = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(t);
        reject(new SceneAborted());
      };
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  function makeCtx(ctrl: AbortController): SceneCtx<S> {
    const signal = ctrl.signal;
    const playRaw = async (u: Utterance): Promise<string> => {
      throwIfAborted(signal);
      const outcome = await deps.play(u, { signal, muted: deps.isMuted() });
      if (signal.aborted || outcome === 'aborted') throw new SceneAborted();
      return outcome;
    };
    const waitFor = (pred: (s: S) => boolean): Promise<void> => {
      if (pred(deps.getSnapshot())) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const w = { pred, resolve: () => resolve() };
        waiters.push(w);
        signal.addEventListener('abort', () => {
          const i = waiters.indexOf(w);
          if (i >= 0) waiters.splice(i, 1);
          reject(new SceneAborted());
        }, { once: true });
      });
    };
    const ctx: SceneCtx<S> = {
      signal,
      ledger,
      state: () => deps.getSnapshot(),
      play: async (u) => {
        await playRaw(u);
      },
      sayOnce: async (mkey, mk) => {
        if (ledger.has(mkey)) return;
        const outcome = await playRaw(mk());
        // «skipped-low» no marca: el aviso podrá volver a intentarse.
        if (outcome !== 'skipped-low') ledger.mark(mkey);
      },
      pause: (key) => {
        const profile = deps.profileOf(deps.getSnapshot());
        const ms = deps.pauseMsFor ? deps.pauseMsFor(key, profile) : pauseMs(key, profile, rnd);
        return abortableSleep(ms, signal);
      },
      sleep: (ms) => abortableSleep(ms, signal),
      rnd: () => rnd(),
      waitFor,
      waitOrNag: async (pred, opts) => {
        const escalateAfter = opts.escalateAfter ?? 4;
        const interval = deps.nagIntervalMs
          ? deps.nagIntervalMs(deps.getSnapshot())
          : pauseMs('nagInterval', deps.profileOf(deps.getSnapshot()), rnd);
        // Murmullo ambiental ocasional antes del primer aviso.
        let fillerPending = opts.filler || null;
        for (;;) {
          if (pred(deps.getSnapshot())) return 'done';
          let resolved = false;
          const winner = await Promise.race([
            waitFor(pred).then(() => {
              resolved = true;
              return 'done' as const;
            }),
            abortableSleep(fillerPending ? pauseMs('fillerDelay', deps.profileOf(deps.getSnapshot()), rnd) : interval, signal)
              .then(() => 'tick' as const),
          ]);
          if (winner === 'done' || resolved || pred(deps.getSnapshot())) return 'done';
          if (fillerPending) {
            const f = fillerPending;
            fillerPending = null;
            playRaw({ ...f, priority: 'low' }).catch((e) => {
              if (!(e instanceof SceneAborted)) throw e;
            });
            continue;
          }
          const n = ledger.bump(opts.nagKey);
          if (n >= escalateAfter) return 'escalate';
          const u = opts.nag(n - 1);
          if (u) {
            try {
              await playRaw({ ...u, priority: 'low' });
            } catch (e) {
              if (e instanceof SceneAborted) throw e;
            }
          }
        }
      },
    };
    return ctx;
  }

  function spawn(scene: SceneDef<S>): void {
    const ctrl = new AbortController();
    current = { key: scene.key, ctrl };
    const ctx = makeCtx(ctrl);
    scene.run(ctx).catch((e) => {
      if (!(e instanceof SceneAborted)) console.warn('narrador: escena', scene.key, e);
    });
  }

  function tick(): void {
    if (disposed) return;
    const s = deps.getSnapshot();
    ledger.resetFor(deps.gameIdOf(s));
    // Despierta a las escenas que esperaban este estado.
    for (const w of [...waiters]) {
      if (w.pred(s)) {
        const i = waiters.indexOf(w);
        if (i >= 0) waiters.splice(i, 1);
        w.resolve();
      }
    }
    const scene = deps.sceneOf(s);
    const key = scene ? scene.key : null;
    if ((current?.key ?? null) === key) return; // re-entrada idempotente
    if (current) {
      current.ctrl.abort();
      current = null;
    }
    // Silencio duro al dejar de narrar o al pausar; al cambiar de escena, que
    // la frase en curso termine (nunca se corta una palabra a medias).
    deps.stopSpeech(key === null || scene?.hardEntry ? 'hard' : 'drain');
    if (scene) spawn(scene);
  }

  return {
    tick,
    respawn(opts = {}) {
      if (opts.resetLedger) ledger.forceReset();
      if (current) {
        current.ctrl.abort();
        current = null;
      }
      deps.stopSpeech('hard');
      tick();
    },
    currentKey: () => current?.key ?? null,
    ledger,
    dispose() {
      disposed = true;
      if (current) current.ctrl.abort();
      current = null;
    },
  };
}
