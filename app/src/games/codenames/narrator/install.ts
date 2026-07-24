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

// Clave de hito de una línea del diario. Acaba en «:» a propósito: así
// clearPrefix('…:log:1:') borra ESA línea y no la 10, la 11…
const logKey = (g: CodenamesState, i: number): string => `N${g.startedAt}:log:${i}:`;
const introKey = (g: CodenamesState): string => `N${g.startedAt}:intro`;

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amSpeaker(s)) return null;
  const g = codenamesGame(s.group)!;
  if (g.paused) return { key: `N${g.startedAt}:paused:${g.paused.at}`, hardEntry: true, run: pausedScene };
  // El nonce de «🔁 Repetir» va en la CLAVE: sin él la escena no cambiaba y el
  // botón no hacía nada. Al re-entrar, logScene olvida el hito de la última
  // línea (la pista, que es justo lo que la mesa pide repetir).
  return { key: `N${g.startedAt}:log${g.log.length}:r${g.repeatNonce || 0}`, run: logScene };
}

async function pausedScene(ctx: Ctx): Promise<void> { await ctx.waitFor(() => false); }

async function logScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  // Solo se re-entra aquí al llegar una línea nueva (su hito aún no existe), al
  // pulsar «🔁 Repetir» o al respawnear: en todos los casos la última línea es
  // la que hay que decir (o volver a decir).
  ctx.ledger.clearPrefix(logKey(g, g.log.length - 1));
  await ctx.sayOnce(introKey(g), () => utt('cn-intro', CN_INTRO));
  // Desde la línea 0: ahí es donde se dice qué equipo empieza y qué Jefe abre.
  for (let i = 0; i < g.log.length; i++) {
    const txt = speakable(g.log[i].txt);
    if (txt) await ctx.sayOnce(logKey(g, i), () => utt(`cn-log-${i}`, txt));
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
    if (speaker && !wasSpeaker) {
      // Relevo o RECARGA del altavoz (Safari descarta pestañas de fondo): sin
      // esto se releía el diario entero, 20-40 líneas con todas las
      // revelaciones. Se dan por dichas las líneas viejas y se arranca por la
      // última, que es la que la mesa necesita oír ahora.
      const g = codenamesGame(s.group);
      // resetFor fija la partida del ledger ANTES de marcar: si no, el tick de
      // respawn la vería nueva y borraría justo lo que acabamos de marcar.
      narrator.ledger.resetFor(g?.startedAt ?? null);
      narrator.ledger.forceReset();
      if (g && g.log.length > 1) {
        narrator.ledger.mark(introKey(g));
        for (let i = 0; i < g.log.length - 1; i++) narrator.ledger.mark(logKey(g, i));
      }
      narrator.respawn();
    }
    wasSpeaker = speaker;
    if (speaker) requestWakeLock();
    narrator.tick();
  });
}
