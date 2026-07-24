// Motor puro de «Good Cop Bad Cop»: reparto de bandos y líderes, y las acciones
// del turno (investigar, armarse, apuntar, disparar). Ganas matando al líder
// del bando contrario. Sin navegador ni Firebase; determinista por semilla.
import type { Card, Kind } from './cards';
import type { GoodCopState, Peek } from './types';

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

/** Quién apunta a `pid` (vivos): saberlo de un vistazo es medio juego. */
export const aimersOf = (game: GoodCopState, pid: string): string[] =>
  game.playerIds.filter((p) => p !== pid && game.alive[p] && game.aimAt[p] === pid);

/** Cuántos turnos faltan para que le toque a `pid` (0 = es el suyo). */
export function turnsUntil(game: GoodCopState, pid: string): number {
  let cur = game.turn;
  for (let d = 0; d < game.playerIds.length; d++) {
    if (cur === pid) return d;
    cur = nextAlive(game, cur);
  }
  return -1;
}

export const BAND_LABEL: Record<Band, string> = { honest: '👮 los Honestos', crook: '🦹 los Corruptos' };

// ——— Reparto ———

export interface Deal { cards: Record<string, Card[]> }

/**
 * Cuántos honestos y corruptos hay según el nº de jugadores. NO es secreto: en
 * la mesa real se cuentan las cartas, así que la app también lo dice (sin ello
 * no se puede deducir nada: ver dos 🦹 de alguien ya lo delata).
 */
export const bandCounts = (n: number): { honest: number; crook: number } =>
  ({ honest: Math.ceil(n / 2), crook: Math.floor(n / 2) });

/** «Sois 5: 3 honestos 👮 y 2 corruptos 🦹» — el dato público que ordena toda la
 *  deducción (con las palabras, no solo emojis: la voz los descarta). */
export const bandCountsLine = (n: number): string => {
  const c = bandCounts(n);
  return `Sois ${n}: ${c.honest} honestos 👮 y ${c.crook} corruptos 🦹`;
};

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

/**
 * Anuncia de quién es el turno, con su estado PÚBLICO (arma y diana). Sin esta
 * línea la voz solo relata lo ya hecho y la mesa nunca sabe a quién le toca,
 * que es justo lo que hace falta con el móvil en el bolsillo.
 */
export function logTurn(game: GoodCopState): void {
  const pid = game.turn;
  const tgt = game.aimAt[pid];
  const extra = game.armed[pid]
    ? (tgt && isAlive(game, tgt) ? ` Va armado y apunta a ${nm(game, tgt)}.` : ' Va armado.')
    : '';
  log(game, `🎬 Turno de ${nm(game, pid)}.${extra}`);
}

function endTurn(game: GoodCopState): void {
  game.turn = nextAlive(game, game.turn);
  logTurn(game);
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
  // Historial POR JUGADOR: con una sola ranura global, investigar otro borraba
  // tu resultado antes de que lo leyeras y no quedaba rastro.
  if (!game.peeks) game.peeks = {};
  const p: Peek = { by: pid, target, idx, kind: c.kind, role: c.role, at: game.log.length, ack: false };
  game.peeks[pid] = [...(game.peeks[pid] || []), p];
  // Qué carta se investiga es público (en la mesa se señala con el dedo).
  log(game, `🔍 ${nm(game, pid)} investiga la carta ${idx + 1} de ${nm(game, target)}.`);
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
  if (game.aimAt[pid] === target) return false; // ya lo apuntas: no gastes el turno en nada
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
  game.armed[target] = false; // un muerto no empuña nada…
  game.aimAt[target] = null; // …ni sigue apuntando (el tablero lo mostraba para siempre)
  for (const c of game.cards[target]) c.up = true; // se revelan sus cartas
  const band = bandOfPid(game, target);
  const leader = isLeader(game, target);
  // Sin punto tras el cierre de exclamación (la voz leía «…LÍDER!.»).
  log(game, leader
    ? `💥 ${nm(game, pid)} dispara a ${nm(game, target)}: era de ${BAND_LABEL[band]} ¡y su LÍDER!`
    : `💥 ${nm(game, pid)} dispara a ${nm(game, target)}: era de ${BAND_LABEL[band]}.`);
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

/**
 * Desatasco: cualquier OTRO jugador vivo salta el turno de quien no responde
 * (móvil apagado, se fue al baño…). Sin esto las únicas salidas cerraban la
 * partida entera, porque ⏸️ Pausar no desbloquea.
 */
export function skipTurn(game: GoodCopState, by: string): boolean {
  if (game.phase !== 'turn') return false;
  if (by === game.turn || !isAlive(game, by)) return false; // el suyo lo pasa él actuando
  if (aliveIds(game).length < 2) return false;
  log(game, `⏭️ La mesa salta el turno de ${nm(game, game.turn)} (no responde).`);
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
  game.peeks = {};
  game.winner = null;
  game.winReason = null;
}
