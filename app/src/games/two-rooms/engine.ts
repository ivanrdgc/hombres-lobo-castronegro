// Motor puro de «Two Rooms and a Boom» (adaptación digital): reparto de bandos,
// roles y salas; recuento del voto de rehén de cada sala; intercambio; y
// dictamen final (¿acabó el Bombardero en la sala del Presidente?). Sin
// navegador ni Firebase; determinista por semilla → probable entero.
import type { TwoRoomsState, Team, Role } from './types';

export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 30;
export const TOTAL_ROUNDS = 3;

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

/** ¿Han votado ya todos los de la sala r? */
export const allVotedInRoom = (game: TwoRoomsState, r: 0 | 1): boolean => {
  const mem = roomMembers(game, r);
  return mem.length > 0 && mem.every((pid) => game.hVotes[pid] !== undefined);
};

/**
 * Rehén elegido por una sala: el más votado por los suyos (los votos válidos son
 * a gente de la MISMA sala). Empate en cabeza → el primero por orden de mesa
 * (determinista).
 */
export function tallyRoom(game: TwoRoomsState, r: 0 | 1): string | null {
  const mem = roomMembers(game, r);
  const counts: Record<string, number> = {};
  for (const voter of mem) {
    const t = game.hVotes[voter];
    if (t && mem.includes(t)) counts[t] = (counts[t] || 0) + 1;
  }
  let best: string | null = null;
  let max = 0;
  for (const pid of game.playerIds) { // orden de mesa como desempate estable
    const cprev = counts[pid] || 0;
    if (cprev > max) { max = cprev; best = pid; }
  }
  return max > 0 ? best : null;
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

export const teamLabel = (t: Team): string => (t === 'red' ? '🔴 Rojo' : '🔵 Azul');

export const VOICE_MODES = ['single', 'perRoom', 'all'] as const;

/**
 * ¿Debe narrar este dispositivo? Depende del modo de voz (las dos salas están
 * separadas, así que a veces interesa más de un altavoz):
 * - `all`: narran todos los jugadores (y el anfitrión) → cada sala se oye sola.
 * - `perRoom`: narran los dos altavoces designados (uno por sala).
 * - `single`: narra solo el altavoz principal (el masterId de la partida).
 */
export function narrates(game: TwoRoomsState, pid: string, masterId: string | null): boolean {
  if (!pid) return false;
  if (game.voiceMode === 'all') return game.playerIds.includes(pid) || pid === masterId;
  if (game.voiceMode === 'perRoom') return pid === game.roomSpeakers[0] || pid === game.roomSpeakers[1];
  return pid === masterId;
}
