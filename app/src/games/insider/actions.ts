// Acciones de «Insider» sobre Firestore. Estado en el doc de su partida
// (matches/<mid>); los docs de jugador no se tocan. La app hace de máster
// oculto: conoce la palabra, designa al Insider en secreto, cronometra el
// interrogatorio y cuenta la caza del Insider.
import { deleteDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import { e2eTestMode } from '../../core/test-hooks';
import {
  sanitize, txWithRetry, gref, mref, mySlug, myPid, assertFree, ctxMatchId, newMatchId,
  registerMatchTools,
} from '../../core/sync/group-actions';
import type { GroupDoc, MatchDoc } from '../../core/sync/schema';
import {
  MIN_PLAYERS, MAX_PLAYERS, dealRound, tallyVotes, allVoted, canForceTally, playersOf, roleOf,
} from './engine';
import { WORDS } from './words';
import type { InsiderState } from './types';

export function insiderGame(g: GroupDoc | null): InsiderState | null {
  const game = g?.game as unknown as InsiderState | null;
  return game && game.insider ? game : null;
}

interface TxExtra { game: InsiderState; members?: string[]; masterPatch?: string | null }
type TxFn = (game: InsiderState, m: MatchDoc) => InsiderState | TxExtra | null | undefined;

async function tx(fn: TxFn, mid?: string, opts: { allowPaused?: boolean } = {}): Promise<void> {
  const slug = mySlug();
  const id = mid ?? ctxMatchId('insider');
  if (!id) return;
  await txWithRetry(async (t) => {
    const snap = await t.get(mref(slug, id));
    if (!snap.exists()) return;
    const m = { id: snap.id, ...snap.data() } as MatchDoc;
    const game = m.game as unknown as InsiderState | null;
    if (!game || !game.insider) return;
    if (game.paused && !opts.allowPaused) return;
    const copy = JSON.parse(JSON.stringify(game)) as InsiderState;
    const res = fn(copy, m);
    if (!res) return;
    const extra = ('game' in res ? res : { game: res }) as TxExtra;
    const patch: Record<string, unknown> = { game: sanitize(extra.game) };
    if (extra.members) patch.members = sanitize(extra.members);
    if (extra.masterPatch !== undefined) patch.masterId = extra.masterPatch;
    t.update(mref(slug, id), patch);
  });
}

const nameOf = (g: InsiderState, pid: string | null | undefined) => (pid && g.names[pid]) || '¿?';

// ——— Inicio ———

export async function startInsider(playerIds: string[], narratorId: string | null, durationMin: number): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Insider necesita al menos ${MIN_PLAYERS} jugadores.`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`Insider admite ${MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const speaker = narratorId || myPid();
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const deal = dealRound(playerIds, 1, [], seed);
  // Semilla de test: cada «minuto» dura 4 s (como El Espía), para probar el
  // fin de tiempo sin esperas reales. Jamás activa fuera de Playwright.
  const durationMs = Math.max(1, durationMin) * (e2eTestMode() ? 4000 : 60000);
  const masterName = names[deal.masterId] || '¿?';
  const game: InsiderState = {
    insider: true, phase: 'reveal', startedAt: now, seed, round: 1,
    playerIds, names, word: deal.word, masterId: deal.masterId, insiderId: deal.insiderId,
    seen: {}, starterIdx: deal.starterIdx, durationMs, deadline: null, guessedAt: null,
    votes: {}, accusedId: null, outcome: null,
    scores: Object.fromEntries(playerIds.map((p) => [p, 0])),
    usedWords: [deal.word], paused: null, repeatNonce: 0,
    log: [{ txt: `🤫 Comienza Insider con ${playerIds.length} jugadores. El Maestro es ${masterName}; entre los demás se esconde el Insider.` }],
  };
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, [...new Set([...playerIds, speaker])]);
    t.update(gref(slug), { lastNarratorId: speaker });
    t.set(mref(slug, mid), sanitize({
      gameId: 'insider', createdAt: now,
      members: [...new Set([...playerIds, speaker])],
      masterId: speaker, lastNarratorId: speaker,
      settings: { insiderMin: Math.max(1, durationMin) }, extraRoles: [], game,
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

/** Todos han visto su carta: se pone el reloj en marcha. Lo normal es que lo
 *  pulse el Maestro, pero vale CUALQUIER jugador de la ronda: si su móvil muere,
 *  el reparto se quedaba bloqueado sin botón en ninguna pantalla. */
export async function beginQuestions(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'reveal' || !game.playerIds.includes(me)) return null;
    if (!game.playerIds.every((pid) => game.seen[pid])) return null;
    game.phase = 'question';
    game.deadline = Date.now() + game.durationMs;
    game.log.push({ txt: `⏱️ El reloj corre: ${Math.round(game.durationMs / 60000)} min. Empieza preguntando ${nameOf(game, game.playerIds[game.starterIdx])}; el Maestro responde sí o no.` });
    return game;
  });
}

/** El Maestro confirma que el equipo ha ADIVINADO la palabra: a cazar al Insider. */
export async function markGuessed(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'question' || me !== game.masterId) return null;
    game.phase = 'vote';
    game.guessedAt = Date.now();
    game.deadline = null;
    game.votes = {};
    game.log.push({ txt: '✅ ¡Palabra adivinada! Ahora, en secreto, señalad a quien creáis el Insider.' });
    return game;
  });
}

