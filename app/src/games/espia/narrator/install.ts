// La voz de El Espía: un segundo narrador sobre el MISMO secuenciador genérico
// (core/narrator). Solo habla el dispositivo altavoz (masterId) y solo cuando
// la partida en curso es El Espía; convive con el narrador de Hombres Lobo sin
// pisarse (cada uno proyecta escena nula para el juego del otro).
import { createNarrator, type SceneCtx, type SceneDef } from '../../../core/narrator/sequencer';
import { pauseMs, profileOf } from '../../../core/narrator/pacing';
import { e2eTestMode } from '../../../core/test-hooks';
import { lastUtterance, play, stopSpeech } from '../../../core/audio/player';
import type { Utterance } from '../../../core/audio/player';
import { prewarmSynth } from '../../../core/audio/clips';
import { matchView, onChange, state } from '../../../core/sync/store.svelte';
import type { GroupDoc, PlayerDoc, Session } from '../../../core/sync/schema';
import { espiaGame } from '../actions';
import * as A from '../actions';
import { resolveConviction, timeupOrder } from '../engine';
import type { EspiaState } from '../types';
import {
  ESPIA_INTRO, LISTOS_PROMPT, RELOJ_START, RONDA_START, TIMEUP_LINE, VOTE_HINT, VOTE_HINT_TU,
  WARN_10S, WARN_HALF, WARN_MIN, cleanSpeech, outcomeSpeech, startAskLine, turnLine, voteFailLine,
  voteLine,
} from '../texts';

interface Snap {
  group: GroupDoc | null;
  players: PlayerDoc[];
  session: Session | null;
}

type Ctx = SceneCtx<Snap>;

const clip = (text: string): { kind: 'clip'; text: string } => ({ kind: 'clip', text });
const utt = (id: string, ...texts: string[]): Utterance => ({ id, segments: texts.map(clip), display: texts.join(' ') });

// La vista de la partida de El Espía cuya voz pone este dispositivo (la mesa
// puede tener varias partidas a la vez); sin ella, el grupo a secas.
function snapshot(): Snap {
  const g = state.group;
  const pid = state.session?.pid;
  const mine = g && pid
    ? state.matches.find((m) => m.gameId === 'espia' && m.masterId === pid && (m.members || []).includes(pid))
    : null;
  return { group: mine && g ? matchView(g, mine) : g, players: state.players, session: state.session };
}

/** ¿Este dispositivo pone la voz de El Espía? */
function amSpeaker(s: Snap): boolean {
  const g = s.group;
  if (!g || g.status !== 'playing' || !espiaGame(g) || !s.session) return false;
  if (g.masterId !== s.session.pid) return false;
  const p = s.players.find((x) => x.id === s.session!.pid);
  return !!p && p.deviceToken === s.session.token;
}

const gm = (ctx: Ctx): EspiaState => espiaGame(ctx.state().group)!;
const nm = (g: EspiaState, pid: string | null | undefined): string => (pid && g.names[pid]) || 'alguien';

// ——— Escenas ———

function sceneOf(s: Snap): SceneDef<Snap> | null {
  if (!amSpeaker(s)) return null;
  const game = espiaGame(s.group)!;
  const K = (rest: string) => `E${game.startedAt}:r${game.round}:${rest}`;
  // En pausa el narrador calla en seco (y el reloj no corre: nada que contar).
  if (game.paused) return { key: `E${game.startedAt}:paused:${game.paused.at}`, hardEntry: true, run: pausedScene };
  if (game.phase === 'reveal') return { key: K('reveal'), run: revealScene };
  if (game.vote) return { key: K(`vote:${game.voteSeq}`), run: voteScene };
  if (game.phase === 'play') return { key: K(`play:${game.voteSeq}`), run: playScene };
  if (game.phase === 'timeup') return { key: K(`tu:${game.timeupTurn}`), run: turnScene };
  if (game.phase === 'end') return { key: K('end'), run: endScene };
  return null;
}

async function pausedScene(ctx: Ctx): Promise<void> { await ctx.waitFor(() => false); }

async function revealScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  if (g.round === 1) await ctx.sayOnce(`E${g.startedAt}:intro`, () => utt('espia-intro', ESPIA_INTRO));
  await ctx.sayOnce(`E${g.startedAt}:r${g.round}:deal`, () => utt('espia-deal', RONDA_START[(g.round - 1) % RONDA_START.length]));
  await ctx.waitFor((s) => {
    const game = espiaGame(s.group);
    return !!game && (game.phase !== 'reveal' || game.playerIds.every((pid) => game.seen[pid]));
  });
  const g2 = gm(ctx);
  if (g2.phase === 'reveal') await ctx.sayOnce(`E${g2.startedAt}:r${g2.round}:listos`, () => utt('espia-listos', LISTOS_PROMPT));
}

