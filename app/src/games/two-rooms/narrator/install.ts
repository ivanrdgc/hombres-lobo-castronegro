// La voz de «Two Rooms and a Boom»: un narrador más sobre el secuenciador
// genérico (core/narrator). Solo habla el dispositivo altavoz (masterId de la
// partida) y solo cuando la partida en curso es Two Rooms. Relata lo PÚBLICO
// leyendo el diario (rondas, reloj, intercambios de rehenes, desenlace): los
// bandos y roles ocultos no llegan al diario hasta el final, así que jamás se
// dicen antes de tiempo. Cada línea se locuta una sola vez (ledger por índice).
import { createNarrator, type SceneCtx, type SceneDef } from '../../../core/narrator/sequencer';
import { pauseMs, profileOf } from '../../../core/narrator/pacing';
import { e2eTestMode } from '../../../core/test-hooks';
import { play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { matchView, onChange, state } from '../../../core/sync/store.svelte';
import type { GroupDoc, PlayerDoc, Session } from '../../../core/sync/schema';
import { twoRoomsGame } from '../actions';
import * as A from '../actions';
import { TWOROOMS_INTRO } from '../texts';
import type { TwoRoomsState } from '../types';

interface Snap {
  group: GroupDoc | null;
  players: PlayerDoc[];
  session: Session | null;
}
type Ctx = SceneCtx<Snap>;

const clip = (text: string): { kind: 'clip'; text: string } => ({ kind: 'clip', text });
const utt = (id: string, text: string): Utterance => ({ id, segments: [clip(text)], display: text });
const speakable = (txt: string): string => txt.replace(/^[^\p{L}\d«"¡¿]+/u, '').trim();

function snapshot(): Snap {
  const g = state.group;
  const pid = state.session?.pid;
  const mine = g && pid
    ? state.matches.find((m) => m.gameId === 'two_rooms' && m.masterId === pid && (m.members || []).includes(pid))
    : null;
  return { group: mine && g ? matchView(g, mine) : g, players: state.players, session: state.session };
}

function amSpeaker(s: Snap): boolean {
  const g = s.group;
  if (!g || g.status !== 'playing' || !twoRoomsGame(g) || !s.session) return false;
  if (g.masterId !== s.session.pid) return false;
  const p = s.players.find((x) => x.id === s.session!.pid);
  return !!p && p.deviceToken === s.session.token;
}

const gm = (ctx: Ctx): TwoRoomsState => twoRoomsGame(ctx.state().group)!;

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amSpeaker(s)) return null;
  const game = twoRoomsGame(s.group)!;
  if (game.phase === 'reveal') return { key: `T${game.startedAt}:reveal`, run: revealScene };
  if (game.phase === 'discuss') return { key: `T${game.startedAt}:log${game.log.length}:d${game.round}`, run: discussScene };
  return { key: `T${game.startedAt}:log${game.log.length}`, run: logScene };
}

async function revealScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  if (g.round === 1 && !g.swaps.length) await ctx.sayOnce(`T${g.startedAt}:intro`, () => utt('tr-intro', TWOROOMS_INTRO));
  await ctx.waitFor((s) => {
    const game = twoRoomsGame(s.group);
    return !!game && (game.phase !== 'reveal' || game.playerIds.every((pid) => game.seen[pid]));
  });
}

async function logScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  for (let i = 1; i < g.log.length; i++) {
    const txt = speakable(g.log[i].txt);
    if (txt) await ctx.sayOnce(`T${g.startedAt}:log${i}`, () => utt(`tr-log-${i}`, txt));
  }
}

async function discussScene(ctx: Ctx): Promise<void> {
  // Locuta las líneas nuevas del diario (arranque de ronda…) y, al final del
  // reloj, dispara el fin de la ronda (además del vigilante de la UI).
  await logScene(ctx);
  const g = gm(ctx);
  if (g.phase !== 'discuss' || g.deadline === null || g.paused) return;
  await ctx.sleep(Math.max(0, g.deadline - Date.now()) + 300);
  const gg = gm(ctx);
  if (gg.phase === 'discuss' && !gg.paused) await A.timeUp().catch(() => { /* otro se adelantó */ });
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

export function installTwoRoomsNarrator(): void {
  const narrator = createNarrator<Snap>({
    getSnapshot: snapshot,
    sceneOf,
    gameIdOf: (s) => twoRoomsGame(s.group)?.startedAt ?? null,
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
