// Acciones de «Skull» sobre Firestore. Estado en el doc de su partida
// (matches/<mid>); los docs de jugador no se tocan. La app custodia las pilas
// boca abajo (solo su dueño ve lo que puso) y resuelve apuestas y revelados.
// Cada función envuelve el motor puro (engine.ts). Transacciones «primero gana».
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import {
  MIN_PLAYERS, MAX_PLAYERS, dealGame, placeInitial as placeInitialMut, placeDisc as placeDiscMut,
  openBid as openBidMut, raiseBid as raiseBidMut, passBid as passBidMut, flip as flipMut,
  nextRound as nextRoundMut, resetForRematch, isAlive, aliveIds, inHand, handCount, placed,
  placedCount, totalPlaced, flipTargets, flippedFlowers,
} from './engine';
import type { SkullState, Disc } from './types';

export function skullGame(g: GroupDoc | null): SkullState | null {
  const game = g?.game as unknown as SkullState | null;
  return game && game.skull ? game : null;
}

interface TxExtra { game: SkullState; members?: string[]; masterPatch?: string | null }
type TxFn = (game: SkullState, m: MatchDoc) => SkullState | TxExtra | null | undefined;

async function tx(fn: TxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('skull');
  if (!id) return;
  await txWithRetry(async (t) => {
    const snap = await t.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as SkullState | null;
    if (!game || !game.skull) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as SkullState;
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

export async function startSkull(playerIds: string[], narratorId: string | null): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Skull necesita al menos ${MIN_PLAYERS} jugadores.`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`Skull admite ${MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const speaker = narratorId || myPid();
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const deal = dealGame(playerIds);
  const starter = playerIds[seed % playerIds.length];
  const game: SkullState = {
    skull: true, phase: 'setup', startedAt: now, seed, round: 1, rng: 0,
    playerIds, names, inv: deal.inv,
    stacks: Object.fromEntries(playerIds.map((p) => [p, []])),
    turn: starter, starter, bid: null, passed: {}, reveal: null, lastResult: null,
    marks: Object.fromEntries(playerIds.map((p) => [p, 0])),
    alive: Object.fromEntries(playerIds.map((p) => [p, true])),
    winner: null, scores: Object.fromEntries(playerIds.map((p) => [p, 0])),
    paused: null, repeatNonce: 0,
    log: [{ txt: `💀 Comienza Skull con ${playerIds.length} jugadores. Cada uno coloca un disco boca abajo (flor o calavera). Gana quien se lleve dos retos.` }],
  };
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, [...new Set([...playerIds, speaker])]);
    t.update(gref(slug), { lastNarratorId: speaker });
    t.set(mref(slug, mid), sanitize({
      gameId: 'skull', createdAt: now,
      members: [...new Set([...playerIds, speaker])],
      masterId: speaker, lastNarratorId: speaker, settings: {}, extraRoles: [], game,
    }));
  });
}

// ——— Jugadas (envoltorios del motor) ———

export async function placeInitial(disc: Disc): Promise<void> {
  const me = myPid();
  await tx((game) => (placeInitialMut(game, me, disc) ? game : null));
}
export async function placeDisc(disc: Disc): Promise<void> {
  const me = myPid();
  await tx((game) => (placeDiscMut(game, me, disc) ? game : null));
}
export async function openBid(n: number): Promise<void> {
  const me = myPid();
  await tx((game) => (openBidMut(game, me, n) ? game : null));
}
export async function raiseBid(n: number): Promise<void> {
  const me = myPid();
  await tx((game) => (raiseBidMut(game, me, n) ? game : null));
}
export async function passBid(): Promise<void> {
  const me = myPid();
  await tx((game) => (passBidMut(game, me) ? game : null));
}
export async function flip(target: string): Promise<void> {
  const me = myPid();
  await tx((game) => (flipMut(game, me, target) ? game : null));
}
export async function nextRound(): Promise<void> {
  await tx((game) => (nextRoundMut(game) ? game : null));
}

// ——— Revancha / fin ———

export async function playAgain(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    resetForRematch(game, (game.seed || 0) + 101);
    game.log.push({ txt: '🔁 Nueva partida: discos recogidos y a empezar.' });
    return game;
  });
}

export async function endSkull(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('skull');
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

// Sacar a alguien a mitad rompe las pilas y las apuestas: la partida termina.
registerMatchTools('skull', {
  leave: (mid) => endSkull(mid),
  end: (mid) => endSkull(mid),
  leaveEndsMatch: true,
});

export { isAlive, aliveIds, inHand, handCount, placed, placedCount, totalPlaced, flipTargets, flippedFlowers };
