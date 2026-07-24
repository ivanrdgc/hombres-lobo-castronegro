// Voz de «Good Cop Bad Cop»: narrador ligero. Solo habla el altavoz (masterId)
// de su partida. NUNCA dice cartas ocultas ni resultados de investigar; relata
// lo PÚBLICO leyendo el diario. Una línea, una vez.
import { createNarrator, type SceneCtx, type SceneDef } from '../../../core/narrator/sequencer';
import type { Ledger } from '../../../core/narrator/ledger';
import { pauseMs, profileOf } from '../../../core/narrator/pacing';
import { e2eTestMode } from '../../../core/test-hooks';
import { cleanForSpeech } from '../../../core/util/speech';
import { play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { matchView, onChange, state } from '../../../core/sync/store.svelte';
import type { GroupDoc, PlayerDoc, Session } from '../../../core/sync/schema';
import { goodCopGame } from '../actions';
import { GC_INTRO } from '../texts';
import type { GoodCopState } from '../types';

interface Snap { group: GroupDoc | null; players: PlayerDoc[]; session: Session | null }
type Ctx = SceneCtx<Snap>;

const clip = (text: string): { kind: 'clip'; text: string } => ({ kind: 'clip', text });
const utt = (id: string, text: string): Utterance => ({ id, segments: [clip(text)], display: text });
const speakable = cleanForSpeech; // limpieza COMPLETA para la voz (emojis en medio, abreviaturas)

function snapshot(): Snap {
  const g = state.group;
  const pid = state.session?.pid;
  const mine = g && pid
    ? state.matches.find((m) => m.gameId === 'good_cop' && m.masterId === pid && (m.members || []).includes(pid))
    : null;
  return { group: mine && g ? matchView(g, mine) : g, players: state.players, session: state.session };
}

function amSpeaker(s: Snap): boolean {
  const g = s.group;
  if (!g || g.status !== 'playing' || !goodCopGame(g) || !s.session) return false;
  if (g.masterId !== s.session.pid) return false;
  const p = s.players.find((x) => x.id === s.session!.pid);
  return !!p && p.deviceToken === s.session.token;
}

const gm = (ctx: Ctx): GoodCopState => goodCopGame(ctx.state().group)!;

// Prefijo de los hitos del diario: lleva la semilla porque la revancha vacía el
// diario y, sin ella, las líneas nuevas heredarían los hitos de la anterior.
const pre = (g: GoodCopState): string => `G${g.startedAt}:s${g.seed}`;

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amSpeaker(s)) return null;
  const g = goodCopGame(s.group)!;
  if (g.paused) return { key: `G${g.startedAt}:paused:${g.paused.at}`, hardEntry: true, run: pausedScene };
  // El nonce va en la clave: sin él, «🔁 Repetir» no re-arrancaba la escena.
  return { key: `${pre(g)}:log${g.log.length}:r${g.repeatNonce || 0}`, run: logScene };
}

async function pausedScene(ctx: Ctx): Promise<void> { await ctx.waitFor(() => false); }

async function logScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sayOnce(`G${g.startedAt}:intro`, () => utt('gc-intro', GC_INTRO));
  // «🔁 Repetir»: olvida el hito de la ÚLTIMA línea (y solo ese) para relocutarla
  // sin recitar el diario entero.
  const last = g.log.length - 1;
  if (g.repeatNonce && !ctx.ledger.has(`${pre(g)}:rep${g.repeatNonce}`)) {
    ctx.ledger.mark(`${pre(g)}:rep${g.repeatNonce}`);
    ctx.ledger.clearPrefix(`${pre(g)}:log${last}`);
  }
  for (let i = 1; i < g.log.length; i++) {
    const txt = speakable(g.log[i].txt);
    if (txt) await ctx.sayOnce(`${pre(g)}:log${i}`, () => utt(`gc-log-${i}`, txt));
  }
}

/**
 * Al tomar el altavoz (relevo o recarga del móvil): dar por dichas la intro y
 * las líneas ya escritas salvo la última, que se relocuta para retomar el hilo.
 * Antes se re-narraba la partida entera desde la línea 1.
 */
function primeLedger(narrator: { ledger: Ledger }, g: GoodCopState | null): void {
  const led = narrator.ledger;
  led.resetFor(g?.startedAt ?? null); // fija la partida: el primer tick ya no borra esto
  led.forceReset();
  // Con 2 líneas (apertura + «Turno de X») aún no ha pasado nada: es el arranque
  // de la partida y toca locutarlo todo, intro incluida.
  if (!g || g.log.length <= 2) return;
  led.mark(`G${g.startedAt}:intro`);
  for (let i = 1; i < g.log.length - 1; i++) led.mark(`${pre(g)}:log${i}`);
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

export function installGoodCopNarrator(): void {
  const narrator = createNarrator<Snap>({
    getSnapshot: snapshot,
    sceneOf,
    gameIdOf: (s) => goodCopGame(s.group)?.startedAt ?? null,
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
      primeLedger(narrator, goodCopGame(s.group)); // (antes: respawn con resetLedger → re-narraba todo)
      narrator.respawn();
    }
    wasSpeaker = speaker;
    if (speaker) requestWakeLock();
    narrator.tick();
  });
}
