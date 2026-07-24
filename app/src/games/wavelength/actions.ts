// Acciones de «Wavelength» sobre Firestore. Estado en el doc de su partida
// (matches/<mid>); los docs de jugador no se tocan. La app custodia el objetivo
// del dial (solo lo ve el Psíquico) y puntúa la cercanía. Transacciones
// «primero gana».
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import { MIN_PLAYERS, MAX_PLAYERS, dealRound, scoreFor, psychicId, scoreLabel, goalMet } from './engine';
import { SPECTRUMS, spectrumById, spectrumLabel } from './spectrums';
import type { Goal, WavelengthState } from './types';

export function wavelengthGame(g: GroupDoc | null): WavelengthState | null {
  const game = g?.game as unknown as WavelengthState | null;
  return game && game.wavelength ? game : null;
}

interface TxExtra { game: WavelengthState; members?: string[]; masterPatch?: string | null }
type TxFn = (game: WavelengthState, m: MatchDoc) => WavelengthState | TxExtra | null | undefined;

async function tx(fn: TxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('wavelength');
  if (!id) return;
  await txWithRetry(async (t) => {
    const snap = await t.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as WavelengthState | null;
    if (!game || !game.wavelength) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as WavelengthState;
    const res = fn(copy, m);
    if (!res) return;
    const extra = ('game' in res ? res : { game: res }) as TxExtra;
    const patch: Record<string, unknown> = { game: sanitize(extra.game) };
    if (extra.members) patch.members = sanitize(extra.members);
    if (extra.masterPatch !== undefined) patch.masterId = extra.masterPatch;
    t.update(mref(slug, id), patch);
  });
}

const nameOf = (g: WavelengthState, pid: string | null | undefined) => (pid && g.names[pid]) || '¿?';

// ——— Inicio ———

export async function startWavelength(playerIds: string[], narratorId: string | null, goal: Goal | null = null): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Wavelength necesita al menos ${MIN_PLAYERS} jugadores.`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`Wavelength admite ${MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const speaker = narratorId || myPid();
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const deal = dealRound([], seed);
  const zeros = () => Object.fromEntries(playerIds.map((p) => [p, 0]));
  const game: WavelengthState = {
    wavelength: true, phase: 'clue', startedAt: now, seed, round: 1,
    playerIds, names, psychicIdx: seed % playerIds.length,
    spectrumId: deal.spectrumId, target: deal.target, clue: false, clueText: '',
    pick: null, pickBy: null, marker: null,
    lastScore: null, scores: zeros(), psychicRounds: zeros(), teamScore: 0, scored: 0, goal,
    usedSpectrums: [deal.spectrumId], paused: null, repeatNonce: 0,
    log: [{
      txt: `📡 Comienza Wavelength con ${playerIds.length} jugadores${goal ? ` · meta: ${goal.label.toLowerCase()}` : ''}. El Psíquico ve el objetivo del dial y os pone en sintonía con una pista.`,
    }],
  };
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, [...new Set([...playerIds, speaker])]);
    t.update(gref(slug), { lastNarratorId: speaker });
    t.set(mref(slug, mid), sanitize({
      gameId: 'wavelength', createdAt: now,
      members: [...new Set([...playerIds, speaker])],
      masterId: speaker, lastNarratorId: speaker, settings: {}, extraRoles: [], game,
    }));
  });
}

/** El Psíquico ya ha dado su pista en voz alta: el equipo puede colocar el
 *  marcador. `text` es opcional (la pista escrita, para releerla en el debate). */
export async function giveClue(text = ''): Promise<void> {
  const me = myPid();
  const clueText = text.trim().slice(0, 60);
  await tx((game) => {
    if (game.phase !== 'clue' || me !== psychicId(game)) return null;
    game.clue = true;
    game.clueText = clueText;
    game.phase = 'guess';
    game.log.push({
      txt: clueText
        ? `💬 La pista de ${nameOf(game, me)} es «${clueText}». El equipo coloca el marcador en el dial.`
        : `💬 ${nameOf(game, me)} ya ha dado su pista. El equipo coloca el marcador en el dial.`,
    });
    return game;
  });
}

/** El Psíquico cambia de espectro sin gastar la ronda: si se ha atascado con
 *  este par, la salida era «Terminar» (que borraba la partida entera). */
export async function newSpectrum(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'clue' || me !== psychicId(game)) return null;
    const seed = (game.seed || 0) + 977;
    const deal = dealRound(game.usedSpectrums, seed);
    game.seed = seed;
    game.spectrumId = deal.spectrumId;
    game.target = deal.target;
    game.usedSpectrums = game.usedSpectrums.length >= SPECTRUMS.length ? [deal.spectrumId] : [...game.usedSpectrums, deal.spectrumId];
    game.log.push({ txt: `🔀 ${nameOf(game, me)} ha cambiado de espectro: ${spectrumLabel(game.spectrumId)}.` });
    return game;
  });
}

/** Mueve la marca del equipo, PÚBLICA: sin esto cada móvil arrastraba la suya y
 *  solo contaba la de quien pulsaba (la mesa ni se enteraba de cuál iba a fijar). */
export async function movePick(pos: number): Promise<void> {
  const me = myPid();
  const val = Math.max(0, Math.min(100, Math.round(pos)));
  await tx((game) => {
    if (game.phase !== 'guess' || !game.playerIds.includes(me) || me === psychicId(game)) return null;
    if (game.pick === val) return null;
    game.pick = val;
    game.pickBy = me;
    return game;
  });
}

