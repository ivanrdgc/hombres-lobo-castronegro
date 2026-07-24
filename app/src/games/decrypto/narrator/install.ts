// Voz de «Decrypto»: narrador ligero. Solo habla el altavoz (masterId) de su
// partida. NUNCA dice palabras clave ni códigos; relata lo PÚBLICO leyendo el
// diario (turnos, intercepciones, errores, desenlace). Una línea, una vez.
import { createNarrator, type SceneCtx, type SceneDef } from '../../../core/narrator/sequencer';
import { pauseMs, profileOf } from '../../../core/narrator/pacing';
import { e2eTestMode } from '../../../core/test-hooks';
import { cleanForSpeech } from '../../../core/util/speech';
import { play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { matchView, onChange, state } from '../../../core/sync/store.svelte';
import type { GroupDoc, PlayerDoc, Session } from '../../../core/sync/schema';
import { decryptoGame } from '../actions';
import { DE_INTRO } from '../texts';
import type { DecryptoState } from '../types';

interface Snap { group: GroupDoc | null; players: PlayerDoc[]; session: Session | null }
type Ctx = SceneCtx<Snap>;

const clip = (text: string): { kind: 'clip'; text: string } => ({ kind: 'clip', text });
const utt = (id: string, text: string): Utterance => ({ id, segments: [clip(text)], display: text });
const speakable = cleanForSpeech; // limpieza COMPLETA para la voz (emojis en medio, abreviaturas)

function snapshot(): Snap {
  const g = state.group;
  const pid = state.session?.pid;
  const mine = g && pid
    ? state.matches.find((m) => m.gameId === 'decrypto' && m.masterId === pid && (m.members || []).includes(pid))
    : null;
  return { group: mine && g ? matchView(g, mine) : g, players: state.players, session: state.session };
}

function amSpeaker(s: Snap): boolean {
  const g = s.group;
  if (!g || g.status !== 'playing' || !decryptoGame(g) || !s.session) return false;
  if (g.masterId !== s.session.pid) return false;
  const p = s.players.find((x) => x.id === s.session!.pid);
  return !!p && p.deviceToken === s.session.token;
}

const gm = (ctx: Ctx): DecryptoState => decryptoGame(ctx.state().group)!;

// Hito de una línea del diario. Acaba en «:» a propósito: así clearPrefix de la
// línea 1 borra ESA y no la 10, la 11…
const logKey = (g: DecryptoState, i: number): string => `D${g.startedAt}:log:${i}:`;

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amSpeaker(s)) return null;
  const g = decryptoGame(s.group)!;
  if (g.paused) return { key: `D${g.startedAt}:paused:${g.paused.at}`, hardEntry: true, run: pausedScene };
  // El nonce de «🔁 Repetir» va en la CLAVE: sin él la escena no cambiaba y el
  // botón del menú ⋯ no hacía absolutamente nada.
  return { key: `D${g.startedAt}:log${g.log.length}:r${g.repeatNonce || 0}`, run: logScene };
}

async function pausedScene(ctx: Ctx): Promise<void> { await ctx.waitFor(() => false); }

async function logScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  // Solo se re-entra aquí con una línea nueva, al pulsar «🔁 Repetir» o al
  // relevar el altavoz: en los tres casos lo que la mesa quiere oír es la
  // última línea, así que se olvida su hito y se vuelve a decir.
  ctx.ledger.clearPrefix(logKey(g, g.log.length - 1));
  await ctx.sayOnce(`D${g.startedAt}:intro`, () => utt('de-intro', DE_INTRO));
  for (let i = 1; i < g.log.length; i++) {
    const txt = speakable(g.log[i].txt);
    if (txt) await ctx.sayOnce(logKey(g, i), () => utt(`de-log-${i}`, txt));
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

export function installDecryptoNarrator(): void {
  const narrator = createNarrator<Snap>({
    getSnapshot: snapshot,
    sceneOf,
    gameIdOf: (s) => decryptoGame(s.group)?.startedAt ?? null,
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
