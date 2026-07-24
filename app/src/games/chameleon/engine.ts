// Motor puro de «El Camaleón»: reparto de la ronda (tema, palabra secreta,
// Camaleón y quién empieza) y recuento del voto. Sin navegador ni Firebase.
import { TOPICS, topicById } from './topics';
import type { ChameleonState } from './types';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;
export const GRID_SIZE = 16;
/** Margen antes de ofrecer cerrar el voto sin quien no responde (móvil perdido…). */
export const VOTE_GRACE_MS = 45_000;
/** Ídem para el Camaleón que no señala su apuesta: la mesa puede resolver. */
export const GUESS_GRACE_MS = 60_000;

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

/**
 * Reparte una ronda: tema no repetido, palabra secreta, Camaleón y starter.
 * `prevChameleonId` se excluye del sorteo (la app anuncia «nuevo Camaleón»: si
 * repitiera, la frase sería mentira y la mesa descartaría a quien no debe).
 */
export function dealRound(playerIds: string[], round: number, usedTopics: string[], seed: number, prevChameleonId?: string | null): DealResult {
  const rnd = mulberry32(seed);
  let pool = TOPICS.filter((t) => !usedTopics.includes(t.id));
  if (!pool.length) {
    const last = usedTopics[usedTopics.length - 1];
    pool = TOPICS.filter((t) => t.id !== last); // agotados: se rebaraja (sin repetir el último)
  }
  const topic = pool[Math.floor(rnd() * pool.length)];
  const secret = Math.floor(rnd() * GRID_SIZE);
  const candidates = playerIds.filter((p) => p !== prevChameleonId);
  const chamPool = candidates.length ? candidates : playerIds;
  const chameleonId = chamPool[Math.floor(rnd() * chamPool.length)];
  const starterIdx = Math.floor(rnd() * playerIds.length);
  return { topicId: topic.id, grid: topic.words.slice(), secret, chameleonId, starterIdx };
}

// ——— Turno de las pistas ———

/** Orden de las pistas: empieza el starter y sigue el orden de la mesa. */
export function clueOrder(game: ChameleonState): string[] {
  const ids = game.playerIds || [];
  const s = ((game.starterIdx || 0) % (ids.length || 1) + ids.length) % (ids.length || 1);
  return [...ids.slice(s), ...ids.slice(0, s)];
}

/** Pistas ya dadas (tolerante con partidas repartidas antes de existir el turno). */
export function cluesGiven(game: ChameleonState): number {
  const n = (game.playerIds || []).length;
  return Math.max(0, Math.min(n, game.clueIdx ?? 0));
}

/** A quién le toca hablar ahora (null = ya han hablado todos). */
export function currentCluePid(game: ChameleonState): string | null {
  return clueOrder(game)[cluesGiven(game)] ?? null;
}

/** Quién habla después del actual (null = el actual cierra la ronda de pistas). */
export function nextCluePid(game: ChameleonState): string | null {
  return clueOrder(game)[cluesGiven(game) + 1] ?? null;
}

/** ¿Han dado ya su pista los N jugadores? */
export function cluesDone(game: ChameleonState): boolean {
  return cluesGiven(game) >= (game.playerIds || []).length;
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

/** Cuántos han votado ya (para saber si se puede cerrar el voto sin todos). */
export function votedCount(game: ChameleonState): number {
  return game.playerIds.filter((pid) => game.votes[pid] !== undefined).length;
}

export interface VoteRow { pid: string; voters: string[] }

/**
 * El recuento destapado: a quién señaló cada cual, agrupado por señalado y de
 * más a menos votos. Es lo que la ayuda promete («la app destapa el recuento»).
 */
export function voteRows(game: ChameleonState): VoteRow[] {
  const by: Record<string, string[]> = {};
  for (const voter of game.playerIds) {
    const t = game.votes?.[voter];
    if (t && game.playerIds.includes(t)) (by[t] ||= []).push(voter);
  }
  return Object.entries(by)
    .map(([pid, voters]) => ({ pid, voters }))
    .sort((a, b) => b.voters.length - a.voters.length || game.playerIds.indexOf(a.pid) - game.playerIds.indexOf(b.pid));
}

export const WIN_LABELS: Record<'chameleon' | 'group', string> = {
  chameleon: '🦎 ¡Gana el Camaleón! Se escurre entre las palabras.',
  group: '👥 ¡Gana el grupo! El Camaleón ha quedado al descubierto.',
};

/** POR QUÉ se ganó la ronda: los cuatro desenlaces posibles, en una frase. */
export function outcomeReason(game: ChameleonState): string {
  const cham = game.names?.[game.chameleonId] || '¿?';
  if (game.winner === 'group') return `Señalasteis a ${cham} y no supo la palabra secreta.`;
  if (game.caught) return `Señalasteis a ${cham}… pero acertó la palabra secreta y se escapa.`;
  if (!game.accusedId) return 'Empate en el voto: la mesa no señaló a nadie con claridad y el Camaleón se libra.';
  const acc = game.names?.[game.accusedId] || '¿?';
  return `Señalasteis a ${acc}, que era inocente: la ronda acaba ahí y el Camaleón ni siquiera tiene que adivinar.`;
}

export function topicName(topicId: string): string {
  const t = topicById(topicId);
  return t ? `${t.emoji} ${t.name}` : topicId;
}
