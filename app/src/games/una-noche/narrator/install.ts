// La voz de «Una Noche en Castronegro»: un narrador más sobre el secuenciador
// genérico (core/narrator). Solo habla el dispositivo altavoz (masterId) y solo
// cuando la partida en curso es Una Noche. Llama a cada rol en su orden —con
// pasos fantasma para los roles que están en el centro, de modo que el tiempo
// no delate qué hay fuera— y lleva el amanecer, el debate y el desenlace.
import { createNarrator, type SceneCtx, type SceneDef } from '../../../core/narrator/sequencer';
import { pauseMs, profileOf } from '../../../core/narrator/pacing';
import { e2eTestMode } from '../../../core/test-hooks';
import { play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { ensureAmbience, stopAmbience } from '../../../core/audio/ambience';
import { getVoiceConfig } from '../../../core/audio/voice-config';
import { matchView, onChange, state } from '../../../core/sync/store.svelte';
import type { GroupDoc, PlayerDoc, Session } from '../../../core/sync/schema';
import { unaNocheGame } from '../actions';
import * as A from '../actions';
import { playersOf, stepActors } from '../engine';
import type { GameState, StepId } from '../types';
import { DAWN, DEBATE, END, END_BOTH, LISTOS, NAG_FORGOT, NIGHT_FALL, STEP_CALL, STEP_CLOSE, STEP_NAG, TIME_UP, WELCOME } from '../texts';

interface Snap {
  group: GroupDoc | null;
  players: PlayerDoc[];
  session: Session | null;
}
type Ctx = SceneCtx<Snap>;

const clip = (text: string): { kind: 'clip'; text: string } => ({ kind: 'clip', text });
const utt = (id: string, text: string): Utterance => ({ id, segments: [clip(text)], display: text });

// La vista de la partida de Una Noche cuya voz pone este dispositivo.
function snapshot(): Snap {
  const g = state.group;
  const pid = state.session?.pid;
  const mine = g && pid
    ? state.matches.find((m) => m.gameId === 'una_noche' && m.masterId === pid && (m.members || []).includes(pid))
    : null;
  return { group: mine && g ? matchView(g, mine) : g, players: state.players, session: state.session };
}

function amNarrator(s: Snap): boolean {
  const g = s.group;
  if (!g || g.status !== 'playing' || !unaNocheGame(g) || !s.session) return false;
  if (g.masterId !== s.session.pid) return false;
  const p = s.players.find((x) => x.id === s.session!.pid);
  return !!p && p.deviceToken === s.session.token;
}

const gm = (ctx: Ctx): GameState => unaNocheGame(ctx.state().group)!;
const ps = (ctx: Ctx) => playersOf(gm(ctx));

function actorsPending(step: StepId, game: GameState): boolean {
  const a = stepActors(step, game, playersOf(game));
  return !!a && a.length > 0;
}

// Utterance de RE-llamada nº n (0 = repetir la llamada del rol; ≥1 = recordatorio
// genérico «alguien se ha dormido»). Idéntica exista o no el rol (anti-pistas).
function nagUtt(step: StepId, n: number): Utterance {
  if (n === 0 && STEP_NAG[step]) return utt('un-nag-' + step, STEP_NAG[step]!);
  const i = (n === 0 ? 0 : n - 1) % NAG_FORGOT.length;
  return utt('un-forgot-' + i, NAG_FORGOT[i]);
}

// Cuántas veces «se hace de rogar» un rol FANTASMA (nadie actúa): casi siempre 0
// (actúa rápido, como la mayoría), a veces 1, rara vez 2 — imitando a una mesa
// real. Con re-llamadas idénticas a las del caso real: el tiempo no delata nada.
function ghostNagCount(r: number): number {
  return r < 0.62 ? 0 : r < 0.88 ? 1 : 2;
}

/** Todos los ganadores en una clave estable (Una Noche admite dos a la vez). */
function winnersKey(game: GameState): string {
  const w = game.winners && game.winners.length ? game.winners : [game.winner || 'nadie'];
  return [...w].sort().join('+');
}

// ——— Proyección: snapshot → escena ———

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amNarrator(s)) return null;
  const game = unaNocheGame(s.group)!;
  const sa = game.startedAt || 0;
  const rf = game.repeatNonce || 0;
  const K = (rest: string) => `U${sa}:${rest}`;
  if (game.paused) return { key: K(`paused:${game.paused.at}`), hardEntry: true, run: pausedScene };
  if (game.phase === 'end') return { key: K(`end:${winnersKey(game)}`), run: endScene };
  if (game.phase === 'reveal') return { key: K(`reveal:r${rf}`), run: revealScene };
  if (game.phase === 'day') return { key: K(`day:r${rf}`), run: dayScene };
  if (game.phase === 'night') {
    const step = game.steps[game.stepIdx];
    if (!step) return null;
    return { key: K(`n:s${game.stepIdx}:${step}:r${rf}`), run: (ctx) => nightStepScene(ctx, step, game.stepIdx) };
  }
  return null;
}