async function playScene(ctx: Ctx): Promise<void> {
  const g0 = gm(ctx);
  const R = `E${g0.startedAt}:r${g0.round}`;
  await ctx.sayOnce(`${R}:start`, () => utt('espia-start',
    RELOJ_START[(g0.round - 1) % RELOJ_START.length], startAskLine(nm(g0, g0.dealerId))));
  // Avisos por hitos absolutos del reloj (mitad, último minuto, diez segundos).
  const marks: { at: number; key: string; mk: () => Utterance }[] = [
    { at: g0.durationMs / 2, key: `${R}:whalf`, mk: () => utt('espia-whalf', WARN_HALF) },
    { at: 60000, key: `${R}:wmin`, mk: () => utt('espia-wmin', WARN_MIN) },
    { at: 10000, key: `${R}:w10`, mk: () => utt('espia-w10', WARN_10S) },
  ].filter((m) => m.at > 15000 || m.at === 10000);
  for (const m of marks) {
    const g = gm(ctx);
    if (g.phase !== 'play' || g.deadline === null || g.paused) return;
    const remaining = g.deadline - Date.now();
    if (remaining <= m.at + 1500) continue; // hito ya pasado (reanudación tardía)
    await ctx.sleep(remaining - m.at);
    const gg = gm(ctx);
    if (gg.phase === 'play' && !gg.paused) await ctx.sayOnce(m.key, m.mk);
  }
  const g = gm(ctx);
  if (g.phase !== 'play' || g.deadline === null || g.paused) return;
  await ctx.sleep(Math.max(0, g.deadline - Date.now()) + 300);
  // El altavoz también dispara el fin de tiempo (además del vigilante de la UI).
  await A.timeUp().catch(() => { /* otro dispositivo se adelantó */ });
}

async function voteScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  const v = g.vote;
  if (!v) return;
  // Tras el tiempo NO hay reloj: ni se detiene ni vuelve a correr (V1).
  const tu = v.fromTimeup;
  // Precalienta los posibles desenlaces de ESTA votación (nombres incluidos).
  try {
    prewarmSynth([cleanSpeech(resolveConviction(g, v.accusedId, v.accuserId).txt), voteFailLine(nm(g, v.accusedId), tu)]);
  } catch { /* opcional */ }
  await ctx.sayOnce(`E${g.startedAt}:r${g.round}:vote:${g.voteSeq}`, () =>
    utt('espia-vote', voteLine(nm(g, v.accuserId), nm(g, v.accusedId), tu), tu ? VOTE_HINT_TU : VOTE_HINT));
  // Si la acusación cae, la escena de juego/turnos siguiente lo anuncia.
  await ctx.waitFor((s) => !espiaGame(s.group)?.vote);
  const g2 = gm(ctx);
  if (g2.phase === 'play' || g2.phase === 'timeup') {
    await ctx.play(utt('espia-votefail', voteFailLine(nm(g, v.accusedId), tu)));
  }
}

async function turnScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  await ctx.sayOnce(`E${g.startedAt}:r${g.round}:tuintro`, () => utt('espia-tuintro', TIMEUP_LINE));
  const holder = g.timeupTurn !== null ? timeupOrder(g)[g.timeupTurn] : null;
  if (holder) {
    await ctx.sayOnce(`E${g.startedAt}:r${g.round}:turn:${g.timeupTurn}`, () => utt('espia-turn', turnLine(nm(g, holder))));
  }
}

async function endScene(ctx: Ctx): Promise<void> {
  const g = gm(ctx);
  if (!g.outcome) return;
  await ctx.sleep(400);
  await ctx.sayOnce(`E${g.startedAt}:r${g.round}:end`, () => utt('espia-end', outcomeSpeech(g.outcome!, g)));
}

// ——— Instalación ———

let wakeLock: WakeLockSentinel | null = null;

async function requestWakeLock(): Promise<void> {
  try {
    if (!wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    }
  } catch {
    /* sin wake lock: la UI ya avisa de mantener la pantalla encendida */
  }
}

export function installEspiaNarrator(): void {
  const narrator = createNarrator<Snap>({
    getSnapshot: snapshot,
    sceneOf,
    gameIdOf: (s) => espiaGame(s.group)?.startedAt ?? null,
    play: (u, opts) => play(u, opts),
    stopSpeech,
    profileOf: (s) => profileOf(s.group?.settings?.pacing),
    isMuted: () => !!state.ui.muted,
    pauseMsFor: (key, profile) => (e2eTestMode() ? 40 : pauseMs(key, profile)), // e2e: colchones mínimos
  });

  let wasSpeaker = false;
  let repeatSeen: number | null = null;
  onChange(() => {
    const s = snapshot();
    const speaker = amSpeaker(s);
    // Relevo del altavoz en plena ronda: re-narra la escena actual.
    if (speaker && !wasSpeaker) narrator.respawn({ resetLedger: true });
    wasSpeaker = speaker;
    if (speaker) requestWakeLock();
    // «🔁 Repetir»: repite la ÚLTIMA locución (repeatNonce es señal de flanco,
    // no estado). Sin nada que repetir (recarga del altavoz), re-narra la escena.
    const game = espiaGame(s.group);
    const rn = game?.repeatNonce || 0;
    if (!game) repeatSeen = null;
    else if (repeatSeen === null) repeatSeen = rn;
    else if (rn !== repeatSeen) {
      repeatSeen = rn;
      if (speaker) {
        const last = lastUtterance();
        stopSpeech('hard');
        // Colchón tras el corte: algún motor se traga un play inmediato.
        if (last) setTimeout(() => { play(last, { muted: !!state.ui.muted }).catch(() => { /* nada */ }); }, 250);
        else narrator.respawn();
      }
    }
    narrator.tick();
  });
}
