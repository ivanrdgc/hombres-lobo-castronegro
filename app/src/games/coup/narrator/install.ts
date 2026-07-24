// La voz de «Coup»: un narrador más sobre el secuenciador genérico
// (core/narrator). Solo habla el dispositivo altavoz (masterId de la partida) y
// solo cuando la partida en curso es Coup. Relata lo PÚBLICO leyendo el diario
// (turnos, jugadas declaradas, desafíos, bloqueos, cartas descubiertas, el
// ganador): las influencias ocultas nunca llegan al diario, así que jamás se
// dicen. Cada línea se locuta una sola vez (ledger por índice).
import { createNarrator, type SceneCtx, type SceneDef } from '../../../core/narrator/sequencer';
import { pauseMs, profileOf } from '../../../core/narrator/pacing';
import { e2eTestMode } from '../../../core/test-hooks';
import { cleanForSpeech } from '../../../core/util/speech';
import { play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { matchView, onChange, state } from '../../../core/sync/store.svelte';
import type { GroupDoc, PlayerDoc, Session } from '../../../core/sync/schema';
import { coupGame } from '../actions';
import { pendingReactors } from '../engine';
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
const speakable = cleanForSpeech; // limpieza COMPLETA para la voz (emojis en medio, abreviaturas)

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
const nm = (g: CoupState, pid: string): string => g.names[pid] || 'alguien';
// Prefijo de hitos: la revancha reinicia el diario, así que la SEMILLA (que
// cambia en cada reparto) entra en la clave; si no, las líneas nuevas
// heredarían los hitos de la partida anterior y el narrador se quedaría mudo.
const pre = (g: CoupState): string => `C${g.startedAt}:s${g.seed}`;

const REACTION_PHASES: CoupState['phase'][] = ['challengeAction', 'block', 'challengeBlock'];

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amSpeaker(s)) return null;
  const game = coupGame(s.group)!;
  // En pausa, silencio duro (hardEntry) hasta reanudar.
  if (game.paused) return { key: `C${game.startedAt}:paused:${game.paused.at}`, hardEntry: true, run: pausedScene };
  const rf = game.repeatNonce || 0; // «🔁 Repetir» re-arranca la escena
  if (game.phase === 'reveal') return { key: `${pre(game)}:reveal:r${rf}`, run: revealScene };
  // Escena viva: la clave incluye el nº de líneas del diario → cada línea nueva
  // arranca una escena que las locuta todas (las ya dichas, instantáneas).
  return { key: `${pre(game)}:log${game.log.length}:r${rf}`, run: logScene };
}

async function pausedScene(ctx: Ctx): Promise<void> { await ctx.waitFor(() => false); }

/** ¿Toca atender un «🔁 Repetir» nuevo? (una sola escena lo sirve por nonce). */
function repeatPending(ctx: Ctx, g: CoupState): boolean {
  if (!g.repeatNonce) return false;
  const k = `${pre(g)}:rep${g.repeatNonce}`;
  if (ctx.ledger.has(k)) return false;
  ctx.ledger.mark(k);
  return true;
}

async function revealScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  if (repeatPending(ctx, g)) ctx.ledger.clearPrefix(`${pre(g)}:intro`);
  if (g.round === 1) await ctx.sayOnce(`${pre(g)}:intro`, () => utt('coup-intro', COUP_INTRO));
  await ctx.waitFor((s) => {
    const game = coupGame(s.group);
    return !!game && (game.phase !== 'reveal' || game.playerIds.every((pid) => game.seen[pid]));
  });
}

async function logScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  const last = g.log.length - 1;
  // «🔁 Repetir»: la clave de escena lleva el nonce, así que al pedirlo esta
  // escena vuelve a arrancar; olvidar el hito de la ÚLTIMA línea (y solo ese,
  // no hay índices mayores) hace que se relocute sin recitar el diario entero.
  if (repeatPending(ctx, g)) ctx.ledger.clearPrefix(`${pre(g)}:log${last}`);
  // Se salta la línea 0 (el cartel de apertura): ya lo cubre la intro.
  for (let i = 1; i < g.log.length; i++) {
    const txt = speakable(g.log[i].txt);
    if (txt) await ctx.sayOnce(`${pre(g)}:log${i}`, () => utt(`coup-log-${i}`, txt));
  }
  await nagStalledWindow(ctx);
}

/** Ventana de reacción abierta: si nadie contesta, recuerda cada ~30 s quién
 *  falta (sin ellos la jugada no avanza y la mesa se queda colgada). */
async function nagStalledWindow(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  if (!REACTION_PHASES.includes(g.phase) || !pendingReactors(g).length) return;
  const len = g.log.length;
  await ctx.waitOrNag(
    (s) => {
      const game = coupGame(s.group);
      return !game || game.log.length !== len || !pendingReactors(game).length;
    },
    {
      nagKey: `${pre(g)}:nag${len}`,
      escalateAfter: 999, // nunca decide sola: pasar por los ausentes es cosa de un humano
      nag: () => {
        const game = gm(ctx);
        const who = pendingReactors(game).map((pid) => nm(game, pid));
        return who.length ? utt('coup-nag', `Faltan por reaccionar: ${who.join(', ')}.`) : null;
      },
    },
  );
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
