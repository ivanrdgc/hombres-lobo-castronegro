// Motor puro de «Good Cop Bad Cop»: reparto de bandos y líderes, y las acciones
// del turno (investigar, armarse, apuntar, disparar). Ganas matando al líder
// del bando contrario. Sin navegador ni Firebase; determinista por semilla.
import type { Card, Kind } from './cards';
import type { GoodCopState } from './types';

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 8;

export type Band = 'honest' | 'crook';

export interface Player { id: string; name?: string; order?: number }
export function playersOf(game: GoodCopState): Player[] {
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
function shuffled<T>(arr: readonly T[], seed: number): T[] {
  const a = arr.slice(); const rnd = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ——— Consultas ———

export const isAlive = (game: GoodCopState, pid: string): boolean => !!game.alive[pid];
export const aliveIds = (game: GoodCopState): string[] => game.playerIds.filter((p) => game.alive[p]);

/** Bando de un jugador: la mayoría de sus 3 cartas. */
export function bandOf(cards: Card[]): Band {
  return cards.filter((c) => c.kind === 'crook').length > cards.length / 2 ? 'crook' : 'honest';
}
export const bandOfPid = (game: GoodCopState, pid: string): Band => bandOf(game.cards[pid]);

/** El líder de un bando (Agente para honestos, Jefe para corruptos), o null. */
export function leaderId(game: GoodCopState, band: Band): string | null {
  const role = band === 'honest' ? 'agent' : 'kingpin';
  return game.playerIds.find((pid) => game.cards[pid].some((c) => c.role === role)) ?? null;
}
export const isLeader = (game: GoodCopState, pid: string): boolean =>
  game.cards[pid].some((c) => c.role);

export function nextAlive(game: GoodCopState, pid: string): string {
  const n = game.playerIds.length; const i = game.playerIds.indexOf(pid);
  for (let d = 1; d <= n; d++) { const c = game.playerIds[(i + d) % n]; if (game.alive[c]) return c; }
  return pid;
}

export const BAND_LABEL: Record<Band, string> = { honest: '👮 los Honestos', crook: '🦹 los Corruptos' };

// ——— Reparto ———

export interface Deal { cards: Record<string, Card[]> }

/**
 * Reparte bandos casi a la par y 3 cartas a cada uno: los honestos llevan 2
 * honestas + 1 corrupta (y viceversa), de modo que su BANDO sea su mayoría.
 * Un honesto al azar tiene el Agente; un corrupto al azar, el Jefe.
 */
export function dealGame(playerIds: string[], seed: number): Deal {
  const order = shuffled(playerIds, seed);
  const half = Math.ceil(order.length / 2);
  const honests = order.slice(0, half);
  const crooks = order.slice(half);
  const rnd = mulberry32(seed ^ 0x9e37);
  const agent = honests[Math.floor(rnd() * honests.length)];
  const kingpin = crooks[Math.floor(rnd() * crooks.length)];
  const cards: Record<string, Card[]> = {};
  let s = seed;
  const card = (kind: Kind, role: Card['role'] = null): Card => ({ kind, role, up: false });
  for (const pid of honests) {
    const set: Card[] = [card('honest', pid === agent ? 'agent' : null), card('honest'), card('crook')];
    cards[pid] = shuffled(set, (s += 7));
  }
  for (const pid of crooks) {
    const set: Card[] = [card('crook', pid === kingpin ? 'kingpin' : null), card('crook'), card('honest')];
    cards[pid] = shuffled(set, (s += 7));
  }
  return { cards };
}

// ——— Utilidades ———

const log = (game: GoodCopState, txt: string) => game.log.push({ txt });
const nm = (game: GoodCopState, pid: string | null | undefined) => (pid && game.names[pid]) || 'alguien';

function endTurn(game: GoodCopState): void {
  game.turn = nextAlive(game, game.turn);
}

function win(game: GoodCopState, winner: Band, reason: string): void {
  game.winner = winner;
  game.winReason = reason;
  game.phase = 'end';
  for (const pid of game.playerIds) if (bandOfPid(game, pid) === winner) game.scores[pid] = (game.scores[pid] || 0) + 1;
  log(game, `🏆 ¡Ganan ${BAND_LABEL[winner]}! ${reason}`);
}

// ——— Acciones (una por turno; todas avanzan el turno salvo victoria) ———

/** Investigar: mira EN SECRETO una carta boca abajo de otro jugador. */
export function investigate(game: GoodCopState, pid: string, target: string, idx: number): boolean {
  if (game.phase !== 'turn' || game.turn !== pid) return false;
  if (target === pid || !isAlive(game, target)) return false;
  const c = game.cards[target]?.[idx];
  if (!c || c.up) return false;
  game.peek = { by: pid, target, idx, kind: c.kind, role: c.role };
  log(game, `🔍 ${nm(game, pid)} investiga una carta de ${nm(game, target)}.`);
  endTurn(game);
  return true;
}

/** Armarse: coge una pistola. */
export function arm(game: GoodCopState, pid: string): boolean {
  if (game.phase !== 'turn' || game.turn !== pid || game.armed[pid]) return false;
  game.armed[pid] = true;
  log(game, `🔫 ${nm(game, pid)} empuña una pistola.`);
  endTurn(game);
  return true;
}

/** Apuntar a alguien (hay que estar armado). */
export function aim(game: GoodCopState, pid: string, target: string): boolean {
  if (game.phase !== 'turn' || game.turn !== pid || !game.armed[pid]) return false;
  if (target === pid || !isAlive(game, target)) return false;
  game.aimAt[pid] = target;
  log(game, `🎯 ${nm(game, pid)} apunta a ${nm(game, target)}.`);
  endTurn(game);
  return true;
}

/** Disparar al objetivo apuntado: lo mata y revela sus cartas. */
export function shoot(game: GoodCopState, pid: string): boolean {
  if (game.phase !== 'turn' || game.turn !== pid) return false;
  if (!game.armed[pid]) return false;
  const target = game.aimAt[pid];
  if (!target || !isAlive(game, target)) return false;
  game.armed[pid] = false; // gasta la bala
  game.aimAt[pid] = null;
  game.alive[target] = false;
  for (const c of game.cards[target]) c.up = true; // se revelan sus cartas
  const band = bandOfPid(game, target);
  const leader = isLeader(game, target);
  log(game, `💥 ${nm(game, pid)} dispara a ${nm(game, target)}: era de ${BAND_LABEL[band]}${leader ? ' ¡y su LÍDER!' : ''}.`);
  if (leader) {
    // Muere el líder de `band` → gana el bando contrario.
    win(game, band === 'honest' ? 'crook' : 'honest', `Ha caído ${band === 'honest' ? 'el Agente' : 'el Jefe'}.`);
    return true;
  }
  // Quien quede apuntando a un muerto pierde la mira.
  for (const p of game.playerIds) if (game.aimAt[p] === target) game.aimAt[p] = null;
  endTurn(game);
  return true;
}

export function resetForRematch(game: GoodCopState, seed: number): void {
  const deal = dealGame(game.playerIds, seed);
  game.seed = seed;
  game.phase = 'turn';
  game.cards = deal.cards;
  game.alive = Object.fromEntries(game.playerIds.map((p) => [p, true]));
  game.armed = Object.fromEntries(game.playerIds.map((p) => [p, false]));
  game.aimAt = Object.fromEntries(game.playerIds.map((p) => [p, null]));
  game.turn = game.playerIds[seed % game.playerIds.length];
  game.peek = null;
  game.winner = null;
  game.winReason = null;
}
