// Acciones de «Two Rooms and a Boom» sobre Firestore. Todo el estado vive en el
// doc de su partida (matches/<mid>); los docs de jugador no se tocan. La app
// hace de máster OCULTO: reparte bandos y roles (Presidente/Bombardero), coloca
// a la gente en dos salas, lleva el reloj de cada ronda, cuenta el voto de rehén
// de cada sala e intercambia, y dictamina el ganador. Transacciones «primero
// gana».
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import { e2eTestMode } from '../../core/test-hooks';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import {
  MIN_PLAYERS, MAX_PLAYERS, TOTAL_ROUNDS, dealGame, minutesForRound, roomOf, roomMembers,
  allVotedInRoom, tallyRoom, decideWinner, presidentId, bomberId, playersOf,
} from './engine';
import type { TwoRoomsState } from './types';

export function twoRoomsGame(g: GroupDoc | null): TwoRoomsState | null {
  const game = g?.game as unknown as TwoRoomsState | null;
  return game && game.tworooms ? game : null;
}

interface TxExtra { game: TwoRoomsState; members?: string[]; masterPatch?: string | null }
type TxFn = (game: TwoRoomsState, m: MatchDoc) => TwoRoomsState | TxExtra | null | undefined;

async function tx(fn: TxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('two_rooms');
  if (!id) return;
  await txWithRetry(async (t) => {
    const snap = await t.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as TwoRoomsState | null;
    if (!game || !game.tworooms) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as TwoRoomsState;
    const res = fn(copy, m);
    if (!res) return;
    const extra = ('game' in res ? res : { game: res }) as TxExtra;
    const patch: Record<string, unknown> = { game: sanitize(extra.game) };
    if (extra.members) patch.members = sanitize(extra.members);
    if (extra.masterPatch !== undefined) patch.masterId = extra.masterPatch;
    t.update(mref(slug, id), patch);
  });
}

const nameOf = (g: TwoRoomsState, pid: string | null | undefined) => (pid && g.names[pid]) || '¿?';
const perMinMs = () => (e2eTestMode() ? 4000 : 60000);

// ——— Inicio ———

export async function startTwoRooms(playerIds: string[], narratorId: string | null): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Two Rooms necesita al menos ${MIN_PLAYERS} jugadores.`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`Two Rooms admite ${MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const speaker = narratorId || myPid();
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const deal = dealGame(playerIds, seed);
  const game: TwoRoomsState = {
    tworooms: true, phase: 'reveal', startedAt: now, seed, round: 1, totalRounds: TOTAL_ROUNDS,
    playerIds, names, teams: deal.teams, roles: deal.roles, room: deal.room,
    seen: {}, durationMs: minutesForRound(1, TOTAL_ROUNDS) * perMinMs(), deadline: null,
    hVotes: {}, pick: [null, null], swaps: [],
    winner: null, scores: Object.fromEntries(playerIds.map((p) => [p, 0])),
    paused: null, repeatNonce: 0,
    log: [{ txt: `💣 Comienza Two Rooms and a Boom con ${playerIds.length} jugadores en dos salas. Entre los azules, un Presidente; entre los rojos, un Bombardero.` }],
  };
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, [...new Set([...playerIds, speaker])]);
    t.update(gref(slug), { lastNarratorId: speaker });
    t.set(mref(slug, mid), sanitize({
      gameId: 'two_rooms', createdAt: now,
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

/** Todos han visto su carta: arranca la ronda 1 (cualquier jugador). */
export async function beginRound(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'reveal' || !game.playerIds.includes(me)) return null;
    if (!game.playerIds.every((pid) => game.seen[pid])) return null;
    game.phase = 'discuss';
    game.durationMs = minutesForRound(game.round, game.totalRounds) * perMinMs();
    game.deadline = Date.now() + game.durationMs;
    game.log.push({ txt: `⏱️ Ronda ${game.round} de ${game.totalRounds}: ${minutesForRound(game.round, game.totalRounds)} min. Hablad, enseñad cartas y decidid a quién mandaréis de rehén.` });
    return game;
  });
}