async function pausedScene(ctx: Ctx): Promise<void> {
  await ctx.waitFor(() => false);
}

async function revealScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sayOnce(`U${g.startedAt}:welcome`, () => utt('un-welcome', WELCOME));
  await ctx.waitFor((s) => {
    const game = unaNocheGame(s.group);
    return !!game && (game.phase !== 'reveal' || game.playerIds.every((pid) => (game.seen || {})[pid]));
  });
  if (gm(ctx).phase === 'reveal') await ctx.sayOnce(`U${g.startedAt}:listos`, () => utt('un-listos', LISTOS));
}

async function nightStepScene(ctx: Ctx, step: StepId, idx: number): Promise<void> {
  const g0 = gm(ctx);
  const uid = (part: string) => `U${g0.startedAt}:n:s${idx}:${step}:r${g0.repeatNonce || 0}:${part}`;

  if (step === 'durmiendo') {
    await ctx.sayOnce(uid('fall'), () => utt('un-night', NIGHT_FALL));
    await ctx.pause('sleepHold');
    await A.advanceGhostStep(idx);
    return;
  }
  if (step === 'amanecer') {
    await ctx.pause('dawnHold');
    await A.wakeUp();
    return;
  }
  // Paso de rol: la llamada (abrir ojos + instrucción) suena igual exista o no
  // el rol. Luego se espera «a que actúe» y, si tarda, se RE-llama (como un
  // narrador humano) — con la MISMA cadencia y las MISMAS frases exista el rol
  // o no, para que el tiempo jamás delate qué hay en el centro. Solo al final,
  // «cerrad los ojos» — nunca antes de que la acción termine.
  const call = STEP_CALL[step];
  if (call) await ctx.sayOnce(uid('call'), () => utt('un-' + step, call));
  const done = (s: Snap): boolean => {
    const game = unaNocheGame(s.group);
    return !game || game.phase !== 'night' || game.stepIdx !== idx || !actorsPending(step, game);
  };
  const stillHere = () => gm(ctx).phase === 'night' && gm(ctx).stepIdx === idx;

  if (actorsPending(step, gm(ctx))) {
    // REAL: espera a que el actor confirme; si tarda, re-llama en bucle
    // (escalateAfter alto → nunca fuerza el avance, solo sigue recordando).
    if (e2eTestMode()) {
      await ctx.waitFor(done);
    } else {
      while ((await ctx.waitOrNag(done, {
        nagKey: uid('nag'),
        nag: (n) => nagUtt(step, n),
        escalateAfter: 999,
      })) === 'escalate') { /* seguir recordando */ }
    }
  } else if (e2eTestMode()) {
    await ctx.pause('fakeConfirmHold');
  } else {
    // FANTASMA (rol en el centro): se simula a un jugador. Casi siempre actúa
    // rápido (una sola espera); a veces se hace de rogar y se le RE-llama una o
    // dos veces, con la misma cadencia que en el caso real → indistinguible.
    const cycles = ghostNagCount(ctx.rnd());
    if (cycles === 0) {
      await ctx.pause('fakeConfirmHold');
    } else {
      for (let i = 0; i < cycles && stillHere(); i++) {
        await ctx.pause('unaCallNag'); // silencio hasta el umbral de re-llamada
        if (!stillHere()) break;
        await ctx.play({ ...nagUtt(step, i), priority: 'low' });
      }
      await ctx.pause('fakeConfirmHold'); // por fin «actúa», poco después
    }
  }
  await ctx.pause('postActionHold'); // cola compartida real/fantasma antes del cierre
  if (stillHere()) {
    const close = STEP_CLOSE[step];
    if (close) await ctx.sayOnce(uid('close'), () => utt('un-close-' + step, close));
    await ctx.pause('advanceGap');
    await A.advanceGhostStep(idx);
  }
}

