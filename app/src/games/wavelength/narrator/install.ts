// Voz de «Wavelength»: narrador ligero. Solo habla el altavoz (masterId) de su
// partida. NUNCA dice el objetivo del dial hasta el resultado; anuncia el
// espectro (público), quién es el Psíquico y la puntuación de la ronda.
import { createNarrator, type SceneCtx, type SceneDef } from '../../../core/narrator/sequencer';
import { pauseMs, profileOf } from '../../../core/narrator/pacing';
import { e2eTestMode } from '../../../core/test-hooks';
import { play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { matchView, onChange, state } from '../../../core/sync/store.svelte';
import type { GroupDoc, PlayerDoc, Session } from '../../../core/sync/schema';
import { wavelengthGame, psychicId } from '../actions';
import type { WavelengthState } from '../types';
import { WL_INTRO, GUESS_LINE, roundLine, resultLine, finalLine } from '../texts';

interface Snap { group: GroupDoc | null; players: PlayerDoc[]; session: Session | null }
type Ctx = SceneCtx<Snap>;

const clip = (text: string): { kind: 'clip'; text: string } => ({ kind: 'clip', text });
const utt = (id: string, ...texts: string[]): Utterance => ({ id, segments: texts.map(clip), display: texts.join(' ') });

function snapshot(): Snap {
  const g = state.group;
  const pid = state.session?.pid;
  const mine = g && pid
    ? state.matches.find((m) => m.gameId === 'wavelength' && m.masterId === pid && (m.members || []).includes(pid))
    : null;
  return { group: mine && g ? matchView(g, mine) : g, players: state.players, session: state.session };
}

function amSpeaker(s: Snap): boolean {
  const g = s.group;
  if (!g || g.status !== 'playing' || !wavelengthGame(g) || !s.session) return false;
  if (g.masterId !== s.session.pid) return false;
  const p = s.players.find((x) => x.id === s.session!.pid);
  return !!p && p.deviceToken === s.session.token;
}

const gm = (ctx: Ctx): WavelengthState => wavelengthGame(ctx.state().group)!;
const nm = (g: WavelengthState, pid: string | null | undefined): string => (pid && g.names[pid]) || 'alguien';

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amSpeaker(s)) return null;
  const g = wavelengthGame(s.group)!;
  const C = `W${g.startedAt}:r${g.round}`;
  if (g.paused) return { key: `W${g.startedAt}:paused:${g.paused.at}`, hardEntry: true, run: pausedScene };
  // El nonce de «🔁 Repetir» va en la clave de escena Y en los hitos de sayOnce:
  // sin él, la escena se reiniciaba pero el hito ya estaba marcado y no sonaba
  // nada (y la de resultado ni siquiera cambiaba de clave).
  const rf = g.repeatNonce || 0;
  switch (g.phase) {
    case 'clue': return { key: `${C}:clue:${rf}`, run: clueScene };
    case 'guess': return { key: `${C}:guess:${rf}`, run: guessScene };
    case 'result': return { key: `${C}:result:${rf}`, run: resultScene };
    case 'end': return { key: `W${g.startedAt}:end:${rf}`, run: endScene };
    default: return null;
  }
}

/** Sufijo de repetición para los hitos: mismo estado + otro nonce = otra vez. */
const rep = (g: WavelengthState): string => `:r${g.repeatNonce || 0}`;

async function pausedScene(ctx: Ctx): Promise<void> { await ctx.waitFor(() => false); }

async function clueScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  if (g.round === 1 && !g.clue) await ctx.sayOnce(`W${g.startedAt}:intro${rep(g)}`, () => utt('wl-intro', WL_INTRO));
  await ctx.sayOnce(`W${g.startedAt}:r${g.round}:clue${rep(g)}`, () =>
    utt('wl-clue', roundLine(g.spectrumId, nm(g, psychicId(g)))));
}

async function guessScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sayOnce(`W${g.startedAt}:r${g.round}:guess${rep(g)}`, () => utt('wl-guess', GUESS_LINE));
}

async function resultScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  if (g.lastScore === null || g.marker === null) return;
  await ctx.sleep(400);
  await ctx.sayOnce(`W${g.startedAt}:r${g.round}:result${rep(g)}`, () =>
    utt('wl-result', resultLine(g.target, g.marker!, g.lastScore!, nm(g, psychicId(g)))));
}

async function endScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sayOnce(`W${g.startedAt}:end${rep(g)}`, () => utt('wl-end', finalLine(g.teamScore, g.scored || 0)));
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

export function installWavelengthNarrator(): void {
  const narrator = createNarrator<Snap>({
    getSnapshot: snapshot,
    sceneOf,
    gameIdOf: (s) => wavelengthGame(s.group)?.startedAt ?? null,
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
