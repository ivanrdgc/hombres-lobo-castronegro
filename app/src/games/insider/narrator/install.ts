// La voz de «Insider»: un narrador más sobre el secuenciador genérico
// (core/narrator). Solo habla el dispositivo altavoz (masterId de la partida) y
// solo cuando la partida en curso es Insider; convive con los demás narradores
// sin pisarse. NUNCA dice la palabra secreta (solo anuncia al Maestro, el reloj
// y el desenlace).
import { createNarrator, type SceneCtx, type SceneDef } from '../../../core/narrator/sequencer';
import { pauseMs, profileOf } from '../../../core/narrator/pacing';
import { e2eTestMode } from '../../../core/test-hooks';
import { play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { matchView, onChange, state } from '../../../core/sync/store.svelte';
import type { GroupDoc, PlayerDoc, Session } from '../../../core/sync/schema';
import { insiderGame } from '../actions';
import * as A from '../actions';
import {
  INSIDER_INTRO, QUESTION_START, GUESSED_LINE, VOTE_HINT, TIMEOUT_LINE,
  WARN_HALF, WARN_MIN, WARN_10S, masterLine, starterLine, outcomeSpeech,
} from '../texts';
import type { InsiderState } from '../types';

interface Snap {
  group: GroupDoc | null;
  players: PlayerDoc[];
  session: Session | null;
}
type Ctx = SceneCtx<Snap>;

// Todo va como segmento 'clip': si el texto tiene un clip pregenerado (piezas
// fijas), se usa; si no (líneas con nombres), el player cae a síntesis en vivo.
const clip = (text: string): { kind: 'clip'; text: string } => ({ kind: 'clip', text });
const utt = (id: string, ...texts: string[]): Utterance => ({ id, segments: texts.map(clip), display: texts.join(' ') });

function snapshot(): Snap {
  const g = state.group;
  const pid = state.session?.pid;
  const mine = g && pid
    ? state.matches.find((m) => m.gameId === 'insider' && m.masterId === pid && (m.members || []).includes(pid))
    : null;
  return { group: mine && g ? matchView(g, mine) : g, players: state.players, session: state.session };
}

function amSpeaker(s: Snap): boolean {
  const g = s.group;
  if (!g || g.status !== 'playing' || !insiderGame(g) || !s.session) return false;
  if (g.masterId !== s.session.pid) return false;
  const p = s.players.find((x) => x.id === s.session!.pid);
  return !!p && p.deviceToken === s.session.token;
}

const gm = (ctx: Ctx): InsiderState => insiderGame(ctx.state().group)!;
const nm = (g: InsiderState, pid: string | null | undefined): string => (pid && g.names[pid]) || 'alguien';

// ——— Escenas ———

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amSpeaker(s)) return null;
  const game = insiderGame(s.group)!;
  const K = (rest: string) => `I${game.startedAt}:r${game.round}:${rest}`;
  if (game.phase === 'reveal') return { key: K('reveal'), run: revealScene };
  if (game.phase === 'question') return { key: K('question'), run: questionScene };
  if (game.phase === 'vote') return { key: K('vote'), run: voteScene };
  if (game.phase === 'end') return { key: K('end'), run: endScene };
  return null;
}

async function revealScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  if (g.round === 1) await ctx.sayOnce(`I${g.startedAt}:intro`, () => utt('insider-intro', INSIDER_INTRO));
  await ctx.sayOnce(`I${g.startedAt}:r${g.round}:master`, () =>
    utt('insider-master', masterLine(nm(g, g.masterId))));
  await ctx.waitFor((s) => {
    const game = insiderGame(s.group);
    return !!game && (game.phase !== 'reveal' || game.playerIds.every((pid) => game.seen[pid]));
  });
}

async function questionScene(ctx: Ctx): Promise<void> {
  const g0 = gm(ctx);
  const R = `I${g0.startedAt}:r${g0.round}`;
  await ctx.sayOnce(`${R}:qstart`, () => utt('insider-qstart', QUESTION_START));
  await ctx.sayOnce(`${R}:starter`, () => utt('insider-starter', starterLine(nm(g0, g0.playerIds[g0.starterIdx]))));
  // Avisos por hitos absolutos del reloj (mitad, último minuto, diez segundos).
  const marks: { at: number; key: string; mk: () => Utterance }[] = [
    { at: g0.durationMs / 2, key: `${R}:whalf`, mk: () => utt('insider-whalf', WARN_HALF) },
    { at: 60000, key: `${R}:wmin`, mk: () => utt('insider-wmin', WARN_MIN) },
    { at: 10000, key: `${R}:w10`, mk: () => utt('insider-w10', WARN_10S) },
  ].filter((m) => m.at > 15000 || m.at === 10000);
  for (const m of marks) {
    const g = gm(ctx);
    if (g.phase !== 'question' || g.deadline === null || g.paused) return;
    const remaining = g.deadline - Date.now();
    if (remaining <= m.at + 1500) continue; // hito ya pasado
    await ctx.sleep(remaining - m.at);
    const gg = gm(ctx);
    if (gg.phase === 'question' && !gg.paused) await ctx.sayOnce(m.key, m.mk);
  }
  const g = gm(ctx);
  if (g.phase !== 'question' || g.deadline === null || g.paused) return;
  await ctx.sleep(Math.max(0, g.deadline - Date.now()) + 300);
  // El altavoz también dispara el fin de tiempo (además del vigilante de la UI).
  await A.timeUp().catch(() => { /* otro dispositivo se adelantó */ });
}

async function voteScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sayOnce(`I${g.startedAt}:r${g.round}:hunt`, () => utt('insider-hunt', GUESSED_LINE, VOTE_HINT));
}

async function endScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  if (!g.outcome) return;
  await ctx.sleep(400);
  if (g.outcome === 'timeout') {
    await ctx.sayOnce(`I${g.startedAt}:r${g.round}:end`, () => utt('insider-timeout', TIMEOUT_LINE));
  } else {
    await ctx.sayOnce(`I${g.startedAt}:r${g.round}:end`, () => utt('insider-end', outcomeSpeech(g)));
  }
}

// ——— Instalación ———

let wakeLock: WakeLockSentinel | null = null;
async function requestWakeLock(): Promise<void> {
  try {
    if (!wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch { /* la UI ya avisa de mantener la pantalla encendida */ }
}

export function installInsiderNarrator(): void {
  const narrator = createNarrator<Snap>({
    getSnapshot: snapshot,
    sceneOf,
    gameIdOf: (s) => insiderGame(s.group)?.startedAt ?? null,
    play: (u, opts) => play(u, opts),
    stopSpeech,
    profileOf: (s) => profileOf(s.group?.settings?.pacing),
    isMuted: () => !!state.ui.muted,
    pauseMsFor: (key, profile) => (e2eTestMode() ? 40 : pauseMs(key, profile)),
  });

  let wasSpeaker = false;
  onChange(() => {
    const s = snapshot();
    const speaker = amSpeaker(s);
    if (speaker && !wasSpeaker) narrator.respawn({ resetLedger: true });
    wasSpeaker = speaker;
    if (speaker) requestWakeLock();
    narrator.tick();
  });
}
