// Acciones de «Love Letter» sobre Firestore. Estado en el doc de su partida
// (matches/<mid>); los docs de jugador no se tocan. La app custodia el mazo y
// las manos (cada uno solo ve la suya y lo que el Sacerdote le deje mirar) y
// resuelve los efectos. Cada función envuelve el motor puro. Transacciones
// «primero gana».
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import {
  MIN_PLAYERS, MAX_PLAYERS, tokensToWin, dealRound, playCard as playCardMut, startRound,
  dropOut, validTargets, playableIdx, countessForced, isAlive, aliveIds, myHand, myPeek, outCounts,
} from './engine';
import type { Card } from './cards';
import type { LoveLetterState } from './types';

export function loveLetterGame(g: GroupDoc | null): LoveLetterState | null {
  const game = g?.game as unknown as LoveLetterState | null;
  return game && game.loveletter ? game : null;
}

interface TxExtra { game: LoveLetterState; members?: string[]; masterPatch?: string | null }
type TxFn = (game: LoveLetterState, m: MatchDoc) => LoveLetterState | TxExtra | null | undefined;

async function tx(fn: TxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('love_letter');
  if (!id) return;
  await txWithRetry(async (t) => {
    const snap = await t.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as LoveLetterState | null;
    if (!game || !game.loveletter) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as LoveLetterState;
    const res = fn(copy, m);
    if (!res) return;
    const extra = ('game' in res ? res : { game: res }) as TxExtra;
    const patch: Record<string, unknown> = { game: sanitize(extra.game) };
    if (extra.members) patch.members = sanitize(extra.members);
    if (extra.masterPatch !== undefined) patch.masterId = extra.masterPatch;
    t.update(mref(slug, id), patch);
  });
}

// ——— Inicio ———

/** `track`: ¿la app marca lo que ya ha salido? Es ajuste de MESA (se recuerda en
 *  `group.settings.llTrack`), pero la partida se queda con una FOTO: cambiarlo a
 *  media partida no cambiaría las reglas con las que se empezó (B33). */
export async function startLoveLetter(playerIds: string[], narratorId: string | null, track = true): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Love Letter necesita al menos ${MIN_PLAYERS} jugadores.`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`Love Letter admite ${MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const speaker = narratorId || myPid();
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const starter = playerIds[seed % playerIds.length];
  const deal = dealRound(playerIds, seed);
  const game: LoveLetterState = {
    loveletter: true, phase: 'turn', startedAt: now, seed, round: 1,
    playerIds, names,
    deck: deal.deck, aside: deal.aside, asideUsed: false, asideUp: deal.asideUp,
    hands: deal.hands, discards: Object.fromEntries(playerIds.map((p) => [p, []])),
    alive: Object.fromEntries(playerIds.map((p) => [p, true])),
    protected: Object.fromEntries(playerIds.map((p) => [p, false])),
    turn: starter, starter, peeks: {}, roundResult: null,
    tokens: Object.fromEntries(playerIds.map((p) => [p, 0])), need: tokensToWin(playerIds.length),
    winner: null, scores: Object.fromEntries(playerIds.map((p) => [p, 0])),
    paused: null, repeatNonce: 0,
    // Esta línea SÍ se locuta (el narrador arranca en el índice 0): es donde la
    // mesa se entera de cuántos favores hacen falta, que depende de cuántos sois.
    log: [{ txt: `💌 Comienza Love Letter con ${playerIds.length} jugadores. Gana quien acumule ${tokensToWin(playerIds.length)} favores.` }],
  };
  // El jugador inicial roba su 2ª carta.
  startRound(game, seed);
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, [...new Set([...playerIds, speaker])]);
    t.update(gref(slug), { lastNarratorId: speaker });
    t.set(mref(slug, mid), sanitize({
      gameId: 'love_letter', createdAt: now,
      members: [...new Set([...playerIds, speaker])],
      masterId: speaker, lastNarratorId: speaker, settings: { llTrack: track }, extraRoles: [], game,
    }));
  });
}

// ——— Jugadas ———

export async function playCard(idx: number, target: string | null, guess: Card | null): Promise<void> {
  const me = myPid();
  await tx((game) => (playCardMut(game, me, idx, { target, guess }) ? game : null));
}

/** Descarta el vistazo privado una vez leído (solo lo quita su dueño). */
export async function clearPeek(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (!game.peeks || !game.peeks[me]) return null;
    delete game.peeks[me];
    return game;
  }, undefined, { allowPaused: true });
}

/** El máster retira de la ronda a un jugador ausente (móvil muerto) para que la
 *  partida siga; sacarlo de la mesa, en cambio, cerraría la partida entera. */
export async function dropPlayer(pid: string): Promise<void> {
  await tx((game, m) => {
    if (m.masterId !== myPid()) return null;
    return dropOut(game, pid) ? game : null;
  });
}

export async function nextRound(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'roundEnd') return null;
    game.round += 1;
    // El cartel va ANTES del reparto: startRound ya anuncia de quién es el turno.
    game.log.push({ txt: `🔁 Ronda ${game.round}: cartas repartidas.` });
    startRound(game, (game.seed || 0) + game.round * 131);
    return game;
  });
}

// ——— Revancha / fin ———

export async function playAgain(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    game.round = 1;
    game.tokens = Object.fromEntries(game.playerIds.map((p) => [p, 0]));
    game.winner = null;
    game.log.push({ txt: '🔁 Nueva partida: favores a cero y cartas repartidas.' });
    startRound(game, (game.seed || 0) + 997);
    return game;
  });
}

export async function endLoveLetter(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('love_letter');
  if (!id) return;
  await deleteDoc(mref(mySlug(), id));
}

// ——— Pausa / repetir ———

export async function pauseGame(): Promise<void> {
  await tx((game) => {
    if (game.phase === 'end' || game.paused) return null;
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

// Una partida depende del reparto y del mazo: sacar a alguien la invalida. Si
// lo que falla es un móvil a mitad de ronda no hace falta llegar a esto: el
// máster usa `dropPlayer` y la ronda sigue sin el ausente.
registerMatchTools('love_letter', {
  leave: (mid) => endLoveLetter(mid),
  end: (mid) => endLoveLetter(mid),
  leaveEndsMatch: true,
});

export { validTargets, playableIdx, countessForced, isAlive, aliveIds, myHand, myPeek, outCounts };
