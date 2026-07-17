// Acciones de El Espía sobre Firestore. Todo el estado vive en group.game
// (transacciones «primero gana» sobre el doc del grupo); los docs de jugador
// no se tocan. Las acciones de grupo (asientos, ajustes…) están en core.
import { updateDoc } from '../../core/sync/fb';
import { state } from '../../core/sync/store.svelte';
import { sanitize, txWithRetry, gref, mySlug, myPid } from '../../core/sync/group-actions';
import type { GroupDoc } from '../../core/sync/schema';
import {
  ESPIA_MIN_PLAYERS, ESPIA_MAX_PLAYERS, applyDelta, dealRound, resolveConviction, resolveGuess,
  resolveSpyLeft, resolveTimeout, tallyVote, timeupOrder,
} from './engine';
import { LOCATIONS, locationById } from './locations';
import type { EspiaOutcome, EspiaState } from './types';

/** El estado de El Espía, si la partida en curso es de este juego. */
export function espiaGame(g: GroupDoc | null): EspiaState | null {
  const game = g?.game as unknown as EspiaState | null;
  return game && game.espia ? game : null;
}

type EspiaTxFn = (game: EspiaState, g: GroupDoc) => EspiaState | null | undefined;

// Transacción sobre el doc del grupo: lee, aplica fn sobre una copia y escribe.
// fn devuelve null para abortar sin cambios (otro dispositivo se adelantó).
async function espiaTx(fn: EspiaTxFn): Promise<void> {
  const slug = mySlug();
  await txWithRetry(async (tx) => {
    const snap = await tx.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    const g = { id: snap.id, ...snap.data() } as GroupDoc;
    const game = espiaGame(g);
    if (!game) return;
    const copy = JSON.parse(JSON.stringify(game)) as EspiaState;
    const res = fn(copy, g);
    if (!res) return;
    tx.update(gref(slug), { game: sanitize(res) });
  });
}

const nameOf = (s: EspiaState, pid: string | null | undefined): string => (pid && s.names[pid]) || '¿?';

// ——— Inicio ———

