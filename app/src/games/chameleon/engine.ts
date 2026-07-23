// Motor puro de «El Camaleón»: reparto de la ronda (tema, palabra secreta,
// Camaleón y quién empieza) y recuento del voto. Sin navegador ni Firebase.
import { TOPICS, topicById } from './topics';
import type { ChameleonState } from './types';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;
export const GRID_SIZE = 16;

export interface Player { id: string; name?: string; order?: number }

export function playersOf(game: ChameleonState): Player[] {
  return (game.playerIds || []).map((id, i) => ({ id, name: game.names?.[id] || id, order: i }));
}

export function isChameleon(game: ChameleonState, pid: string): boolean {
  return game.chameleonId === pid;
}

/** Palabra secreta como texto (para las cartas de quien la conoce). */
export function secretWord(game: ChameleonState): string {
  return game.grid[game.secret] ?? '';
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

export interface DealResult {
  topicId: string;
  grid: string[];
  secret: number;
  chameleonId: string;
  starterIdx: number;
}

/** Reparte una ronda: tema no repetido, palabra secreta, Camaleón y starter. */
export function dealRound(playerIds: string[], round: number, usedTopics: string[], seed: number): DealResult {
  const rnd = mulberry32(seed);
  let pool = TOPICS.filter((t) => !usedTopics.includes(t.id));
  if (!pool.length) {
    const last = usedTopics[usedTopics.length - 1];
    pool = TOPICS.filter((t) => t.id !== last); // agotados: se rebaraja (sin repetir el último)
  }
  const topic = pool[Math.floor(rnd() * pool.length)];
  const secret = Math.floor(rnd() * GRID_SIZE);
  const chameleonId = playerIds[Math.floor(rnd() * playerIds.length)];
  const starterIdx = Math.floor(rnd() * playerIds.length);
  return { topicId: topic.id, grid: topic.words.slice(), secret, chameleonId, starterIdx };
}

export interface VoteTally {
  counts: Record<string, number>;
  /** Señalado por mayoría ESTRICTA; null si hay empate en cabeza. */
  accusedId: string | null;
}

/** Recuento del voto: el más votado (único); empate en cabeza → nadie (null). */
export function tallyVotes(game: ChameleonState): VoteTally {
  const counts: Record<string, number> = {};
  for (const voter of game.playerIds) {
    const target = game.votes[voter];
    if (target && game.playerIds.includes(target)) counts[target] = (counts[target] || 0) + 1;
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

/** ¿Han votado ya todos los jugadores? */
export function allVoted(game: ChameleonState): boolean {
  return game.playerIds.every((pid) => game.votes[pid] !== undefined);
}

export const WIN_LABELS: Record<'chameleon' | 'group', string> = {
  chameleon: '🦎 ¡Gana el Camaleón! Se escurre entre las palabras.',
  group: '👥 ¡Gana el grupo! El Camaleón ha quedado al descubierto.',
};

export function topicName(topicId: string): string {
  const t = topicById(topicId);
  return t ? `${t.emoji} ${t.name}` : topicId;
}
