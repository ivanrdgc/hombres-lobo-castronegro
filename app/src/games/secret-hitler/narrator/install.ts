// La voz de «Secret Castronegro»: narrador ligero sobre el secuenciador
// genérico. Solo habla el altavoz (masterId) de su partida. La app ya lleva
// todo el secreto en las pantallas; la voz ambienta y anuncia el estado público
// (quién preside, la nominación, el decreto promulgado, los poderes y el final).
import { createNarrator, type SceneCtx, type SceneDef } from '../../../core/narrator/sequencer';
import { pauseMs, profileOf } from '../../../core/narrator/pacing';
import { e2eTestMode } from '../../../core/test-hooks';
import { play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { matchView, onChange, state } from '../../../core/sync/store.svelte';
import type { GroupDoc, PlayerDoc, Session } from '../../../core/sync/schema';
import { shGame } from '../actions';
import { presidentId } from '../engine';
import type { SHState } from '../types';
import {
  SH_INTRO, LISTOS, presidentLine, nominationLine, enactedLine, powerLine, endLine,
} from '../texts';

interface Snap { group: GroupDoc | null; players: PlayerDoc[]; session: Session | null }
type Ctx = SceneCtx<Snap>;

const clip = (text: string): { kind: 'clip'; text: string } => ({ kind: 'clip', text });
const utt = (id: string, ...texts: string[]): Utterance => ({ id, segments: texts.map(clip), display: texts.join(' ') });

function snapshot(): Snap {
  const g = state.group;
  const pid = state.session?.pid;
  const mine = g && pid
    ? state.matches.find((m) => m.gameId === 'secret_hitler' && m.masterId === pid && (m.members || []).includes(pid))
    : null;
  return { group: mine && g ? matchView(g, mine) : g, players: state.players, session: state.session };
}

function amSpeaker(s: Snap): boolean {
  const g = s.group;
  if (!g || g.status !== 'playing' || !shGame(g) || !s.session) return false;
  if (g.masterId !== s.session.pid) return false;
  const p = s.players.find((x) => x.id === s.session!.pid);
  return !!p && p.deviceToken === s.session.token;
}

const gm = (ctx: Ctx): SHState => shGame(ctx.state().group)!;
const nm = (g: SHState, pid: string | null | undefined): string => (pid && g.names[pid]) || 'alguien';
const roundKey = (g: SHState) => `p${presidentId(g)}:t${g.electionTracker}:l${g.liberalPolicies}:f${g.fascistPolicies}:s${g.specialPresident || ''}`;

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amSpeaker(s)) return null;
  const g = shGame(s.group)!;
  const SH = `SH${g.startedAt}`;
  if (g.paused) return { key: `${SH}:paused:${g.paused.at}`, hardEntry: true, run: pausedScene };
  const rf = g.repeatNonce || 0;
  switch (g.phase) {
    case 'reveal': return { key: `${SH}:reveal:r${rf}`, run: revealScene };
    case 'nominate': return { key: `${SH}:nom:${roundKey(g)}:r${rf}`, run: nominateScene };
    case 'election': return { key: `${SH}:elec:${roundKey(g)}:${g.nominatedChancellor}:r${rf}`, run: electionScene };
    case 'power': return { key: `${SH}:power:${g.fascistPolicies}:${g.power?.type}:r${rf}`, run: powerScene };
    case 'end': return { key: `${SH}:end`, run: endScene };
    default: return null;
  }
}

async function pausedScene(ctx: Ctx): Promise<void> { await ctx.waitFor(() => false); }

async function revealScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sayOnce(`SH${g.startedAt}:intro`, () => utt('sh-intro', SH_INTRO));
  await ctx.waitFor((s) => {
    const game = shGame(s.group);
    return !!game && (game.phase !== 'reveal' || game.playerIds.every((pid) => game.seen[pid]));
  });
  if (gm(ctx).phase === 'reveal') await ctx.sayOnce(`SH${g.startedAt}:listos`, () => utt('sh-listos', LISTOS));
}

// Anuncia el decreto recién promulgado (si lo hubo) antes de abrir la ronda.
async function announceEnacted(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  if (!g.lastEnacted || g.liberalPolicies + g.fascistPolicies === 0) return;
  await ctx.sayOnce(`SH${g.startedAt}:enact:${g.liberalPolicies}:${g.fascistPolicies}`, () =>
    utt('sh-enact', enactedLine(g.lastEnacted!, g.liberalPolicies, g.fascistPolicies)));
}

async function nominateScene(ctx: Ctx): Promise<void> {
  await announceEnacted(ctx);
  const g = gm(ctx);
  await ctx.sayOnce(`SH${g.startedAt}:nom:${roundKey(g)}`, () => utt('sh-pres', presidentLine(nm(g, presidentId(g)))));
}

async function electionScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  if (!g.nominatedChancellor) return;
  await ctx.sayOnce(`SH${g.startedAt}:elec:${roundKey(g)}:${g.nominatedChancellor}`, () =>
    utt('sh-nom', nominationLine(nm(g, presidentId(g)), nm(g, g.nominatedChancellor))));
}

async function powerScene(ctx: Ctx): Promise<void> {
  await announceEnacted(ctx);
  const g = gm(ctx);
  if (!g.power) return;
  await ctx.sayOnce(`SH${g.startedAt}:power:${g.fascistPolicies}:${g.power.type}`, () =>
    utt('sh-power', powerLine(g.power!.type, nm(g, g.power!.by))));
}

async function endScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  const winner = g.winner;
  if (!winner) return;
  await ctx.sleep(400);
  await ctx.sayOnce(`SH${g.startedAt}:end`, () => utt('sh-end', endLine(winner, gm(ctx).winReason || '')));
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

export function installSecretHitlerNarrator(): void {
  const narrator = createNarrator<Snap>({
    getSnapshot: snapshot,
    sceneOf,
    gameIdOf: (s) => shGame(s.group)?.startedAt ?? null,
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
