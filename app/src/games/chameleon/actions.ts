// Acciones de «El Camaleón» sobre Firestore. Estado en el doc de su partida
// (matches/<mid>); los docs de jugador no se tocan. La app reparte la palabra
// secreta a todos menos al Camaleón y cuenta el voto en secreto.
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import { TOPICS } from './topics';
import { MIN_PLAYERS, MAX_PLAYERS, dealRound, tallyVotes, allVoted, playersOf, isChameleon } from './engine';
import type { ChameleonState } from './types';

export function chamGame(g: GroupDoc | null): ChameleonState | null {
  const game = g?.game as unknown as ChameleonState | null;
  return game && game.chameleon ? game : null;
}

interface TxExtra { game: ChameleonState; members?: string[]; masterPatch?: string | null }
type TxFn = (game: ChameleonState, m: MatchDoc) => ChameleonState | TxExtra | null | undefined;

async function tx(fn: TxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('chameleon');
  if (!id) return;
  await txWithRetry(async (t) => {
    const snap = await t.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as ChameleonState | null;
    if (!game || !game.chameleon) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as ChameleonState;
    const res = fn(copy, m);
    if (!res) return;
    const extra = ('game' in res ? res : { game: res }) as TxExtra;
    const patch: Record<string, unknown> = { game: sanitize(extra.game) };
    if (extra.members) patch.members = sanitize(extra.members);
    if (extra.masterPatch !== undefined) patch.masterId = extra.masterPatch;
    t.update(mref(slug, id), patch);
  });
}

const nameOf = (g: ChameleonState, pid: string | null | undefined) => (pid && g.names[pid]) || '¿?';

// ——— Inicio ———

export async function startChameleon(playerIds: string[], narratorId: string | null): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`El Camaleón necesita al menos ${MIN_PLAYERS} jugadores.`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`El Camaleón admite ${MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const speaker = narratorId || myPid();
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const deal = dealRound(playerIds, 1, [], seed);
  const game: ChameleonState = {
    chameleon: true, phase: 'reveal', startedAt: now, seed, round: 1,
    playerIds, names, topicId: deal.topicId, grid: deal.grid, secret: deal.secret,
    chameleonId: deal.chameleonId, seen: {}, starterIdx: deal.starterIdx,
    votes: {}, accusedId: null, caught: false, guess: null, guessedRight: false,
    winner: null, scores: Object.fromEntries(playerIds.map((p) => [p, 0])),
    usedTopics: [deal.topicId], paused: null, repeatNonce: 0,
    log: [{ txt: `🦎 Comienza El Camaleón con ${playerIds.length} jugadores. Todos conocen la palabra secreta… menos uno.` }],
  };
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, [...new Set([...playerIds, speaker])]);
    t.update(gref(slug), { lastNarratorId: speaker });
    t.set(mref(slug, mid), sanitize({
      gameId: 'chameleon', createdAt: now,
      members: [...new Set([...playerIds, speaker])],
      masterId: speaker, lastNarratorId: speaker, settings: {}, extraRoles: [], game,
    }));
  });
}

export async function confirmSeen(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'reveal' || !game.playerIds.includes(me)) return null;
    game.seen = { ...(game.seen || {}), [me]: true };
    return game;
  });
}

/** Todos han visto su carta: empiezan las pistas (en voz alta, por turnos). */
export async function beginClues(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'reveal' || !game.playerIds.every((pid) => game.seen[pid])) return null;
    game.phase = 'clue';
    game.log.push({ txt: `🗣️ A dar pistas. Empieza ${nameOf(game, game.playerIds[game.starterIdx])}; una palabra cada uno.` });
    return game;
  });
}

/** Terminadas las pistas, se pasa a la votación (cualquiera lo dispara). */
export async function startVote(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'clue' || !game.playerIds.includes(me)) return null;
    game.phase = 'vote';
    game.votes = {};
    game.log.push({ txt: '👉 A votar: señalad en secreto a quien creáis el Camaleón.' });
    return game;
  });
}

// ——— Voto ———

export async function castVote(target: string): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'vote' || !game.playerIds.includes(me)) return null;
    if (game.votes[me] !== undefined || !game.playerIds.includes(target)) return null;
    if (target === me) return null; // a uno mismo no (como en Insider)
    game.votes = { ...game.votes, [me]: target };
    if (!allVoted(game)) return game;
    // Todos han votado: se destapa el recuento.
    const { accusedId } = tallyVotes(game);
    game.accusedId = accusedId;
    game.caught = !!accusedId && accusedId === game.chameleonId;
    if (accusedId) game.log.push({ txt: `🗳️ La mesa señala a ${nameOf(game, accusedId)}.` });
    else game.log.push({ txt: '🗳️ Voto dividido: nadie es señalado con claridad.' });
    if (game.caught) {
      game.phase = 'guess';
      game.log.push({ txt: `🦎 ¡${nameOf(game, game.chameleonId)} era el Camaleón! Pero aún puede escapar si adivina la palabra…` });
      return game;
    }
    // No lo pillan (fallan o empatan): el Camaleón escapa.
    return finish(game, 'chameleon');
  });
}

// ——— El Camaleón adivina ———

export async function chameleonGuess(cell: number): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'guess' || me !== game.chameleonId) return null;
    if (cell < 0 || cell >= game.grid.length) return null;
    game.guess = cell;
    game.guessedRight = cell === game.secret;
    game.log.push({ txt: `🦎 El Camaleón apuesta por «${game.grid[cell]}». La palabra era «${game.grid[game.secret]}».` });
    return finish(game, game.guessedRight ? 'chameleon' : 'group');
  });
}

// Cierra la ronda: fija el ganador y reparte puntos (puntuación sencilla).
function finish(game: ChameleonState, winner: 'chameleon' | 'group'): ChameleonState {
  game.winner = winner;
  game.phase = 'end';
  if (winner === 'group') {
    for (const pid of game.playerIds) if (pid !== game.chameleonId) game.scores[pid] = (game.scores[pid] || 0) + 1;
    game.log.push({ txt: '👥 El grupo gana la ronda (+1 a cada uno).' });
  } else {
    // Escapa sin ser pillado (+2) o pillado pero adivinando (+1).
    const pts = game.caught ? 1 : 2;
    game.scores[game.chameleonId] = (game.scores[game.chameleonId] || 0) + pts;
    game.log.push({ txt: `🦎 El Camaleón gana la ronda (+${pts}).` });
  }
  return game;
}

// ——— Nueva ronda / fin ———

export async function nextRound(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    const round = game.round + 1;
    const seed = (game.seed || 0) + 101;
    const deal = dealRound(game.playerIds, round, game.usedTopics, seed);
    game.seed = seed;
    game.round = round;
    game.phase = 'reveal';
    game.topicId = deal.topicId;
    game.grid = deal.grid;
    game.secret = deal.secret;
    game.chameleonId = deal.chameleonId;
    game.starterIdx = deal.starterIdx;
    game.seen = {};
    game.votes = {};
    game.accusedId = null;
    game.caught = false;
    game.guess = null;
    game.guessedRight = false;
    game.winner = null;
    game.usedTopics = game.usedTopics.length >= TOPICS.length ? [deal.topicId] : [...game.usedTopics, deal.topicId];
    game.log.push({ txt: `🦎 Ronda ${round}: nuevo tema y nuevo Camaleón.` });
    return game;
  });
}

export async function endChameleon(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('chameleon');
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

registerMatchTools('chameleon', {
  leave: (mid) => endChameleon(mid),
  end: (mid) => endChameleon(mid),
  leaveEndsMatch: true,
});

export { playersOf, isChameleon };