/** El reloj llega a cero: se pasa al reparto de rehenes. Cualquier dispositivo. */
export async function timeUp(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'discuss' || game.deadline === null) return null;
    if (Date.now() < game.deadline - 1500) return null; // aún no (tolerancia de reloj)
    game.phase = 'hostages';
    game.hVotes = {};
    game.pick = [null, null];
    game.log.push({ txt: '🔔 ¡Fin de la ronda! Cada sala vota a quién manda de rehén a la otra.' });
    return game;
  });
}

// ——— Voto de rehén ———

export async function castHostageVote(target: string): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'hostages' || !game.playerIds.includes(me)) return null;
    if (game.hVotes[me] !== undefined) return null;
    const r = roomOf(game, me);
    if (roomOf(game, target) !== r || !game.playerIds.includes(target)) return null;
    game.hVotes = { ...game.hVotes, [me]: target };
    // ¿Ha terminado de votar la sala del votante? Fija su rehén.
    if (allVotedInRoom(game, r) && game.pick[r] === null) {
      game.pick[r] = tallyRoom(game, r);
      game.log.push({ txt: `🗳️ La sala ${r + 1} manda de rehén a ${nameOf(game, game.pick[r])}.` });
    }
    // ¿Han decidido ya las dos salas? Intercambio y siguiente ronda (o final).
    if (game.pick[0] && game.pick[1]) return doSwap(game);
    return game;
  });
}

function doSwap(game: TwoRoomsState): TwoRoomsState {
  const a = game.pick[0]!;
  const b = game.pick[1]!;
  game.room[a] = 1;
  game.room[b] = 0;
  game.swaps.push({ round: game.round, from0: a, from1: b });
  game.log.push({ txt: `🔄 Intercambio: ${nameOf(game, a)} pasa a la Sala 2 y ${nameOf(game, b)} a la Sala 1.` });
  if (game.round < game.totalRounds) {
    game.round += 1;
    game.phase = 'discuss';
    game.hVotes = {};
    game.pick = [null, null];
    game.durationMs = minutesForRound(game.round, game.totalRounds) * perMinMs();
    game.deadline = Date.now() + game.durationMs;
    game.log.push({ txt: `⏱️ Ronda ${game.round} de ${game.totalRounds}: ${minutesForRound(game.round, game.totalRounds)} min.` });
    return game;
  }
  return finish(game);
}

function finish(game: TwoRoomsState): TwoRoomsState {
  const winner = decideWinner(game);
  game.winner = winner;
  game.phase = 'end';
  game.deadline = null;
  for (const pid of game.playerIds) if (game.teams[pid] === winner) game.scores[pid] = (game.scores[pid] || 0) + 1;
  const pres = presidentId(game);
  const bomb = bomberId(game);
  game.log.push({ txt: `🏁 El Presidente era ${nameOf(game, pres)} y el Bombardero ${nameOf(game, bomb)}. ${winner === 'red' ? 'Acabaron en la misma sala: ¡BOOM! Gana el ROJO.' : 'Acabaron en salas distintas: el Presidente vive. Gana el AZUL.'}` });
  return game;
}

// ——— Revancha / fin ———

export async function playAgain(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    const seed = (game.seed || 0) + 101;
    const deal = dealGame(game.playerIds, seed);
    game.seed = seed;
    game.round = 1;
    game.phase = 'reveal';
    game.teams = deal.teams;
    game.roles = deal.roles;
    game.room = deal.room;
    game.seen = {};
    game.deadline = null;
    game.hVotes = {};
    game.pick = [null, null];
    game.swaps = [];
    game.winner = null;
    game.log.push({ txt: '🔁 Nueva partida: bandos, roles y salas repartidos de nuevo.' });
    return game;
  });
}

export async function endTwoRooms(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('two_rooms');
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
  await tx((game) => {
    if (!game.paused) return null;
    if (game.phase === 'discuss' && game.deadline !== null) {
      game.deadline += Math.max(0, Date.now() - game.paused.at); // no se pierde tiempo de ronda
    }
    game.paused = null;
    return game;
  }, undefined, { allowPaused: true });
}
export async function requestRepeat(): Promise<void> {
  await tx((game) => { game.repeatNonce = (game.repeatNonce || 0) + 1; return game; }, undefined, { allowPaused: true });
}

registerMatchTools('two_rooms', {
  leave: (mid) => endTwoRooms(mid),
  end: (mid) => endTwoRooms(mid),
});

export { playersOf, roomMembers, roomOf };
