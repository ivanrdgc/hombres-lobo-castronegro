// Acciones de «Coup» sobre Firestore. Todo el estado vive en el doc de su
// partida (matches/<mid>); los docs de jugador no se tocan. La app hace de
// máster OCULTO: baraja y custodia la corte, resuelve desafíos y bloqueos, mueve
// las monedas y detecta al superviviente. Cada función es un envoltorio fino
// del motor puro (engine.ts). Transacciones «primero gana».
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import {
  MIN_PLAYERS, MAX_PLAYERS, dealGame, beginPlay as beginPlayMut, declareAction, doChallenge,
  doBlock, doPass, chooseLoss as chooseLossMut, exchangeKeep as exchangeKeepMut, resetForRematch,
  playersOf, isAlive, influenceCount, aliveIds,
} from './engine';
import type { CoupState, ActionType, Character } from './types';

export function coupGame(g: GroupDoc | null): CoupState | null {
  const game = g?.game as unknown as CoupState | null;
  return game && game.coup ? game : null;
}

interface TxExtra { game: CoupState; members?: string[]; masterPatch?: string | null }
type TxFn = (game: CoupState, m: MatchDoc) => CoupState | TxExtra | null | undefined;

async function tx(fn: TxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('coup');
  if (!id) return;
  await txWithRetry(async (t) => {
    const snap = await t.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as CoupState | null;
    if (!game || !game.coup) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as CoupState;
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

export async function startCoup(playerIds: string[], narratorId: string | null): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Coup necesita al menos ${MIN_PLAYERS} jugadores.`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`Coup admite ${MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const speaker = narratorId || myPid();
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const deal = dealGame(playerIds, seed);
  const game: CoupState = {
    coup: true, phase: 'reveal', startedAt: now, seed, round: 1,
    playerIds, names, hands: deal.hands, coins: deal.coins, deck: deal.deck, shuffles: 0,
    seen: {}, turnIdx: seed % playerIds.length,
    pending: null, block: null, reactions: {}, losing: [], resume: null, exchange: null,
    winner: null, scores: Object.fromEntries(playerIds.map((p) => [p, 0])),
    paused: null, repeatNonce: 0,
    log: [{ txt: `🃏 Comienza Coup con ${playerIds.length} jugadores. Dos influencias secretas cada uno; el último en pie gana.` }],
  };
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, [...new Set([...playerIds, speaker])]);
    t.update(gref(slug), { lastNarratorId: speaker });
    t.set(mref(slug, mid), sanitize({
      gameId: 'coup', createdAt: now,
      members: [...new Set([...playerIds, speaker])],
      masterId: speaker, lastNarratorId: speaker, settings: {}, extraRoles: [], game,
    }));
  });
}

export async function confirmSeen(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'reveal' || !game.playerIds.includes(me) || game.seen[me]) return null;
    game.seen = { ...(game.seen || {}), [me]: true };
    return game;
  });
}

export async function beginPlay(): Promise<void> {
  await tx((game) => (beginPlayMut(game) ? game : null));
}

// ——— Turno y reacciones ———

export async function act(type: ActionType, target: string | null): Promise<void> {
  const me = myPid();
  await tx((game) => (declareAction(game, me, type, target) ? game : null));
}

export async function challenge(): Promise<void> {
  const me = myPid();
  await tx((game) => (doChallenge(game, me) ? game : null));
}

export async function block(claim: Character): Promise<void> {
  const me = myPid();
  await tx((game) => (doBlock(game, me, claim) ? game : null));
}

export async function pass(): Promise<void> {
  const me = myPid();
  await tx((game) => (doPass(game, me) ? game : null));
}

export async function chooseLoss(handIdx: number): Promise<void> {
  const me = myPid();
  await tx((game) => (chooseLossMut(game, me, handIdx) ? game : null));
}

export async function exchangeKeep(keepIdxs: number[]): Promise<void> {
  const me = myPid();
  await tx((game) => (exchangeKeepMut(game, me, keepIdxs) ? game : null));
}

// ——— Revancha / fin ———

export async function playAgain(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    resetForRematch(game, (game.seed || 0) + 101);
    game.log.push({ txt: '🔁 Nueva partida: corte barajada y repartida de nuevo.' });
    return game;
  });
}

export async function endCoup(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('coup');
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

// Una partida depende del reparto completo: sacar a alguien o que el narrador se
// marche la invalida → termina para todos.
registerMatchTools('coup', {
  leave: (mid) => endCoup(mid),
  end: (mid) => endCoup(mid),
});

export { playersOf, isAlive, influenceCount, aliveIds };
