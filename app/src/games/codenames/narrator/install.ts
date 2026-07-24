// Voz de «Codenames»: narrador ligero. Solo habla el altavoz (masterId) de su
// partida. NUNCA dice el mapa secreto; relata lo PÚBLICO leyendo el diario
// (turnos, pistas, aciertos, desenlace). Cada línea del diario se locuta una
// sola vez (ledger por índice), como en Coup.
import { createNarrator, type SceneCtx, type SceneDef } from '../../../core/narrator/sequencer';
import { pauseMs, profileOf } from '../../../core/narrator/pacing';
import { e2eTestMode } from '../../../core/test-hooks';
import { cleanForSpeech } from '../../../core/util/speech';
import { play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { matchView, onChange, state } from '../../../core/sync/store.svelte';
import type { GroupDoc, PlayerDoc, Session } from '../../../core/sync/schema';
import { codenamesGame } from '../actions';
import { CN_INTRO } from '../texts';
import type { CodenamesState } from '../types';

interface Snap { group: GroupDoc | null; players: PlayerDoc[]; session: Session | null }
type Ctx = SceneCtx<Snap>;

const clip = (text: string): { kind: 'clip'; text: string } => ({ kind: 'clip', text });
const utt = (id: string, text: string): Utterance => ({ id, segments: [clip(text)], display: text });
const speakable = cleanForSpeech; // limpieza COMPLETA para la voz (emojis en medio, abreviaturas)

function snapshot(): Snap {
  const g = state.group;
  const pid = state.session?.pid;
  const mine = g && pid
    ? state.matches.find((m) => m.gameId === 'codenames' && m.masterId === pid && (m.members || []).includes(pid))
    : null;
  return { group: mine && g ? matchView(g, mine) : g, players: state.players, session: state.session };
}

function amSpeaker(s: Snap): boolean {
  const g = s.group;
  if (!g || g.status !== 'playing' || !codenamesGame(g) || !s.session) return false;
  if (g.masterId !== s.session.pid) return false;
  const p = s.players.find((x) => x.id === s.session!.pid);
  return !!p && p.deviceToken === s.session.token;
}

const gm = (ctx: Ctx): CodenamesState => codenamesGame(ctx.state().group)!;

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amSpeaker(s)) return null;
  const g = codenamesGame(s.group)!;
  if (g.paused) return { key: `N${g.startedAt}:paused:${g.paused.at}`, hardEntry: true, run: pausedScene };
  return { key: `N${g.startedAt}:log${g.log.length}`, run: logScene };
}

async function pausedScene(ctx: Ctx): Promise<void> { await ctx.waitFor(() => false); }

async function logScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sayOnce(`N${g.startedAt}:intro`, () => utt('cn-intro', CN_INTRO));
  for (let i = 1; i < g.log.length; i++) {
    const txt = speakable(g.log[i].txt);
    if (txt) await ctx.sayOnce(`N${g.startedAt}:log${i}`, () => utt(`cn-log-${i}`, txt));
  }
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

export function installCodenamesNarrator(): void {
  const narrator = createNarrator<Snap>({
    getSnapshot: snapshot,
    sceneOf,
    gameIdOf: (s) => codenamesGame(s.group)?.startedAt ?? null,
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
