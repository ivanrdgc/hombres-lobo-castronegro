// Motor puro de «Insider»: reparto de la ronda (palabra secreta, Maestro
// público que rota, Insider oculto y quién pregunta primero) y recuento de la
// caza del Insider. Sin navegador ni Firebase.
import { WORDS } from './words';
import type { InsiderState, Role } from './types';

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 12;
export const INSIDER_DURATIONS_MIN = [3, 5, 8];
export const INSIDER_DEFAULT_MIN = 5;

export interface Player { id: string; name?: string; order?: number }

export function playersOf(game: InsiderState): Player[] {
  return (game.playerIds || []).map((id, i) => ({ id, name: game.names?.[id] || id, order: i }));
}

export function roleOf(game: InsiderState, pid: string): Role {
  if (pid === game.masterId) return 'master';
  if (pid === game.insiderId) return 'insider';
  return 'common';
}
export const isMaster = (game: InsiderState, pid: string): boolean => game.masterId === pid;
export const isInsider = (game: InsiderState, pid: string): boolean => game.insiderId === pid;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DealResult {
  word: string;
  masterId: string;
  insiderId: string;
  starterIdx: number;
}

/** Reparte una ronda: el Maestro ROTA por rondas (índice (ronda-1) % n); el
 *  Insider es cualquiera menos el Maestro; la palabra no se repite hasta
 *  agotarse; quien pregunta primero sale al azar. */
export function dealRound(playerIds: string[], round: number, usedWords: string[], seed: number): DealResult {
  const rnd = mulberry32(seed);
  const n = playerIds.length;
  const masterIdx = ((round - 1) % n + n) % n;
  const masterId = playerIds[masterIdx];
  const others = playerIds.filter((_, i) => i !== masterIdx);
  const insiderId = others[Math.floor(rnd() * others.length)];
  let pool = WORDS.filter((w) => !usedWords.includes(w));
  if (!pool.length) {
    const last = usedWords[usedWords.length - 1];
    pool = WORDS.filter((w) => w !== last); // agotadas: se rebaraja (sin repetir la última)
  }
  const word = pool[Math.floor(rnd() * pool.length)];
  const starterIdx = Math.floor(rnd() * n);
  return { word, masterId, insiderId, starterIdx };
}

export interface VoteTally {
  counts: Record<string, number>;
  /** Señalado por mayoría ESTRICTA; null si hay empate en cabeza. */
  accusedId: string | null;
}

/** Recuento de la caza: el más señalado (único). No cuentan votos al Maestro
 *  (es público) ni fuera de la partida. Empate en cabeza → nadie (null). */
export function tallyVotes(game: InsiderState): VoteTally {
  const counts: Record<string, number> = {};
  for (const voter of game.playerIds) {
    const target = game.votes[voter];
    if (target && game.playerIds.includes(target) && target !== game.masterId) {
      counts[target] = (counts[target] || 0) + 1;
    }
  }
  let max = 0;
  let accusedId: string | null = null;
  let tie = false;
  for (const pid of game.playerIds) {
    const c = counts[pid] || 0;
    if (c > max) { max = c; accusedId = pid; tie = false; } else if (c === max && c > 0) { tie = true; }
  }
  return { counts, accusedId: max > 0 && !tie ? accusedId : null };
}

/** ¿Han votado ya todos los jugadores (incluido el Maestro)? */
export function allVoted(game: InsiderState): boolean {
  return game.playerIds.every((pid) => game.votes[pid] !== undefined);
}

export const WIN_LABELS: Record<'group' | 'insider' | 'timeout', string> = {
  group: '👥 ¡Cazado! El equipo desenmascara al Insider.',
  insider: '🕵️ ¡Gana el Insider! Guio la partida sin que lo pillaran.',
  timeout: '⏰ Se acabó el tiempo sin adivinar la palabra: pierden todos.',
};