async function dayScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  const r = g.repeatNonce || 0;
  await ctx.sayOnce(`U${g.startedAt}:dawn:r${r}`, () => utt('un-dawn', DAWN));
  await ctx.sayOnce(`U${g.startedAt}:debate:r${r}`, () => utt('un-debate', DEBATE));
  // Reloj del debate: se avisa UNA vez al agotarse (waitFor solo despierta por
  // push del store, así que el tiempo se cuenta a base de colchones cortos).
  const ends = g.discussionEndsAt || 0;
  const stillDay = (): boolean => unaNocheGame(ctx.state().group)?.phase === 'day';
  if (ends) {
    while (stillDay() && Date.now() < ends) await ctx.sleep(Math.min(2000, ends - Date.now()));
    if (stillDay()) await ctx.sayOnce(`U${g.startedAt}:timeup:r${r}`, () => utt('un-timeup', TIME_UP));
  }
  await ctx.waitFor((s) => unaNocheGame(s.group)?.phase !== 'day'); // los votos resuelven a 'end'
}

async function endScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sleep(400);
  // Con DOS ganadores (Curtidor + Pueblo) la voz debe cantarlos los dos: leer
  // solo el primero contradecía a la pantalla, que ya los muestra ambos.
  const multi = (g.winners || []).length > 1;
  const label = multi ? END_BOTH : (END[g.winner || 'nadie'] || END.nadie);
  await ctx.sayOnce(`U${g.startedAt}:end:${winnersKey(g)}`, () => utt('un-end', label));
  void ps; // (playersOf disponible para futuras locuciones con nombres)
}

// ——— Instalación ———

let wakeLock: WakeLockSentinel | null = null;
async function requestWakeLock(): Promise<void> {
  try {
    if (!wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch {
    /* sin wake lock: la UI ya avisa */
  }
}

export function installUnaNocheNarrator(): void {
  const narrator = createNarrator<Snap>({
    getSnapshot: snapshot,
    sceneOf,
    gameIdOf: (s) => unaNocheGame(s.group)?.startedAt ?? null,
    play: (u, opts) => play(u, opts),
    stopSpeech,
    profileOf: (s) => profileOf(s.group?.settings?.pacing),
    isMuted: () => !!state.ui.muted,
    pauseMsFor: (key, profile) => (e2eTestMode() ? 40 : pauseMs(key, profile)),
    // Umbral para RE-llamar a un rol que tarda (real y fantasma). Más corto que
    // el nag por defecto (30 s): en Una Noche las acciones son rápidas.
    nagIntervalMs: (s) => (e2eTestMode() ? 40 : pauseMs('unaCallNag', profileOf(s.group?.settings?.pacing))),
  });

  let wasNarrator = false;
  onChange(() => {
    const s = snapshot();
    const game = unaNocheGame(s.group);
    const master = amNarrator(s);
    if (master && !wasNarrator) narrator.respawn({ resetLedger: true });
    wasNarrator = master;
    const wantAmbience = master && !!game && getVoiceConfig().ambience && !state.ui.muted
      && !game.paused && game.phase !== 'end' && game.phase !== 'reveal' && !e2eTestMode();
    ensureAmbience(!wantAmbience ? null : game!.phase === 'day' ? 'day' : 'night');
    if (master) requestWakeLock();
    if (!master) stopAmbience();
    narrator.tick();
  });
}
