// Acciones de «Codenames» sobre Firestore. Estado en el doc de su partida
// (matches/<mid>); los docs de jugador no se tocan. La app custodia el MAPA
// secreto (solo lo ven los Jefes), reparte equipos y resuelve pistas y toques.
// Cada función envuelve el motor puro (engine.ts). Transacciones «primero gana».
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import {
  MIN_PLAYERS, MAX_PLAYERS, BOARD, dealGame, giveClue as giveClueMut, reveal as revealMut,
  pass as passMut, resetForRematch, teamOf, isSpymaster, canSeeMap, canGuess, teamMembers,
} from './engine';
import type { CodenamesState } from './types';

export function codenamesGame(g: GroupDoc | null): CodenamesState | null {
  const game = g?.game as unknown as CodenamesState | null;
  return game && game.codenames ? game : null;
}

interface TxExtra { game: CodenamesState; members?: string[]; masterPatch?: string | null }
type TxFn = (game: CodenamesState, m: MatchDoc) => CodenamesState | TxExtra | null | undefined;

async function tx(fn: TxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('codenames');
  if (!id) return;
  await txWithRetry(async (t) => {
    const snap = await t.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as CodenamesState | null;
    if (!game || !game.codenames) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as CodenamesState;
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

export async function startCodenames(playerIds: string[], narratorId: string | null): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Codenames necesita al menos ${MIN_PLAYERS} jugadores.`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`Codenames admite ${MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const speaker = narratorId || myPid();
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const deal = dealGame(playerIds, seed);
  const game: CodenamesState = {
    codenames: true, phase: 'clue', startedAt: now, seed,
    playerIds, names, teams: deal.teams, spymaster: deal.spymaster,
    words: deal.words, map: deal.map, revealed: Array(BOARD).fill(false),
    starting: deal.starting, turn: deal.starting, clue: null, guessesLeft: 0,
    remaining: deal.remaining, winner: null, winReason: null,
    scores: Object.fromEntries(playerIds.map((p) => [p, 0])), paused: null, repeatNonce: 0,
    log: [{ txt: `🕵️ Comienza Codenames. Empieza el equipo ${deal.starting === 'red' ? 'ROJO (9 casillas)' : 'AZUL (9 casillas)'}. Los Jefes ven el mapa; sus agentes, solo las palabras.` }],
  };
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, [...new Set([...playerIds, speaker])]);
    t.update(gref(slug), { lastNarratorId: speaker });
    t.set(mref(slug, mid), sanitize({
      gameId: 'codenames', createdAt: now,
      members: [...new Set([...playerIds, speaker])],
      masterId: speaker, lastNarratorId: speaker, settings: {}, extraRoles: [], game,
    }));
  });
}

// ——— Turno ———

export async function giveClue(word: string, num: number): Promise<void> {
  const me = myPid();
  await tx((game) => (giveClueMut(game, me, word, num) ? game : null));
}

export async function revealCell(cell: number): Promise<void> {
  const me = myPid();
  await tx((game) => (revealMut(game, me, cell) ? game : null));
}

export async function passTurn(): Promise<void> {
  const me = myPid();
  await tx((game) => (passMut(game, me) ? game : null));
}

// ——— Revancha / fin ———

export async function playAgain(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    resetForRematch(game, (game.seed || 0) + 101);
    game.log.push({ txt: `🔁 Nueva partida: tablero y mapa nuevos. Empieza el equipo ${game.starting === 'red' ? 'ROJO' : 'AZUL'}.` });
    return game;
  });
}

export async function endCodenames(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('codenames');
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

// Una partida depende del reparto por equipos: sacar a alguien o que el narrador
// se vaya la invalida → termina para todos.
registerMatchTools('codenames', {
  leave: (mid) => endCodenames(mid),
  end: (mid) => endCodenames(mid),
  leaveEndsMatch: true,
});

export { teamOf, isSpymaster, canSeeMap, canGuess, teamMembers };