export async function startEspia(playerIds: string[], speakerId: string | null, durationMin: number): Promise<void> {
  const slug = mySlug();
  if (playerIds.length < ESPIA_MIN_PLAYERS) throw new Error(`El Espía necesita al menos ${ESPIA_MIN_PLAYERS} jugadores.`);
  if (playerIds.length > ESPIA_MAX_PLAYERS) throw new Error(`El Espía admite ${ESPIA_MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const now = Date.now();
  const deal = dealRound(playerIds, 1, [], now);
  const game: EspiaState = {
    espia: true, phase: 'reveal', startedAt: now, round: 1,
    playerIds, names,
    dealerId: deal.dealerId, spyId: deal.spyId, locationId: deal.locationId, roles: deal.roles,
    seen: {}, durationMs: Math.max(1, durationMin) * 60000, deadline: null,
    voteSeq: 0, accusedUsed: {}, vote: null, timeupTurn: null,
    usedLocations: [deal.locationId], scores: {}, history: [], outcome: null,
    log: [{ txt: `🕵️ Ronda 1: identidades repartidas (${playerIds.length} agentes… o casi).` }],
  };
  await txWithRetry(async (tx) => {
    const snap = await tx.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    if ((snap.data() as { status?: string }).status === 'playing') return; // otro se adelantó
    tx.update(gref(slug), sanitize({
      status: 'playing', currentGame: 'espia', game,
      masterId: speakerId || myPid(), lastNarratorId: speakerId || myPid(),
    }));
  });
}

// ——— Ronda ———

export async function confirmSeen(): Promise<void> {
  const me = myPid();
  await espiaTx((game) => {
    if (game.phase !== 'reveal' || !game.playerIds.includes(me) || game.seen[me]) return null;
    game.seen[me] = true;
    return game;
  });
}

/** Todos han visto su identidad: cualquiera pone el reloj en marcha. */
export async function beginRound(): Promise<void> {
  await espiaTx((game) => {
    if (game.phase !== 'reveal') return null;
    if (!game.playerIds.every((pid) => game.seen[pid])) return null;
    game.phase = 'play';
    game.deadline = Date.now() + game.durationMs;
    game.log.push({ txt: `⏱️ El reloj está en marcha: ${Math.round(game.durationMs / 60000)} minutos. Empieza preguntando ${nameOf(game, game.dealerId)}.` });
    return game;
  });
}

/** Parar el reloj y acusar (una vez por ronda y jugador). */
export async function accuse(accusedId: string): Promise<void> {
  const me = myPid();
  await espiaTx((game) => {
    if (game.phase !== 'play' || game.vote || game.deadline === null) return null;
    if (!game.playerIds.includes(me) || game.accusedUsed[me]) return null;
    if (!game.playerIds.includes(accusedId) || accusedId === me) return null;
    game.accusedUsed[me] = true;
    game.voteSeq += 1;
    game.vote = {
      accuserId: me, accusedId, votes: {},
      frozenMs: Math.max(0, game.deadline - Date.now()), fromTimeup: false,
    };
    game.deadline = null; // reloj congelado durante la votación
    game.log.push({ txt: `🛑 ${nameOf(game, me)} detiene el reloj y acusa a ${nameOf(game, accusedId)}.` });
    return game;
  });
}

/** Acusación en los turnos tras el tiempo. */
export async function timeupAccuse(accusedId: string): Promise<void> {
  const me = myPid();
  await espiaTx((game) => {
    if (game.phase !== 'timeup' || game.vote || game.timeupTurn === null) return null;
    const order = timeupOrder(game);
    if (order[game.timeupTurn] !== me) return null;
    if (!game.playerIds.includes(accusedId) || accusedId === me) return null;
    game.voteSeq += 1;
    game.vote = { accuserId: me, accusedId, votes: {}, frozenMs: 0, fromTimeup: true };
    game.log.push({ txt: `👉 ${nameOf(game, me)} acusa a ${nameOf(game, accusedId)}.` });
    return game;
  });
}

export async function timeupPass(): Promise<void> {
  const me = myPid();
  await espiaTx((game) => {
    if (game.phase !== 'timeup' || game.vote || game.timeupTurn === null) return null;
    const order = timeupOrder(game);
    if (order[game.timeupTurn] !== me) return null;
    game.log.push({ txt: `🤐 ${nameOf(game, me)} pasa: no acusa a nadie.` });
    return advanceTimeupTurn(game);
  });
}

// Turno siguiente tras un pase o una votación fallida; si se acaban, el espía gana.
function advanceTimeupTurn(game: EspiaState): EspiaState {
  const order = timeupOrder(game);
  const next = (game.timeupTurn ?? 0) + 1;
  if (next >= order.length) return finishRound(game, resolveTimeout(game));
  game.timeupTurn = next;
  return game;
}

/** Voto de una acusación: cualquier «no» la tumba al instante; todos «sí» condena. */
export async function voteAccusation(agree: boolean): Promise<void> {
  const me = myPid();
  await espiaTx((game) => {
    const vote = game.vote;
    if (!vote || game.phase === 'end') return null;
    if (!game.playerIds.includes(me) || me === vote.accuserId || me === vote.accusedId) return null;
    if (vote.votes[me] !== undefined) return null;
    vote.votes[me] = agree;
    if (!agree) {
      game.log.push({ txt: `❌ ${nameOf(game, me)} no lo ve claro: la acusación contra ${nameOf(game, vote.accusedId)} cae.` });
      game.vote = null;
      if (vote.fromTimeup) return advanceTimeupTurn(game);
      game.deadline = Date.now() + vote.frozenMs; // el reloj se reanuda
      return game;
    }
    const t = tallyVote(game.playerIds, vote);
    if (!t.allYes) return game; // faltan votos
    // Unanimidad: se revela la carta y la ronda termina (sea quien sea).
    game.vote = null;
    return finishRound(game, resolveConviction(game, vote.accusedId, vote.accuserId));
  });
}

/** El espía se revela y adivina la localización (nunca durante una votación). */
export async function spyGuess(guessId: string): Promise<void> {
  const me = myPid();
  await espiaTx((game) => {
    if (game.phase !== 'play' || game.vote || me !== game.spyId) return null;
    if (!locationById(guessId)) return null;
    return finishRound(game, resolveGuess(game, guessId));
  });
}

/** El reloj llega a cero: empieza la tanda de acusaciones. Cualquier dispositivo. */
export async function timeUp(): Promise<void> {
  await espiaTx((game) => {
    if (game.phase !== 'play' || game.vote || game.deadline === null) return null;
    if (Date.now() < game.deadline - 1500) return null; // aún no (tolerancia de reloj)
    game.phase = 'timeup';
    game.deadline = null;
    game.timeupTurn = 0;
    game.log.push({ txt: '⏰ ¡Se acabó el tiempo! Acusaciones por turnos, empezando por quien preguntó primero.' });
    return game;
  });
}

function finishRound(game: EspiaState, outcome: EspiaOutcome): EspiaState {
  game.phase = 'end';
  game.vote = null;
  game.deadline = null;
  game.timeupTurn = null;
  game.outcome = outcome;
  game.scores = applyDelta(game.scores, outcome.delta);
  game.history.push({ round: game.round, locationId: game.locationId, spyId: game.spyId, txt: outcome.txt });
  game.log.push({ txt: outcome.txt });
  return game;
}

// ——— Entre rondas ———

/** Nueva ronda con los mismos jugadores: rota el repartidor y cambia el lugar. */
export async function nextRound(): Promise<void> {
  await espiaTx((game) => {
    if (game.phase !== 'end') return null;
    const round = game.round + 1;
    const deal = dealRound(game.playerIds, round, game.usedLocations, Date.now());
    game.round = round;
    game.dealerId = deal.dealerId;
    game.spyId = deal.spyId;
    game.locationId = deal.locationId;
    game.roles = deal.roles;
    game.seen = {};
    game.deadline = null;
    game.voteSeq = 0;
    game.accusedUsed = {};
    game.vote = null;
    game.timeupTurn = null;
    game.outcome = null;
    game.phase = 'reveal';
    game.usedLocations = game.usedLocations.length >= LOCATIONS.length
      ? [deal.locationId] // mazo agotado: se rebaraja
      : [...game.usedLocations, deal.locationId];
    game.log.push({ txt: `🕵️ Ronda ${round}: nuevas identidades. Reparte ${nameOf(game, deal.dealerId)}.` });
    return game;
  });
}

/** Terminar el juego: la mesa vuelve al lobby de El Espía. */
export async function endEspia(): Promise<void> {
  await updateDoc(gref(mySlug()), { status: 'lobby', game: null, masterId: null });
}

/** Dejar la ronda en curso (salida administrativa, sin puntos de última hora). */
export async function leaveRound(): Promise<void> {
  const me = myPid();
  await espiaTx((game) => {
    if (game.phase === 'end' || !game.playerIds.includes(me)) return null;
    // El espía se marcha a mitad de ronda: victoria de los agentes (el delta se
    // calcula ANTES de sacarlo de la lista).
    if (game.spyId === me && game.phase !== 'reveal') {
      const outcome = resolveSpyLeft(game);
      game.playerIds = game.playerIds.filter((id) => id !== me);
      return finishRound(game, outcome);
    }
    const orderBefore = timeupOrder(game);
    const wasTurnHolder = game.phase === 'timeup' && game.timeupTurn !== null && orderBefore[game.timeupTurn] === me;
    game.playerIds = game.playerIds.filter((id) => id !== me);
    delete game.roles[me];
    delete game.seen[me];
    game.log.push({ txt: `🚪 ${nameOf(game, me)} deja la ronda.` });
    if (game.playerIds.length < ESPIA_MIN_PLAYERS) {
      // Sin quórum: la ronda se disuelve sin puntos.
      game.phase = 'end';
      game.vote = null;
      game.deadline = null;
      game.timeupTurn = null;
      game.outcome = {
        type: 'spy_survived', spyId: game.spyId, locationId: game.locationId, delta: {},
        txt: `🚪 Quedan menos de ${ESPIA_MIN_PLAYERS}: la ronda se disuelve sin puntos. El espía era ${nameOf(game, game.spyId)} y el lugar, ${locationById(game.locationId)?.name || game.locationId}.`,
      };
      game.history.push({ round: game.round, locationId: game.locationId, spyId: game.spyId, txt: game.outcome.txt });
      game.log.push({ txt: game.outcome.txt });
      return game;
    }
    if (game.phase === 'reveal') {
      // Aún sin empezar: se reparte de nuevo entre los que quedan (mismo lugar
      // no garantizado: reparto nuevo completo) y todos vuelven a confirmar.
      const deal = dealRound(game.playerIds, game.round, game.usedLocations.slice(0, -1), Date.now());
      game.dealerId = deal.dealerId;
      game.spyId = deal.spyId;
      game.locationId = deal.locationId;
      game.roles = deal.roles;
      game.seen = {};
      game.usedLocations = [...game.usedLocations.slice(0, -1), deal.locationId];
      game.log.push({ txt: '🔀 Se reparten identidades nuevas entre los que quedan.' });
      return game;
    }
    if (game.vote) {
      const v = game.vote;
      if (v.accuserId === me || v.accusedId === me) {
        // La acusación pierde una de sus partes: cae y el juego sigue.
        game.vote = null;
        if (v.fromTimeup) return advanceTimeupTurn(game);
        game.deadline = Date.now() + v.frozenMs;
        return game;
      }
      delete v.votes[me];
      const t = tallyVote(game.playerIds, v);
      if (t.allYes) {
        game.vote = null;
        return finishRound(game, resolveConviction(game, v.accusedId, v.accuserId));
      }
    }
    if (game.phase === 'timeup' && game.timeupTurn !== null) {
      // Recoloca el turno sobre la lista nueva.
      const newOrder = timeupOrder(game);
      if (wasTurnHolder) {
        const stillBefore = orderBefore.slice(0, game.timeupTurn).filter((id) => game.playerIds.includes(id)).length;
        if (stillBefore >= newOrder.length) return finishRound(game, resolveTimeout(game));
        game.timeupTurn = stillBefore;
      } else {
        const holder = orderBefore.slice(game.timeupTurn).find((id) => game.playerIds.includes(id));
        const idx = holder ? newOrder.indexOf(holder) : -1;
        if (idx < 0) return finishRound(game, resolveTimeout(game));
        game.timeupTurn = idx;
      }
    }
    return game;
  });
}
