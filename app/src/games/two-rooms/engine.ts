// Motor puro de «Two Rooms and a Boom» (adaptación digital): reparto de bandos,
// roles y salas; recuento del voto de rehén de cada sala; intercambio; y
// dictamen final (¿acabó el Bombardero en la sala del Presidente?). Sin
// navegador ni Firebase; determinista por semilla → probable entero.
import { narratesIn } from '../../core/narrator/voice-mode';
import type { TwoRoomsState, Team, Role } from './types';

export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 30;
/** Plazo del voto de rehén (segundos): sin él, un móvil que se apaga dejaba la
 *  partida colgada para siempre (nadie más podía cerrar la votación). */
export const HOSTAGE_SECONDS = 60;

/**
 * Rondas según el tamaño de la mesa, como el juego original: hasta 10 jugadores
 * bastan 3 rondas (3, 2 y 1 minutos); de 11 en adelante hacen falta 5 (5, 4, 3,
 * 2 y 1) o casi nadie llegaría a cambiar de sala.
 */
export function roundsFor(playerCount: number): number {
  return playerCount <= 10 ? 3 : 5;
}

export interface Player { id: string; name?: string; order?: number }

export function playersOf(game: TwoRoomsState): Player[] {
  return (game.playerIds || []).map((id, i) => ({ id, name: game.names?.[id] || id, order: i }));
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  const rnd = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Minutos de una ronda: la última dura 1 min, y sube al retroceder. */
export function minutesForRound(round: number, totalRounds: number): number {
  return Math.max(1, totalRounds - round + 1);
}

export interface Deal {
  teams: Record<string, Team>;
  roles: Record<string, Role>;
  room: Record<string, 0 | 1>;
  presidentId: string;
  bomberId: string;
}

/**
 * Reparte bandos (mitad rojo / mitad azul; el azul se lleva el sobrante impar),
 * el Presidente (azul) y el Bombardero (rojo), y las dos salas (reparto par e
 * INDEPENDIENTE de los bandos, para que salgan mezclados).
 */
export function dealGame(playerIds: string[], seed: number): Deal {
  const n = playerIds.length;
  const byTeam = shuffled(playerIds, seed);
  const blueCount = Math.ceil(n / 2);
  const teams: Record<string, Team> = {};
  byTeam.forEach((pid, i) => { teams[pid] = i < blueCount ? 'blue' : 'red'; });
  const blues = byTeam.filter((pid) => teams[pid] === 'blue');
  const reds = byTeam.filter((pid) => teams[pid] === 'red');
  const rnd = mulberry32(seed ^ 0x5bd1e995);
  const presidentId = blues[Math.floor(rnd() * blues.length)];
  const bomberId = reds[Math.floor(rnd() * reds.length)];
  const roles: Record<string, Role> = {};
  for (const pid of playerIds) roles[pid] = pid === presidentId ? 'president' : pid === bomberId ? 'bomber' : 'none';
  const byRoom = shuffled(playerIds, seed ^ 0x9e3779b9);
  const room0 = Math.ceil(n / 2);
  const room: Record<string, 0 | 1> = {};
  byRoom.forEach((pid, i) => { room[pid] = i < room0 ? 0 : 1; });
  return { teams, roles, room, presidentId, bomberId };
}

// ——— Consultas ———

export const roomMembers = (game: TwoRoomsState, r: 0 | 1): string[] =>
  game.playerIds.filter((pid) => game.room[pid] === r);

export const roomOf = (game: TwoRoomsState, pid: string): 0 | 1 => game.room[pid];

export const presidentId = (game: TwoRoomsState): string | null =>
  game.playerIds.find((pid) => game.roles[pid] === 'president') || null;

export const bomberId = (game: TwoRoomsState): string | null =>
  game.playerIds.find((pid) => game.roles[pid] === 'bomber') || null;

/**
 * Cuántos rehenes manda CADA sala esta ronda: uno de cada cuatro, mínimo uno.
 * Se mide sobre la sala más pequeña para que el trueque sea parejo (si una
 * mandara más que la otra, las salas se descompensarían ronda a ronda).
 */
export function hostagesPerRoom(game: TwoRoomsState): number {
  const small = Math.min(roomMembers(game, 0).length, roomMembers(game, 1).length);
  return Math.max(1, Math.ceil(small / 4));
}

/** ¿Han votado ya todos los de la sala r? */
export const allVotedInRoom = (game: TwoRoomsState, r: 0 | 1): boolean => {
  const mem = roomMembers(game, r);
  return mem.length > 0 && mem.every((pid) => game.hVotes[pid] !== undefined);
};

/** ¿Ha votado ya MÁS DE LA MITAD de la sala? Habilita cerrar la votación a mano
 *  sin esperar al que se ha quedado sin batería. */
export const majorityVotedInRoom = (game: TwoRoomsState, r: 0 | 1): boolean => {
  const mem = roomMembers(game, r);
  const voted = mem.filter((pid) => game.hVotes[pid] !== undefined).length;
  return mem.length > 0 && voted * 2 > mem.length;
};

/** Quiénes de la sala r aún no han votado (para decir a quién se espera). */
export const pendingInRoom = (game: TwoRoomsState, r: 0 | 1): string[] =>
  roomMembers(game, r).filter((pid) => game.hVotes[pid] === undefined);

/**
 * Rehenes elegidos por una sala: los `k` más votados por los suyos (los votos
 * válidos son a gente de la MISMA sala). Empates —y los huecos, si la sala
 * concentró los votos en menos de k personas— se resuelven por orden de mesa,
 * así que el resultado es determinista y nunca se queda corto.
 */
export function tallyRoom(game: TwoRoomsState, r: 0 | 1, k = 1): string[] {
  const mem = roomMembers(game, r);
  const counts: Record<string, number> = {};
  for (const voter of mem) {
    const t = game.hVotes[voter];
    if (t && mem.includes(t)) counts[t] = (counts[t] || 0) + 1;
  }
  const order = new Map(game.playerIds.map((pid, i) => [pid, i]));
  return mem
    .slice()
    .sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || (order.get(a) ?? 0) - (order.get(b) ?? 0))
    .slice(0, Math.max(0, Math.min(k, mem.length)));
}

