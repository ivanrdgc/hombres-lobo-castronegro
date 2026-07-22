// La voz de «Ávalon»: un narrador más sobre el secuenciador genérico. Solo
// habla el dispositivo altavoz (masterId) y solo cuando su partida en curso es
// Ávalon. Es una voz LIGERA (como El Espía): la app no necesita el ritual de
// «cerrad los ojos» —el conocimiento va en las cartas—, así que la voz solo
// ambienta y anuncia el estado público (misión, líder, votos y resultados).
import { createNarrator, type SceneCtx, type SceneDef } from '../../../core/narrator/sequencer';
import { pauseMs, profileOf } from '../../../core/narrator/pacing';
import { e2eTestMode } from '../../../core/test-hooks';
import { play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { matchView, onChange, state } from '../../../core/sync/store.svelte';
import type { GroupDoc, PlayerDoc, Session } from '../../../core/sync/schema';
import { avalonGame } from '../actions';
import { leaderId, tally } from '../engine';
import { teamSize } from '../roles';
import type { AvalonState } from '../types';
import {
  AV_INTRO, ASSASSIN_LINE, LISTOS, endLine, missionLine, questResultLine, reproposeLine, voteResultLine,
} from '../texts';

interface Snap { group: GroupDoc | null; players: PlayerDoc[]; session: Session | null }
type Ctx = SceneCtx<Snap>;

const clip = (text: string): { kind: 'clip'; text: string } => ({ kind: 'clip', text });
const utt = (id: string, ...texts: string[]): Utterance => ({ id, segments: texts.map(clip), display: texts.join(' ') });

function snapshot(): Snap {
  const g = state.group;
  const pid = state.session?.pid;
  const mine = g && pid
    ? state.matches.find((m) => m.gameId === 'avalon' && m.masterId === pid && (m.members || []).includes(pid))
    : null;
  return { group: mine && g ? matchView(g, mine) : g, players: state.players, session: state.session };
}

function amSpeaker(s: Snap): boolean {
  const g = s.group;
  if (!g || g.status !== 'playing' || !avalonGame(g) || !s.session) return false;
  if (g.masterId !== s.session.pid) return false;
  const p = s.players.find((x) => x.id === s.session!.pid);
  return !!p && p.deviceToken === s.session.token;
}

const gm = (ctx: Ctx): AvalonState => avalonGame(ctx.state().group)!;
const nm = (g: AvalonState, pid: string | null | undefined): string => (pid && g.names[pid]) || 'alguien';

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amSpeaker(s)) return null;
  const game = avalonGame(s.group)!;
  const A = `A${game.startedAt}`;
  if (game.paused) return { key: `${A}:paused:${game.paused.at}`, hardEntry: true, run: pausedScene };
  const rf = game.repeatNonce || 0;
  switch (game.phase) {
    case 'reveal': return { key: `${A}:reveal:r${rf}`, run: revealScene };
    case 'propose': return { key: `${A}:q${game.quest}:t${game.voteTrack}:propose:r${rf}`, run: proposeScene };
    case 'voteReveal': return { key: `${A}:q${game.quest}:t${game.voteTrack}:vr:r${rf}`, run: voteRevealScene };
    case 'result': return { key: `${A}:q${game.quest}:result:r${rf}`, run: resultScene };
    case 'assassin': return { key: `${A}:assassin:r${rf}`, run: assassinScene };
    case 'end': return { key: `${A}:end`, run: endScene };
    default: return null;
  }
}

async function pausedScene(ctx: Ctx): Promise<void> {
  await ctx.waitFor(() => false);
}

async function revealScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sayOnce(`A${g.startedAt}:intro`, () => utt('av-intro', AV_INTRO));
  await ctx.waitFor((s) => {
    const game = avalonGame(s.group);
    return !!game && (game.phase !== 'reveal' || game.playerIds.every((pid) => game.seen[pid]));
  });
  if (gm(ctx).phase === 'reveal') await ctx.sayOnce(`A${g.startedAt}:listos`, () => utt('av-listos', LISTOS));
}

async function proposeScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  const leader = nm(g, leaderId(g));
  const line = g.voteTrack > 0
    ? reproposeLine(leader, g.voteTrack)
    : missionLine(g.quest, leader, teamSize(g.playerIds.length, g.quest));
  await ctx.sayOnce(`A${g.startedAt}:q${g.quest}:t${g.voteTrack}:propose`, () => utt('av-propose', line));
}

async function voteRevealScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  const v = g.lastVote;
  if (!v) return;
  await ctx.sayOnce(`A${g.startedAt}:q${g.quest}:t${g.voteTrack}:vr`, () =>
    utt('av-vote', voteResultLine(v.approved, v.approvals.length, v.rejections.length)));
}

async function resultScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  const q = g.lastQuest;
  if (!q) return;
  await ctx.sleep(300);
  await ctx.sayOnce(`A${g.startedAt}:q${q.quest}:result`, () => utt('av-result', questResultLine(q.quest, q.success, q.fails)));
  void tally;
}

async function assassinScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sayOnce(`A${g.startedAt}:assassin`, () => utt('av-assassin', ASSASSIN_LINE));
}

async function endScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  const winner = g.winner;
  if (!winner) return;
  await ctx.sleep(400);
  await ctx.sayOnce(`A${g.startedAt}:end`, () => utt('av-end', endLine(winner, gm(ctx).winReason || '')));
}

// ——— Instalación ———

let wakeLock: WakeLockSentinel | null = null;
async function requestWakeLock(): Promise<void> {
  try {
    if (!wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch { /* sin wake lock: la UI ya avisa */ }
}

export function installAvalonNarrator(): void {
  const narrator = createNarrator<Snap>({
    getSnapshot: snapshot,
    sceneOf,
    gameIdOf: (s) => avalonGame(s.group)?.startedAt ?? null,
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