/** El equipo fija la marca que hay puesta (la registra cualquiera menos el
 *  Psíquico) y se puntúa. Sin marca movida no hay nada que fijar. */
export async function castGuess(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'guess' || !game.playerIds.includes(me) || me === psychicId(game)) return null;
    if (game.pick === null || game.pick === undefined) return null;
    const marker = Math.max(0, Math.min(100, Math.round(game.pick)));
    game.marker = marker;
    const pts = scoreFor(game.target, marker);
    game.lastScore = pts;
    const psy = psychicId(game);
    game.scores[psy] = (game.scores[psy] || 0) + pts;
    game.psychicRounds[psy] = (game.psychicRounds[psy] || 0) + 1;
    game.teamScore += pts;
    game.scored = (game.scored || 0) + 1;
    game.phase = 'result';
    game.log.push({ txt: `🎯 El objetivo estaba en ${game.target}, el equipo marcó ${marker}. ${scoreLabel(pts)} para ${nameOf(game, psy)}. Total del equipo: ${game.teamScore}.` });
    if (goalMet(game)) game.log.push({ txt: `🏁 Meta cumplida (${game.goal!.label.toLowerCase()}): podéis ver el resumen o seguir jugando.` });
    return game;
  });
}

/** Reparto de la siguiente ronda (lo comparten «otra ronda» y «saltar»). */
function dealNext(game: WavelengthState): void {
  const seed = (game.seed || 0) + 101;
  const deal = dealRound(game.usedSpectrums, seed);
  game.seed = seed;
  game.round += 1;
  game.psychicIdx = (game.psychicIdx + 1) % game.playerIds.length;
  game.spectrumId = deal.spectrumId;
  game.target = deal.target;
  game.clue = false;
  game.clueText = '';
  game.pick = null;
  game.pickBy = null;
  game.marker = null;
  game.lastScore = null;
  game.phase = 'clue';
  game.usedSpectrums = game.usedSpectrums.length >= SPECTRUMS.length ? [deal.spectrumId] : [...game.usedSpectrums, deal.spectrumId];
}

/** Nueva ronda: rota el Psíquico y cambia el espectro y el objetivo. */
export async function nextRound(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'result') return null;
    dealNext(game);
    game.log.push({ txt: `📡 Ronda ${game.round}: nuevo espectro y nuevo Psíquico (${nameOf(game, psychicId(game))}).` });
    return game;
  });
}

/** Salida no destructiva para cualquiera (menú ⋯): la ronda se anula y pasa el
 *  turno. Sirve cuando el Psíquico deja el móvil, se atasca o se pierde la pista. */
export async function skipRound(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    // En el resultado la ronda ya está puntuada: ahí lo que toca es «otra ronda».
    if (game.phase !== 'clue' && game.phase !== 'guess') return null;
    // Puede pulsarlo quien no juega (el dispositivo de la voz): su nombre no
    // está en `names`, se busca en la mesa.
    const who = game.names[me] || state.players.find((p) => p.id === me)?.name || 'alguien';
    game.log.push({ txt: `⏭️ Ronda ${game.round} saltada por ${who}: no puntúa.` });
    dealNext(game);
    game.log.push({ txt: `📡 Ronda ${game.round}: nuevo espectro y nuevo Psíquico (${nameOf(game, psychicId(game))}).` });
    return game;
  });
}

/** Cierra la partida con resumen (no borra nada: la fase «end» lo enseña). */
export async function finishGame(): Promise<void> {
  await tx((game) => {
    if (game.phase === 'end') return null;
    game.phase = 'end';
    game.log.push({ txt: `🏁 Fin de la partida: ${game.teamScore} puntos de equipo en ${game.scored || 0} rondas.` });
    return game;
  });
}

/** Otra partida con la misma gente y la misma meta: marcador a cero. */
export async function playAgain(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    const zeros = () => Object.fromEntries(game.playerIds.map((p) => [p, 0]));
    game.round = 0; // dealNext lo sube a 1 y rota el Psíquico donde tocaba
    dealNext(game);
    game.scores = zeros();
    game.psychicRounds = zeros();
    game.teamScore = 0;
    game.scored = 0;
    game.log.push({ txt: '🔁 Nueva partida: marcador a cero.' });
    return game;
  });
}

export async function endWavelength(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('wavelength');
  if (!id) return;
  await deleteDoc(mref(mySlug(), id));
}

// ——— Pausa / repetir ———

export async function pauseGame(): Promise<void> {
  await tx((game) => {
    if (game.paused) return null;
    const who = state.players.find((p) => p.id === myPid());
    game.paused = { by: myPid(), name: who?.name || 'alguien', at: Date.now() };
    return game;
  }, undefined, { allowPaused: true });
}
export async function resumeGame(): Promise<void> {
  await tx((game) => { if (!game.paused) return null; game.paused = null; return game; }, undefined, { allowPaused: true });
}
export async function requestRepeat(): Promise<void> {
  await tx((game) => { game.repeatNonce = (game.repeatNonce || 0) + 1; return game; }, undefined, { allowPaused: true });
}

// Una partida de Wavelength vive de que el Psíquico rote entre los presentes:
// sacar a alguien invalida la ronda, así que ambos casos la terminan.
registerMatchTools('wavelength', {
  leave: (mid) => endWavelength(mid),
  end: (mid) => endWavelength(mid),
  leaveEndsMatch: true,
});

export { psychicId, spectrumById };