/** Dictamen final: gana el rojo si Bombardero y Presidente comparten sala. */
export function decideWinner(game: TwoRoomsState): Team {
  const p = presidentId(game);
  const b = bomberId(game);
  if (!p || !b) return 'blue';
  return game.room[p] === game.room[b] ? 'red' : 'blue';
}

export const WIN_LABELS: Record<Team, string> = {
  red: '💥 ¡BOOM! El Bombardero acabó junto al Presidente. Gana el equipo ROJO.',
  blue: '🕊️ El Presidente sobrevive: el Bombardero quedó en la otra sala. Gana el equipo AZUL.',
};

/** Lista de nombres legible («Ana», «Ana y Bea», «Ana, Bea y Coco»). */
export function nameList(game: TwoRoomsState, ids: string[]): string {
  const ns = ids.map((pid) => game.names[pid] || '¿?');
  if (!ns.length) return 'nadie';
  if (ns.length === 1) return ns[0];
  return `${ns.slice(0, -1).join(', ')} y ${ns[ns.length - 1]}`;
}

/**
 * La voz de cada sala vive en un dispositivo físico de esa sala (modo perRoom).
 * Si el altavoz es un JUGADOR y cruza como rehén, se lleva el móvil consigo: hay
 * que repartir de nuevo las voces o una sala se queda muda el resto de partida.
 * Los altavoces que no juegan (una tele, una tablet) no se mueven nunca.
 */
export function rebalanceSpeakers(game: TwoRoomsState): void {
  if (game.voiceMode !== 'perRoom') return;
  const next: [string | null, string | null] = [null, null];
  for (const r of [0, 1] as const) {
    const s = game.roomSpeakers[r];
    if (s && !game.playerIds.includes(s)) next[r] = s; // fijo: se queda en su sala
  }
  for (const r of [0, 1] as const) {
    const s = game.roomSpeakers[r];
    if (!s || !game.playerIds.includes(s)) continue;
    const nr = game.room[s];
    if (nr !== undefined && next[nr] === null) next[nr] = s;
  }
  for (const r of [0, 1] as const) {
    if (next[r]) continue; // sala sin voz: la toma cualquiera de los que están en ella
    next[r] = roomMembers(game, r).find((pid) => pid !== next[r === 0 ? 1 : 0]) ?? null;
  }
  game.roomSpeakers = next;
}

// ——— Salida a mitad de partida ———

// Quita las huellas de un jugador del estado (sus votos y su sitio); su nombre
// se conserva para que el diario siga legible.
function stripPlayer(game: TwoRoomsState, pid: string): void {
  delete game.teams[pid];
  delete game.roles[pid];
  delete game.room[pid];
  delete game.hVotes[pid];
  delete game.seen[pid];
}

