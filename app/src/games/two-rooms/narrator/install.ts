// La voz de «Two Rooms and a Boom»: un narrador más sobre el secuenciador
// genérico (core/narrator). Solo habla el dispositivo altavoz (masterId de la
// partida) y solo cuando la partida en curso es Two Rooms. Relata lo PÚBLICO
// leyendo el diario (rondas, reloj, intercambios de rehenes, desenlace): los
// bandos y roles ocultos no llegan al diario hasta el final, así que jamás se
// dicen antes de tiempo. Cada línea se locuta una sola vez (ledger por índice).
import { createNarrator, type SceneCtx, type SceneDef } from '../../../core/narrator/sequencer';
import { pauseMs, profileOf } from '../../../core/narrator/pacing';
import { e2eTestMode } from '../../../core/test-hooks';
import { cleanForSpeech } from '../../../core/util/speech';
import { play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { matchView, onChange, state } from '../../../core/sync/store.svelte';
import type { GroupDoc, PlayerDoc, Session } from '../../../core/sync/schema';
import { twoRoomsGame } from '../actions';
import * as A from '../actions';
import { narrates } from '../engine';
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
const speakable = cleanForSpeech; // limpieza COMPLETA para la voz (emojis en medio, abreviaturas)

function snapshot(): Snap {
  const g = state.group;
  const pid = state.session?.pid;
  // Este dispositivo narra la partida de Two Rooms de la que es MIEMBRO (puede
  // ser un altavoz que no juega, en modo perRoom): no basta con ser el masterId.
  const mine = g && pid
    ? state.matches.find((m) => m.gameId === 'two_rooms' && (m.members || []).includes(pid))
    : null;
  return { group: mine && g ? matchView(g, mine) : g, players: state.players, session: state.session };
}

function amSpeaker(s: Snap): boolean {
  const g = s.group;
  const game = g && twoRoomsGame(g);
  if (!g || g.status !== 'playing' || !game || !s.session) return false;
  if (!narrates(game, s.session.pid, g.masterId)) return false;
  const p = s.players.find((x) => x.id === s.session!.pid);
  return !!p && p.deviceToken === s.session.token;
}

const gm = (ctx: Ctx): TwoRoomsState => twoRoomsGame(ctx.state().group)!;

/**
 * Desde qué línea del diario relata ESTE dispositivo. Al tomar la voz a mitad de
 * partida (el altavoz de una sala cruzó como rehén, o el máster se fue) el
 * ledger se reinicia; sin este tope, el relevo leería la crónica entera.
 */
let logFrom = 1;

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amSpeaker(s)) return null;
  const game = twoRoomsGame(s.group)!;
  const T = `T${game.startedAt}`;
  // En pausa, silencio duro hasta que se reanude (como en los demás juegos).
  if (game.paused) return { key: `${T}:paused:${game.paused.at}`, hardEntry: true, run: pausedScene };
  const rf = game.repeatNonce || 0; // «🔁 Repetir» re-arranca la escena
  // El reparto también se re-arranca con cada línea nueva (un abandono re-reparte).
  if (game.phase === 'reveal') return { key: `${T}:reveal:log${game.log.length}:r${rf}`, run: revealScene };
  if (game.phase === 'discuss') return { key: `${T}:log${game.log.length}:d${game.round}:r${rf}`, run: discussScene };
  if (game.phase === 'hostages') return { key: `${T}:log${game.log.length}:h${game.round}:r${rf}`, run: hostagesScene };
  return { key: `${T}:log${game.log.length}:r${rf}`, run: logScene };
}

async function pausedScene(ctx: Ctx): Promise<void> { await ctx.waitFor(() => false); }

async function revealScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  const rf = g.repeatNonce || 0;
  if (g.round === 1 && !g.swaps.length) await ctx.sayOnce(`T${g.startedAt}:intro:r${rf}`, () => utt('tr-intro', TWOROOMS_INTRO));
  await logScene(ctx);
  await ctx.waitFor((s) => {
    const game = twoRoomsGame(s.group);
    return !!game && (game.phase !== 'reveal' || game.playerIds.every((pid) => game.seen[pid]));
  });
}

async function logScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  const rf = g.repeatNonce || 0;
  for (let i = Math.max(1, logFrom); i < g.log.length; i++) {
    const txt = speakable(g.log[i].txt);
    // El nonce de «🔁 Repetir» va SOLO en la clave de la última línea: si fuera
    // en todas, repetir soltaría el diario entero de golpe.
    const last = i === g.log.length - 1;
    const key = `T${g.startedAt}:log${i}${last && rf ? `:r${rf}` : ''}`;
    if (txt) await ctx.sayOnce(key, () => utt(`tr-log-${i}`, txt));
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

async function hostagesScene(ctx: Ctx): Promise<void> {
  // Igual que la ronda, pero con el plazo del voto: si alguien no vota, el reloj
  // cierra la votación y la partida sigue.
  await logScene(ctx);
  const g = gm(ctx);
  if (g.phase !== 'hostages' || g.deadline === null || g.paused) return;
  await ctx.sleep(Math.max(0, g.deadline - Date.now()) + 300);
  const gg = gm(ctx);
  if (gg.phase === 'hostages' && !gg.paused) await A.hostagesTimeUp().catch(() => { /* otro se adelantó */ });
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
    if (speaker && !wasSpeaker) {
      // Relevo de voz: se arranca desde la última línea del diario (lo que pasa
      // AHORA), nunca desde el principio.
      logFrom = Math.max(1, (twoRoomsGame(s.group)?.log.length ?? 1) - 1);
      narrator.respawn({ resetLedger: true });
    }
    wasSpeaker = speaker;
    if (speaker) requestWakeLock();
    narrator.tick();
  });
}
