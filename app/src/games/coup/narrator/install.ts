// La voz de «Coup»: un narrador más sobre el secuenciador genérico
// (core/narrator). Solo habla el dispositivo altavoz (masterId de la partida) y
// solo cuando la partida en curso es Coup. Relata lo PÚBLICO leyendo el diario
// (turnos, jugadas declaradas, desafíos, bloqueos, cartas descubiertas, el
// ganador): las influencias ocultas nunca llegan al diario, así que jamás se
// dicen. Cada línea se locuta una sola vez (ledger por índice).
import { createNarrator, type SceneCtx, type SceneDef } from '../../../core/narrator/sequencer';
import { pauseMs, profileOf } from '../../../core/narrator/pacing';
import { e2eTestMode } from '../../../core/test-hooks';
import { play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { matchView, onChange, state } from '../../../core/sync/store.svelte';
import type { GroupDoc, PlayerDoc, Session } from '../../../core/sync/schema';
import { coupGame } from '../actions';
import { COUP_INTRO } from '../texts';
import type { CoupState } from '../types';

interface Snap {
  group: GroupDoc | null;
  players: PlayerDoc[];
  session: Session | null;
}
type Ctx = SceneCtx<Snap>;

const clip = (text: string): { kind: 'clip'; text: string } => ({ kind: 'clip', text });
const utt = (id: string, text: string): Utterance => ({ id, segments: [clip(text)], display: text });

// Deja el texto apto para la voz: quita el emoji/símbolo del principio.
const speakable = (txt: string): string => txt.replace(/^[^\p{L}\d«"¡¿]+/u, '').trim();

function snapshot(): Snap {
  const g = state.group;
  const pid = state.session?.pid;
  const mine = g && pid
    ? state.matches.find((m) => m.gameId === 'coup' && m.masterId === pid && (m.members || []).includes(pid))
    : null;
  return { group: mine && g ? matchView(g, mine) : g, players: state.players, session: state.session };
}

function amSpeaker(s: Snap): boolean {
  const g = s.group;
  if (!g || g.status !== 'playing' || !coupGame(g) || !s.session) return false;
  if (g.masterId !== s.session.pid) return false;
  const p = s.players.find((x) => x.id === s.session!.pid);
  return !!p && p.deviceToken === s.session.token;
}

const gm = (ctx: Ctx): CoupState => coupGame(ctx.state().group)!;

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amSpeaker(s)) return null;
  const game = coupGame(s.group)!;
  if (game.phase === 'reveal') return { key: `C${game.startedAt}:reveal`, run: revealScene };
  // Escena viva: la clave incluye el nº de líneas del diario → cada línea nueva
  // arranca una escena que las locuta todas (las ya dichas, instantáneas).
  return { key: `C${game.startedAt}:log${game.log.length}`, run: logScene };
}

async function revealScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  if (g.round === 1) await ctx.sayOnce(`C${g.startedAt}:intro`, () => utt('coup-intro', COUP_INTRO));
  await ctx.waitFor((s) => {
    const game = coupGame(s.group);
    return !!game && (game.phase !== 'reveal' || game.playerIds.every((pid) => game.seen[pid]));
  });
}

async function logScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  // Se salta la línea 0 (el cartel «Comienza Coup»): ya lo cubre la intro.
  for (let i = 1; i < g.log.length; i++) {
    const txt = speakable(g.log[i].txt);
    if (txt) await ctx.sayOnce(`C${g.startedAt}:log${i}`, () => utt(`coup-log-${i}`, txt));
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

export function installCoupNarrator(): void {
  const narrator = createNarrator<Snap>({
    getSnapshot: snapshot,
    sceneOf,
    gameIdOf: (s) => coupGame(s.group)?.startedAt ?? null,
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
