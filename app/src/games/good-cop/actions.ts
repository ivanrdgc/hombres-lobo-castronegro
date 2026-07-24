// Acciones de «Good Cop Bad Cop» sobre Firestore. Estado en el doc de su
// partida (matches/<mid>); los docs de jugador no se tocan. La app custodia las
// cartas de integridad (cada uno ve las suyas y lo que investigue) y resuelve
// disparos y victoria. Cada función envuelve el motor puro. Transacciones
// «primero gana».
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import {
  MIN_PLAYERS, MAX_PLAYERS, dealGame, investigate as investigateMut, arm as armMut,
  aim as aimMut, shoot as shootMut, resetForRematch, isAlive, aliveIds, bandOfPid, leaderId,
  isLeader, nextAlive,
} from './engine';
import type { GoodCopState } from './types';

export function goodCopGame(g: GroupDoc | null): GoodCopState | null {
  const game = g?.game as unknown as GoodCopState | null;
  return game && game.goodcop ? game : null;
}

interface TxExtra { game: GoodCopState; members?: string[]; masterPatch?: string | null }
type TxFn = (game: GoodCopState, m: MatchDoc) => GoodCopState | TxExtra | null | undefined;

async function tx(fn: TxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('good_cop');
  if (!id) return;
  await txWithRetry(async (t) => {
    const snap = await t.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as GoodCopState | null;
    if (!game || !game.goodcop) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as GoodCopState;
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

export async function startGoodCop(playerIds: string[], narratorId: string | null): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Good Cop Bad Cop necesita al menos ${MIN_PLAYERS} jugadores.`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`Good Cop Bad Cop admite ${MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const speaker = narratorId || myPid();
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const deal = dealGame(playerIds, seed);
  const game: GoodCopState = {
    goodcop: true, phase: 'turn', startedAt: now, seed,
    playerIds, names, cards: deal.cards,
    alive: Object.fromEntries(playerIds.map((p) => [p, true])),
    armed: Object.fromEntries(playerIds.map((p) => [p, false])),
    aimAt: Object.fromEntries(playerIds.map((p) => [p, null])),
    turn: playerIds[seed % playerIds.length], peek: null,
    winner: null, winReason: null,
    scores: Object.fromEntries(playerIds.map((p) => [p, 0])), paused: null, repeatNonce: 0,
    log: [{ txt: '🚔 Comienza Good Cop Bad Cop. Cada uno esconde 3 cartas de integridad: tu bando es su mayoría. Encontrad al líder rival… y disparadle.' }],
  };
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, [...new Set([...playerIds, speaker])]);
    t.update(gref(slug), { lastNarratorId: speaker });
    t.set(mref(slug, mid), sanitize({
      gameId: 'good_cop', createdAt: now,
      members: [...new Set([...playerIds, speaker])],
      masterId: speaker, lastNarratorId: speaker, settings: {}, extraRoles: [], game,
    }));
  });
}

// ——— Acciones del turno ———

export async function investigate(target: string, idx: number): Promise<void> {
  const me = myPid();
  await tx((game) => (investigateMut(game, me, target, idx) ? game : null));
}
export async function arm(): Promise<void> {
  const me = myPid();
  await tx((game) => (armMut(game, me) ? game : null));
}
export async function aim(target: string): Promise<void> {
  const me = myPid();
  await tx((game) => (aimMut(game, me, target) ? game : null));
}
export async function shoot(): Promise<void> {
  const me = myPid();
  await tx((game) => (shootMut(game, me) ? game : null));
}
/** Descarta el resultado de investigar una vez leído (solo quien miró). */
export async function clearPeek(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (!game.peek || game.peek.by !== me) return null;
    game.peek = null;
    return game;
  }, undefined, { allowPaused: true });
}

// ——— Revancha / fin ———

export async function playAgain(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    resetForRematch(game, (game.seed || 0) + 101);
    game.log.push({ txt: '🔁 Nueva partida: cartas de integridad repartidas de nuevo.' });
    return game;
  });
}
export async function endGoodCop(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('good_cop');
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

registerMatchTools('good_cop', {
  leave: (mid) => endGoodCop(mid),
  end: (mid) => endGoodCop(mid),
  leaveEndsMatch: true,
});

export { isAlive, aliveIds, bandOfPid, leaderId, isLeader, nextAlive };