/** El reloj llega a cero sin adivinar: pierden todos. Cualquier dispositivo. */
export async function timeUp(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'question' || game.deadline === null) return null;
    if (Date.now() < game.deadline - 1500) return null; // aún no (tolerancia de reloj)
    return finish(game, 'timeout');
  });
}

// ——— Caza del Insider ———

export async function castVote(target: string): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'vote' || !game.playerIds.includes(me)) return null;
    if (game.votes[me] !== undefined) return null;
    if (!game.playerIds.includes(target) || target === me || target === game.masterId) return null;
    game.votes = { ...game.votes, [me]: target };
    if (!allVoted(game)) return game;
    return closeVote(game);
  });
}

/** Salida de emergencia: se cierra el recuento con los votos que haya (quién
 *  puede hacerlo lo decide `canForceTally`). */
export async function forceTally(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (!canForceTally(game, me)) return null;
    return closeVote(game, me);
  });
}

// Recuento de la caza y cierre de la ronda (lo llaman el último voto y el
// recuento forzado; `forcedBy` deja constancia en el diario de quién lo cerró).
function closeVote(game: InsiderState, forcedBy?: string): InsiderState {
  if (forcedBy) {
    const missing = game.playerIds.filter((pid) => game.votes[pid] === undefined).length;
    game.log.push({ txt: `⏭️ ${nameOf(game, forcedBy)} cierra el recuento sin esperar a ${missing === 1 ? 'un voto' : `${missing} votos`}.` });
  }
  const { accusedId } = tallyVotes(game);
  game.accusedId = accusedId;
  if (accusedId) game.log.push({ txt: `🗳️ La mesa señala a ${nameOf(game, accusedId)}.` });
  else game.log.push({ txt: '🗳️ Voto dividido: nadie es señalado con claridad.' });
  return finish(game, accusedId && accusedId === game.insiderId ? 'group' : 'insider');
}

// Cierra la ronda: fija el desenlace y reparte puntos.
function finish(game: InsiderState, outcome: 'group' | 'insider' | 'timeout'): InsiderState {
  game.outcome = outcome;
  game.phase = 'end';
  game.deadline = null;
  if (outcome === 'group') {
    // Cazado: puntúan el Maestro y los comunes; el Insider, no.
    for (const pid of game.playerIds) if (pid !== game.insiderId) game.scores[pid] = (game.scores[pid] || 0) + 1;
    game.log.push({ txt: `👥 El Insider era ${nameOf(game, game.insiderId)}. ¡Cazado! El equipo se lleva la ronda (+1).` });
  } else if (outcome === 'insider') {
    game.scores[game.insiderId] = (game.scores[game.insiderId] || 0) + 2;
    game.log.push({ txt: `🕵️ El Insider era ${nameOf(game, game.insiderId)} y escapa: guio la partida sin que lo pillarais (+2).` });
  } else {
    game.log.push({ txt: `⏰ Se acabó el tiempo y no adivinasteis «${game.word}». Pierden todos, también el Insider (${nameOf(game, game.insiderId)}).` });
  }
  return game;
}

// ——— Nueva ronda / fin ———

export async function nextRound(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    const round = game.round + 1;
    const seed = (game.seed || 0) + 101;
    const deal = dealRound(game.playerIds, round, game.usedWords, seed);
    game.seed = seed;
    game.round = round;
    game.phase = 'reveal';
    game.word = deal.word;
    game.masterId = deal.masterId;
    game.insiderId = deal.insiderId;
    game.starterIdx = deal.starterIdx;
    game.seen = {};
    game.deadline = null;
    game.guessedAt = null;
    game.votes = {};
    game.accusedId = null;
    game.outcome = null;
    // El mazo se recicla al agotarse DE VERDAD (antes cortaba en 40 con 56+
    // palabras: repetía sin necesidad pese a prometer lo contrario en la ayuda).
    game.usedWords = game.usedWords.length >= WORDS.length ? [deal.word] : [...game.usedWords, deal.word];
    game.log.push({ txt: `🤫 Ronda ${round}: nueva palabra. El Maestro es ${nameOf(game, deal.masterId)}.` });
    return game;
  });
}

export async function endInsider(mid?: string): Promise<void> {
  const id = mid ?? ctxMatchId('insider');
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
    // Devuelve al reloj el tiempo que estuvo en pausa (no se pierde interrogatorio).
    if (game.phase === 'question' && game.deadline !== null) {
      game.deadline += Math.max(0, Date.now() - game.paused.at);
    }
    game.paused = null;
    return game;
  }, undefined, { allowPaused: true });
}
export async function requestRepeat(): Promise<void> {
  await tx((game) => { game.repeatNonce = (game.repeatNonce || 0) + 1; return game; }, undefined, { allowPaused: true });
}

registerMatchTools('insider', {
  leave: (mid) => endInsider(mid),
  end: (mid) => endInsider(mid),
  leaveEndsMatch: true,
});

export { playersOf, roleOf, canForceTally };
