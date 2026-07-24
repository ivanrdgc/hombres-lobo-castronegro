// Acciones de «Decrypto» sobre Firestore. Estado en el doc de su partida
// (matches/<mid>); los docs de jugador no se tocan. La app custodia las
// palabras de cada equipo (solo su equipo las ve) y el código de la ronda (solo
// el encriptador). Cada función envuelve el motor puro. Transacciones «primero
// gana».
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import {
  MIN_PLAYERS, MAX_PLAYERS, dealGame, beginTransmission, giveClues as giveCluesMut,
  submitIntercept as submitInterceptMut, submitDecode as submitDecodeMut,
  nextTransmission as nextTransmissionMut, relieveEncoder as relieveEncoderMut,
  resetForRematch, teamOf, teamMembers, encoderId,
  isEncoder, interceptorsCanPlay, other, cluesForWord, pendingWin,
} from './engine';
import type { DecryptoState } from './types';

export function decryptoGame(g: GroupDoc | null): DecryptoState | null {
  const game = g?.game as unknown as DecryptoState | null;
  return game && game.decrypto ? game : null;
}

interface TxExtra { game: DecryptoState; members?: string[]; masterPatch?: string | null }
type TxFn = (game: DecryptoState, m: MatchDoc) => DecryptoState | TxExtra | null | undefined;

async function tx(fn: TxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('decrypto');
  if (!id) return;
  await txWithRetry(async (t) => {
    const snap = await t.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as DecryptoState | null;
    if (!game || !game.decrypto) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as DecryptoState;
    const res = fn(copy, m);
    if (!res) return;
    const extra = ('game' in res ? res : { game: res }) as TxExtra;
    const patch: Record<string, unknown> = { game: sanitize(extra.game) };
    if (extra.members) patch.members = sanitize(extra.members);
    if (extra.masterPatch !== undefined) patch.masterId = extra.masterPatch;
    t.update(mref(slug, id), patch);
  });
}

// Semilla que avanza con cada transmisión (códigos distintos, deterministas).
const seedFor = (game: DecryptoState) => (game.seed || 1) + game.round * 100 + (game.active === 'blue' ? 7 : 0);

// ——— Inicio ———

export async function startDecrypto(playerIds: string[], narratorId: string | null): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Decrypto necesita al menos ${MIN_PLAYERS} jugadores (dos por equipo).`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`Decrypto admite ${MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const speaker = narratorId || myPid();
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const deal = dealGame(playerIds, seed);
  const game: DecryptoState = {
    decrypto: true, phase: 'clue', startedAt: now, seed, round: 1,
    playerIds, names, teams: deal.teams, words: deal.words,
    encoderIdx: { red: 0, blue: 0 }, active: 'red', code: [1, 2, 3], clues: null,
    intercept: null, decode: null,
    tokens: { red: { intercepts: 0, errors: 0 }, blue: { intercepts: 0, errors: 0 } },
    history: [], usedCodes: { red: [], blue: [] }, winner: null, winReason: null,
    scores: Object.fromEntries(playerIds.map((p) => [p, 0])), paused: null, repeatNonce: 0,
    log: [{ txt: '🔐 Comienza Decrypto. Cada equipo tiene 4 palabras clave (solo suyas). Transmite un código de 3 cifras a los tuyos… sin que el rival lo intercepte.' }],
  };
  beginTransmission(game, seed);
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, [...new Set([...playerIds, speaker])]);
    t.update(gref(slug), { lastNarratorId: speaker });
    t.set(mref(slug, mid), sanitize({
      gameId: 'decrypto', createdAt: now,
      members: [...new Set([...playerIds, speaker])],
      masterId: speaker, lastNarratorId: speaker, settings: {}, extraRoles: [], game,
    }));
  });
}

// ——— Jugadas ———

export async function giveClues(clues: [string, string, string]): Promise<void> {
  const me = myPid();
  await tx((game) => (giveCluesMut(game, me, clues) ? game : null));
}
export async function submitIntercept(guess: [number, number, number]): Promise<void> {
  const me = myPid();
  await tx((game) => (submitInterceptMut(game, me, guess) ? game : null));
}
export async function submitDecode(guess: [number, number, number]): Promise<void> {
  const me = myPid();
  await tx((game) => (submitDecodeMut(game, me, guess) ? game : null));
}
export async function nextTransmission(): Promise<void> {
  await tx((game) => (nextTransmissionMut(game, seedFor(game) + 3) ? game : null));
}
/** Relevo del encriptador (móvil muerto o ausencia): lo pide alguien de su equipo. */
export async function relieveEncoder(): Promise<void> {
  const me = myPid();
  await tx((game) => (relieveEncoderMut(game, me, seedFor(game) + 41) ? game : null));
}

// ——— Revancha / fin ———

export async function playAgain(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    resetForRematch(game, (game.seed || 0) + 101);
    game.log.push({ txt: '🔁 Nueva partida: palabras nuevas para cada equipo.' });
    return game;
  });
}
export async function endDecrypto(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('decrypto');
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

registerMatchTools('decrypto', {
  leave: (mid) => endDecrypto(mid),
  end: (mid) => endDecrypto(mid),
  leaveEndsMatch: true,
});

export { teamOf, teamMembers, encoderId, isEncoder, interceptorsCanPlay, other, cluesForWord, pendingWin };
