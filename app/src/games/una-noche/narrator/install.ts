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
import { DAWN, DEBATE, END, LISTOS, NIGHT_FALL, STEP_CALL, WELCOME } from '../texts';

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

// ——— Proyección: snapshot → escena ———

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amNarrator(s)) return null;
  const game = unaNocheGame(s.group)!;
  const sa = game.startedAt || 0;
  const rf = game.repeatNonce || 0;
  const K = (rest: string) => `U${sa}:${rest}`;
  if (game.paused) return { key: K(`paused:${game.paused.at}`), hardEntry: true, run: pausedScene };
  if (game.phase === 'end') return { key: K(`end:${game.winner}`), run: endScene };
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
  // Paso de rol: la llamada suena igual exista o no (fantasma si está en el
  // centro). Espera a que los actores acaben (instantáneo si es fantasma) y un
  // colchón fijo, para que el tiempo no delate quién actuó.
  const call = STEP_CALL[step];
  if (call) await ctx.sayOnce(uid('call'), () => utt('un-' + step, call));
  await ctx.waitFor((s) => {
    const game = unaNocheGame(s.group);
    return !game || game.phase !== 'night' || game.stepIdx !== idx || !actorsPending(step, game);
  });
  if (gm(ctx).phase === 'night' && gm(ctx).stepIdx === idx) {
    await ctx.pause('postActionHold');
    await A.advanceGhostStep(idx);
  }
}

async function dayScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sayOnce(`U${g.startedAt}:dawn:r${g.repeatNonce || 0}`, () => utt('un-dawn', DAWN));
  await ctx.sayOnce(`U${g.startedAt}:debate:r${g.repeatNonce || 0}`, () => utt('un-debate', DEBATE));
  await ctx.waitFor((s) => unaNocheGame(s.group)?.phase !== 'day'); // los votos resuelven a 'end'
}

async function endScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sleep(400);
  const label = END[g.winner || 'nadie'] || END.nadie;
  await ctx.sayOnce(`U${g.startedAt}:end:${g.winner}`, () => utt('un-end', label));
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