// La partida se queda sin quórum: se disuelve sin ganador ni puntos.
function dissolve(game: TwoRoomsState): 'dissolved' {
  game.phase = 'end';
  game.deadline = null;
  game.winner = null;
  game.winReason = `🚪 Quedasteis menos de ${MIN_PLAYERS}: la partida se disolvió sin ganador.`;
  game.log.push({ txt: `🚪 Quedan menos de ${MIN_PLAYERS} jugadores: la partida se disuelve sin ganador y se destapan las cartas.` });
  return 'dissolved';
}

export type LeaveOutcome = 'not-player' | 'roster' | 'redeal' | 'dissolved' | 'forfeit' | 'removed';

/**
 * Salida a mitad de partida (abandono o «sacar de la partida» desde la mesa).
 * Mutador puro sobre el estado del juego (members/masterId van aparte):
 *  - en el reparto, se reparte de nuevo entre los que quedan;
 *  - si se va el PRESIDENTE o el BOMBARDERO, su bando se rinde y gana el otro
 *    (anti-abandono, como el espía que huye en El Espía);
 *  - un jugador normal simplemente sale (sus votos de rehén se anulan y, si ya
 *    era el rehén elegido, su sala vuelve a decidir);
 *  - por debajo del mínimo, la partida se disuelve sin ganador.
 */
export function leavePlayer(game: TwoRoomsState, pid: string): LeaveOutcome {
  if (!game.playerIds.includes(pid)) return 'not-player';
  const name = game.names[pid] || '¿?';
  if (game.phase === 'end') {
    game.playerIds = game.playerIds.filter((x) => x !== pid);
    stripPlayer(game, pid);
    game.log.push({ txt: `🚪 ${name} deja la partida.` });
    return 'roster';
  }
  if (game.phase === 'reveal') {
    game.playerIds = game.playerIds.filter((x) => x !== pid);
    stripPlayer(game, pid);
    if (game.playerIds.length < MIN_PLAYERS) return dissolve(game);
    const deal = dealGame(game.playerIds, (game.seed || 0) + 977);
    game.teams = deal.teams;
    game.roles = deal.roles;
    game.room = deal.room;
    game.seen = {};
    game.log.push({ txt: `🚪 ${name} deja la partida. Bandos, roles y salas se reparten de nuevo: mirad vuestra carta otra vez.` });
    return 'redeal';
  }
  // discuss / hostages
  const role = game.roles[pid];
  game.playerIds = game.playerIds.filter((x) => x !== pid);
  const wasPicked = ([0, 1] as const).filter((r) => (game.picks?.[r] || []).includes(pid));
  stripPlayer(game, pid);
  if (role === 'president' || role === 'bomber') {
    const winner: Team = role === 'president' ? 'red' : 'blue';
    game.phase = 'end';
    game.deadline = null;
    game.winner = winner;
    // El cartel final no puede cantar «¡BOOM!» si nadie ha volado nada: la
    // rendición se cuenta tal cual.
    game.winReason = role === 'president'
      ? `🚪 ${name} era el PRESIDENTE y abandonó la partida: el azul se rinde y gana el equipo ROJO.`
      : `🚪 ${name} era el BOMBARDERO y abandonó la partida: la bomba se fue con él y gana el equipo AZUL.`;
    for (const p of game.playerIds) if (game.teams[p] === winner) game.scores[p] = (game.scores[p] || 0) + 1;
    game.log.push({ txt: role === 'president'
      ? `🚪 ¡${name} era el PRESIDENTE y abandona! El azul se rinde: gana el equipo ROJO.`
      : `🚪 ¡${name} era el BOMBARDERO y abandona! La bomba se va con él: gana el equipo AZUL.` });
    return 'forfeit';
  }
  game.log.push({ txt: `🚪 ${name} deja la partida.` });
  if (game.playerIds.length < MIN_PLAYERS) return dissolve(game);
  if (game.phase === 'hostages') {
    for (const r of wasPicked) game.picks[r] = null; // era rehén: su sala vuelve a decidir
    // Los votos que lo señalaban caen: esos vecinos vuelven a votar.
    for (const [voter, target] of Object.entries(game.hVotes)) {
      if (target === pid) delete game.hVotes[voter];
    }
  }
  return 'removed';
}

export const teamLabel = (t: Team): string => (t === 'red' ? '🔴 Rojo' : '🔵 Azul');

export { VOICE_MODES } from '../../core/narrator/voice-mode';

/**
 * ¿Debe narrar este dispositivo? Depende del modo de voz (las dos salas están
 * separadas): mecanismo compartido en core/narrator/voice-mode.
 */
export function narrates(game: TwoRoomsState, pid: string, masterId: string | null): boolean {
  return narratesIn(game.voiceMode, game.roomSpeakers, game.playerIds, pid, masterId);
}
