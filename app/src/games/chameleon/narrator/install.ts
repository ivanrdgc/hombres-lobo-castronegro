// Voz de «El Camaleón»: narrador ligero. Solo habla el altavoz (masterId) de su
// partida. NUNCA dice la palabra secreta; anuncia el tema (público), quién
// empieza y el desenlace.
import { createNarrator, type SceneCtx, type SceneDef } from '../../../core/narrator/sequencer';
import { pauseMs, profileOf } from '../../../core/narrator/pacing';
import { e2eTestMode } from '../../../core/test-hooks';
import { play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { matchView, onChange, state } from '../../../core/sync/store.svelte';
import type { GroupDoc, PlayerDoc, Session } from '../../../core/sync/schema';
import { chamGame } from '../actions';
import { topicName } from '../engine';
import type { ChameleonState } from '../types';
import { CH_INTRO, NEW_ROUND_LINE, VOTE_LINE, caughtLine, roundLine, outcomeLine } from '../texts';

interface Snap { group: GroupDoc | null; players: PlayerDoc[]; session: Session | null }
type Ctx = SceneCtx<Snap>;

const clip = (text: string): { kind: 'clip'; text: string } => ({ kind: 'clip', text });
const utt = (id: string, ...texts: string[]): Utterance => ({ id, segments: texts.map(clip), display: texts.join(' ') });

function snapshot(): Snap {
  const g = state.group;
  const pid = state.session?.pid;
  const mine = g && pid
    ? state.matches.find((m) => m.gameId === 'chameleon' && m.masterId === pid && (m.members || []).includes(pid))
    : null;
  return { group: mine && g ? matchView(g, mine) : g, players: state.players, session: state.session };
}

function amSpeaker(s: Snap): boolean {
  const g = s.group;
  if (!g || g.status !== 'playing' || !chamGame(g) || !s.session) return false;
  if (g.masterId !== s.session.pid) return false;
  const p = s.players.find((x) => x.id === s.session!.pid);
  return !!p && p.deviceToken === s.session.token;
}

const gm = (ctx: Ctx): ChameleonState => chamGame(ctx.state().group)!;
const nm = (g: ChameleonState, pid: string | null | undefined): string => (pid && g.names[pid]) || 'alguien';
// «🔁 Repetir» sube repeatNonce y con él la clave de escena; si la clave del
// LEDGER no lo lleva también, la escena rearranca pero el sayOnce ya está
// marcado y no suena nada (mismo remedio que en Avalon).
const rk = (g: ChameleonState, key: string): string => `C${g.startedAt}:${key}:r${g.repeatNonce || 0}`;

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amSpeaker(s)) return null;
  const g = chamGame(s.group)!;
  const C = `C${g.startedAt}:r${g.round}`;
  if (g.paused) return { key: `C${g.startedAt}:paused:${g.paused.at}`, hardEntry: true, run: pausedScene };
  const rf = g.repeatNonce || 0;
  switch (g.phase) {
    case 'reveal': return { key: `${C}:reveal:${rf}`, run: revealScene };
    case 'clue': return { key: `${C}:clue:${rf}`, run: clueScene };
    case 'vote': return { key: `${C}:vote:${rf}`, run: voteScene };
    case 'guess': return { key: `${C}:guess:${rf}`, run: guessScene };
    case 'end': return { key: `${C}:end:${rf}`, run: endScene };
    default: return null;
  }
}

async function pausedScene(ctx: Ctx): Promise<void> { await ctx.waitFor(() => false); }

async function revealScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  // Ronda 1, la intro larga; de la 2 en adelante, un aviso corto (sin él, el
  // reparto era mudo y la mesa no sabía que tenía que volver a mirar la carta).
  if (g.round === 1) await ctx.sayOnce(rk(g, 'intro'), () => utt('ch-intro', CH_INTRO));
  else await ctx.sayOnce(rk(g, `r${g.round}:newround`), () => utt('ch-newround', NEW_ROUND_LINE));
  await ctx.waitFor((s) => {
    const game = chamGame(s.group);
    return !!game && (game.phase !== 'reveal' || game.playerIds.every((pid) => game.seen[pid]));
  });
}

async function clueScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sayOnce(rk(g, `r${g.round}:clue`), () =>
    utt('ch-clue', roundLine(topicName(g.topicId), nm(g, g.playerIds[g.starterIdx]))));
}

async function voteScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sayOnce(rk(g, `r${g.round}:vote`), () => utt('ch-vote', VOTE_LINE));
}

/** El momento más dramático: la mesa acaba de cazar a alguien y le queda una bala. */
async function guessScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sleep(400);
  await ctx.sayOnce(rk(g, `r${g.round}:guess`), () =>
    utt('ch-guess', caughtLine(nm(g, g.chameleonId))));
}

async function endScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  if (!g.winner) return;
  await ctx.sleep(400);
  await ctx.sayOnce(rk(g, `r${g.round}:end`), () =>
    utt('ch-end', outcomeLine(g.winner!, nm(g, g.chameleonId), g.caught, g.guessedRight)));
}

let wakeLock: WakeLockSentinel | null = null;
async function requestWakeLock(): Promise<void> {
  try {
    if (!wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch { /* sin wake lock */ }
}

export function installChameleonNarrator(): void {
  const narrator = createNarrator<Snap>({
    getSnapshot: snapshot,
    sceneOf,
    gameIdOf: (s) => chamGame(s.group)?.startedAt ?? null,
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
