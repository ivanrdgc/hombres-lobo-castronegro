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
  MIN_PLAYERS, MAX_PLAYERS, HOSTAGE_SECONDS, roundsFor, dealGame, minutesForRound, roomOf, roomMembers,
  allVotedInRoom, majorityVotedInRoom, hostagesPerRoom, tallyRoom, decideWinner, presidentId, bomberId,
  playersOf, leavePlayer, nameList, rebalanceSpeakers, WIN_LABELS,
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
// El plazo del voto de rehén no se comprime tanto como los minutos de ronda: en
// los e2e hacen falta segundos de sobra para que voten seis u ocho pestañas.
const hostageMs = () => (e2eTestMode() ? 18000 : HOSTAGE_SECONDS * 1000);

// ——— Inicio ———

/**
 * @param voiceMode  single | perRoom | all (cómo suena la voz en las dos salas).
 * @param speaker0   altavoz principal (masterId; sala 1). Por defecto, el que arranca.
 * @param speaker1   altavoz de la sala 2 (solo modo perRoom).
 */
export async function startTwoRooms(
  playerIds: string[],
  voiceMode: TwoRoomsState['voiceMode'],
  speaker0: string | null,
  speaker1: string | null,
): Promise<void> {
  const slug = mySlug();
  const mid = newMatchId();
  if (playerIds.length < MIN_PLAYERS) throw new Error(`Two Rooms necesita al menos ${MIN_PLAYERS} jugadores.`);
  if (playerIds.length > MAX_PLAYERS) throw new Error(`Two Rooms admite ${MAX_PLAYERS} jugadores como mucho.`);
  const names: Record<string, string> = {};
  for (const pid of playerIds) names[pid] = state.players.find((p) => p.id === pid)?.name || pid;
  const master = speaker0 || myPid();
  const speaker1b = voiceMode === 'perRoom' ? speaker1 : null;
  const now = Date.now();
  const seed = Math.floor(now % 2147483647);
  const deal = dealGame(playerIds, seed);
  const members = [...new Set([...playerIds, master, ...(speaker1b ? [speaker1b] : [])])];
  const totalRounds = roundsFor(playerIds.length); // 3 hasta 10 jugadores, 5 de 11 en adelante
  const game: TwoRoomsState = {
    tworooms: true, phase: 'reveal', startedAt: now, seed, round: 1, totalRounds,
    playerIds, names, voiceMode, roomSpeakers: [master, speaker1b],
    teams: deal.teams, roles: deal.roles, room: deal.room,
    seen: {}, durationMs: minutesForRound(1, totalRounds) * perMinMs(), deadline: null,
    hVotes: {}, picks: { 0: null, 1: null }, swaps: [],
    winner: null, winReason: null, scores: Object.fromEntries(playerIds.map((p) => [p, 0])),
    paused: null, repeatNonce: 0,
    log: [{ txt: `💣 Comienza Two Rooms and a Boom con ${playerIds.length} jugadores en dos salas y ${totalRounds} rondas. Entre los azules, un Presidente; entre los rojos, un Bombardero.` }],
  };
  // Las salas se reparten al azar: el altavoz elegido «para la Sala 1» puede
  // haber caído en la 2. Se ajustan las voces a dónde está cada dispositivo.
  rebalanceSpeakers(game);
  await txWithRetry(async (t) => {
    const snap = await t.get(gref(slug));
    if (!snap.exists()) throw new Error('El grupo ya no existe');
    await assertFree(t, slug, members);
    t.update(gref(slug), { lastNarratorId: master });
    t.set(mref(slug, mid), sanitize({
      gameId: 'two_rooms', createdAt: now,
      members, masterId: master, lastNarratorId: master, settings: {}, extraRoles: [], game,
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

/** Arranca el reloj de la ronda: desde el reparto (todos han visto su carta) o
 *  desde la COLOCACIÓN tras un intercambio (cuando todos están en su sala).
 *  Cualquier jugador. */
export async function beginRound(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (!game.playerIds.includes(me)) return null;
    if (game.phase === 'reveal') {
      if (!game.playerIds.every((pid) => game.seen[pid])) return null;
    } else if (game.phase !== 'move') {
      return null;
    }
    game.phase = 'discuss';
    game.durationMs = minutesForRound(game.round, game.totalRounds) * perMinMs();
    game.deadline = Date.now() + game.durationMs;
    game.log.push({ txt: `⏱️ Ronda ${game.round} de ${game.totalRounds}: ${minutesForRound(game.round, game.totalRounds)} minutos. Hablad, enseñad cartas y decidid a quién mandaréis de rehén.` });
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
    game.picks = { 0: null, 1: null };
    game.deadline = Date.now() + hostageMs(); // el voto TAMBIÉN tiene plazo
    const k = hostagesPerRoom(game);
    game.log.push({ txt: `🔔 ¡Fin de la ronda! Cada sala vota, contrarreloj, a ${k === 1 ? 'quién manda de rehén' : `las ${k} personas que manda de rehenes`} a la otra.` });
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
    return maybeCloseRooms(game);
  });
}

/** Cerrar la votación de tu sala sin esperar a los que faltan (ya ha votado la
 *  mayoría). Válvula de escape si a alguien se le muere el móvil. */
export async function closeRoomVote(): Promise<void> {
  const me = myPid();
  await tx((game) => {
    if (game.phase !== 'hostages' || !game.playerIds.includes(me)) return null;
    const r = roomOf(game, me);
    if (game.picks[r] !== null || !majorityVotedInRoom(game, r)) return null;
    game.log.push({ txt: `🗳️ La sala ${r + 1} cierra su votación sin esperar a los que faltan.` });
    return settle(game, [r]);
  });
}

/** Vence el plazo del voto: cierran las DOS salas con los votos emitidos. Sin
 *  esto, un móvil apagado congelaba la partida (solo quedaba «Terminar»). */
export async function hostagesTimeUp(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'hostages' || game.deadline === null) return null;
    if (Date.now() < game.deadline - 1500) return null; // aún no (tolerancia de reloj)
    game.log.push({ txt: '⏱️ Se acaba el tiempo de votar: cada sala manda a los más votados y quien no votó se abstiene.' });
    return settle(game, [0, 1]);
  });
}

// Fija los rehenes de las salas indicadas y, con las dos decididas, intercambia
// (lo comparten el voto, el reloj y las salidas a mitad de votación).
function settle(game: TwoRoomsState, rooms: (0 | 1)[]): TwoRoomsState {
  const k = hostagesPerRoom(game);
  for (const r of rooms) {
    if (game.picks[r] !== null) continue;
    game.picks[r] = roomMembers(game, r).length ? tallyRoom(game, r, k) : [];
    // Se calla QUIÉN cruza hasta que las dos salas han decidido: el diario y la
    // voz llegan a las dos, y en la mesa el trueque se decide a ciegas.
    if (game.picks[r === 0 ? 1 : 0] === null) {
      game.log.push({ txt: `🗳️ La sala ${r + 1} ya ha decidido a quién manda. Falta la otra sala.` });
    }
  }
  return game.picks[0] !== null && game.picks[1] !== null ? doSwap(game) : game;
}

// Cierra las salas que ya han votado enteras (y las que se han quedado VACÍAS:
// una sala sin nadie no puede votar y no debe colgar la partida).
function maybeCloseRooms(game: TwoRoomsState): TwoRoomsState {
  const ready = ([0, 1] as const).filter((r) => allVotedInRoom(game, r) || roomMembers(game, r).length === 0);
  return settle(game, [...ready]);
}

function doSwap(game: TwoRoomsState): TwoRoomsState {
  const a = game.picks[0] || [];
  const b = game.picks[1] || [];
  for (const pid of a) game.room[pid] = 1;
  for (const pid of b) game.room[pid] = 0;
  game.swaps.push({ round: game.round, from0: a, from1: b });
  game.log.push({ txt: `🔄 Intercambio: de la Sala 1 cruza ${nameList(game, a)}; de la Sala 2, ${nameList(game, b)}.` });
  rebalanceSpeakers(game); // si un altavoz cruza, su sala no puede quedarse muda
  if (game.round < game.totalRounds) {
    // Colocación SIN reloj (B22): los rehenes cruzan de sala con calma y,
    // cuando todos están en su sitio, cualquiera arranca la ronda con el botón.
    game.round += 1;
    game.phase = 'move';
    game.hVotes = {};
    game.picks = { 0: null, 1: null };
    game.deadline = null;
    game.log.push({ txt: `🚶 Colocaos: los rehenes cruzan de sala. Cuando estéis cada uno en la vuestra, pulsad empezar la ronda ${game.round}.` });
    return game;
  }
  return finish(game);
}

function finish(game: TwoRoomsState): TwoRoomsState {
  const winner = decideWinner(game);
  game.winner = winner;
  game.winReason = WIN_LABELS[winner];
  game.phase = 'end';
  game.deadline = null;
  for (const pid of game.playerIds) if (game.teams[pid] === winner) game.scores[pid] = (game.scores[pid] || 0) + 1;
  const pres = presidentId(game);
  const bomb = bomberId(game);
  game.log.push({ txt: `🏁 El Presidente era ${nameOf(game, pres)} y el Bombardero ${nameOf(game, bomb)}. ${winner === 'red' ? 'Acabaron en la misma sala: ¡BOOM! Gana el ROJO.' : 'Acabaron en salas distintas: el Presidente vive. Gana el AZUL.'} Cada jugador del bando ganador se lleva 1 punto.` });
  return game;
}

// ——— Revancha / fin ———

export async function playAgain(): Promise<void> {
  await tx((game) => {
    if (game.phase !== 'end') return null;
    if (game.playerIds.length < MIN_PLAYERS) return null; // sin quórum no hay revancha
    const seed = (game.seed || 0) + 101;
    const deal = dealGame(game.playerIds, seed);
    game.seed = seed;
    game.round = 1;
    game.totalRounds = roundsFor(game.playerIds.length); // la mesa pudo encoger
    game.phase = 'reveal';
    game.teams = deal.teams;
    game.roles = deal.roles;
    game.room = deal.room;
    game.seen = {};
    game.deadline = null;
    game.hVotes = {};
    game.picks = { 0: null, 1: null };
    game.swaps = [];
    game.winner = null;
    game.winReason = null;
    rebalanceSpeakers(game); // las salas se reparten de nuevo: las voces también
    game.log.push({ txt: `🔁 Nueva partida: bandos, roles y salas repartidos de nuevo, a ${game.totalRounds} rondas.` });
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
    // Ni la ronda ni el voto de rehén pierden tiempo por una pausa.
    if (game.deadline !== null) {
      game.deadline += Math.max(0, Date.now() - game.paused.at);
    }
    game.paused = null;
    return game;
  }, undefined, { allowPaused: true });
}
export async function requestRepeat(): Promise<void> {
  await tx((game) => { game.repeatNonce = (game.repeatNonce || 0) + 1; return game; }, undefined, { allowPaused: true });
}

/** Dejar la partida (o sacar a otro desde la mesa): salida elegante — el juego
 *  sigue para los demás (rinde su bando si era Presidente/Bombardero; re-reparte
 *  en el reparto; se disuelve por debajo del mínimo). */
export async function leaveTwoRooms(targetPid?: string, mid?: string): Promise<void> {
  const me = targetPid || myPid();
  await tx((game, m) => {
    const members = m.members || [];
    if (!members.includes(me)) return null;
    const dropMembers = members.filter((x) => x !== me);
    const wasMaster = m.masterId === me;
    // La voz no se queda huérfana: si sale el altavoz principal, el mando pasa
    // a otro miembro (preferiblemente uno que juegue).
    const masterPatch = !wasMaster ? undefined
      : dropMembers.find((x) => game.playerIds.includes(x)) ?? dropMembers[0] ?? null;
    if (game.roomSpeakers[0] === me) game.roomSpeakers[0] = masterPatch ?? null;
    if (game.roomSpeakers[1] === me) game.roomSpeakers[1] = null;
    const outcome = leavePlayer(game, me);
    if (outcome === 'not-player') {
      // Altavoz puro (no juega): sale sin tocar la partida.
      const who = state.players.find((p) => p.id === me)?.name || 'Un altavoz';
      game.log.push({ txt: `🚪 ${who} deja la partida.` });
    }
    if (game.phase !== 'end') rebalanceSpeakers(game); // que ninguna sala se quede muda
    // Su salida puede completar el voto de rehén de su sala (o de la otra).
    const g2 = game.phase === 'hostages' ? maybeCloseRooms(game) : game;
    return wasMaster ? { game: g2, members: dropMembers, masterPatch } : { game: g2, members: dropMembers };
  }, mid, { allowPaused: true });
}

registerMatchTools('two_rooms', {
  leave: (mid, pid) => leaveTwoRooms(pid, mid),
  end: (mid) => endTwoRooms(mid),
});

export { playersOf, roomMembers, roomOf };
