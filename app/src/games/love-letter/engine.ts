// Motor puro de «Love Letter»: reparto, efectos de cada carta (con su
// objetivo/adivinanza), protección de la Doncella, la Condesa forzada, la
// Princesa fatal y el fin de ronda (último en pie o mazo agotado). Sin
// navegador ni Firebase; determinista por semilla. Testeable entero.
import { fullDeck, VALUE, NEEDS_TARGET, cardName } from './cards';
import type { Card } from './cards';
import type { LoveLetterState } from './types';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

/** Favores para ganar según el nº de jugadores (tabla oficial). */
export function tokensToWin(n: number): number {
  if (n <= 2) return 7;
  if (n === 3) return 5;
  return 4;
}

export interface Player { id: string; name?: string; order?: number }
export function playersOf(game: LoveLetterState): Player[] {
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

export const isAlive = (game: LoveLetterState, pid: string): boolean => !!game.alive[pid];
export const aliveIds = (game: LoveLetterState): string[] => game.playerIds.filter((p) => game.alive[p]);
export const myHand = (game: LoveLetterState, pid: string): Card[] => game.hands[pid] || [];

/** Objetivos válidos de una carta jugada por `actor`: vivos y no protegidos. El
 *  Príncipe puede apuntarse a sí mismo; las demás cartas, no. */
export function validTargets(game: LoveLetterState, actor: string, card: Card): string[] {
  if (!NEEDS_TARGET[card]) return [];
  return aliveIds(game).filter((pid) => {
    if (game.protected[pid]) return false;
    if (card === 'prince') return true; // incluido uno mismo
    return pid !== actor;
  });
}

/** ¿Debe jugar la Condesa a la fuerza? (tiene Condesa + Rey o Príncipe) */
export function countessForced(hand: Card[]): boolean {
  return hand.includes('countess') && (hand.includes('king') || hand.includes('prince'));
}

/** Cartas que `pid` puede jugar ahora (respeta la Condesa forzada). */
export function playableIdx(game: LoveLetterState, pid: string): number[] {
  const hand = myHand(game, pid);
  if (countessForced(hand)) return hand.map((c, i) => (c === 'countess' ? i : -1)).filter((i) => i >= 0);
  return hand.map((_, i) => i);
}

// ——— Reparto ———

export interface Deal {
  deck: Card[]; aside: Card; asideUp: Card[]; hands: Record<string, Card[]>;
}
export function dealRound(playerIds: string[], seed: number): Deal {
  const deck = shuffled(fullDeck(), seed);
  const aside = deck.pop()!;
  const asideUp: Card[] = playerIds.length === 2 ? [deck.pop()!, deck.pop()!, deck.pop()!] : [];
  const hands: Record<string, Card[]> = {};
  for (const pid of playerIds) hands[pid] = [deck.pop()!];
  return { deck, aside, asideUp, hands };
}

// ——— Utilidades internas ———

const log = (game: LoveLetterState, txt: string) => game.log.push({ txt });
const nm = (game: LoveLetterState, pid: string | null | undefined) => (pid && game.names[pid]) || 'alguien';

function drawCard(game: LoveLetterState): Card | null {
  if (game.deck.length) return game.deck.pop()!;
  if (game.aside && !game.asideUsed) { game.asideUsed = true; return game.aside; }
  return null;
}

export function nextAlive(game: LoveLetterState, pid: string): string {
  const n = game.playerIds.length; const i = game.playerIds.indexOf(pid);
  for (let d = 1; d <= n; d++) { const c = game.playerIds[(i + d) % n]; if (game.alive[c]) return c; }
  return pid;
}

function eliminate(game: LoveLetterState, pid: string, why: string): void {
  if (!game.alive[pid]) return;
  game.alive[pid] = false;
  // Su carta en mano se descarta al caer.
  for (const c of game.hands[pid] || []) game.discards[pid].push(c);
  game.hands[pid] = [];
  log(game, `❌ ${nm(game, pid)} queda fuera de la ronda: ${why}.`);
}

function beginTurn(game: LoveLetterState, pid: string): void {
  game.turn = pid;
  game.protected[pid] = false;
  const drawn = drawCard(game);
  if (drawn) game.hands[pid] = [...game.hands[pid], drawn];
  game.phase = 'turn';
}

function handValue(game: LoveLetterState, pid: string): number {
  return VALUE[game.hands[pid][0]] ?? -1;
}
function discardSum(game: LoveLetterState, pid: string): number {
  return (game.discards[pid] || []).reduce((s, c) => s + VALUE[c], 0);
}

function endRound(game: LoveLetterState, winner: string, reason: string): void {
  game.tokens[winner] = (game.tokens[winner] || 0) + 1;
  game.roundResult = { winner, reason };
  log(game, `💌 ${nm(game, winner)} gana la ronda: ${reason} (favores: ${game.tokens[winner]}/${game.need}).`);
  game.peek = null;
  if (game.tokens[winner] >= game.need) {
    game.winner = winner;
    game.phase = 'end';
    game.scores[winner] = (game.scores[winner] || 0) + 1;
    game.starter = winner;
    log(game, `👑 ¡${nm(game, winner)} gana la partida con ${game.tokens[winner]} favores!`);
  } else {
    game.phase = 'roundEnd';
    game.starter = winner; // el ganador empieza la siguiente
  }
}

function checkRoundEnd(game: LoveLetterState): void {
  const alive = aliveIds(game);
  if (alive.length <= 1) {
    endRound(game, alive[0], 'es la última en pie');
    return;
  }
  if (game.deck.length === 0) {
    // Mazo agotado: gana la carta más alta (empate: mayor suma de descartes).
    let best = alive[0];
    for (const pid of alive) {
      const dv = handValue(game, pid) - handValue(game, best);
      if (dv > 0 || (dv === 0 && discardSum(game, pid) > discardSum(game, best))) best = pid;
    }
    endRound(game, best, `mazo agotado, gana la carta más alta (${cardName(game.hands[best][0])})`);
    return;
  }
  beginTurn(game, nextAlive(game, game.turn));
}

// ——— Jugar una carta ———

export interface PlayOpts { target?: string | null; guess?: Card | null }

export function playCard(game: LoveLetterState, pid: string, idx: number, opts: PlayOpts = {}): boolean {
  if (game.phase !== 'turn' || game.turn !== pid) return false;
  const hand = myHand(game, pid);
  if (idx < 0 || idx >= hand.length) return false;
  if (!playableIdx(game, pid).includes(idx)) return false; // Condesa forzada
  const card = hand[idx];
  const other = hand[1 - idx] ?? null; // la carta que le queda
  const targets = validTargets(game, pid, card);
  const target = opts.target && targets.includes(opts.target) ? opts.target : null;
  // Cartas que exigen objetivo pero no lo tienen válido: solo se permiten SIN
  // objetivo si de verdad no hay ninguno disponible (todos protegidos).
  if (NEEDS_TARGET[card] && !target && targets.length > 0) return false;
  if (card === 'guard' && target && (!opts.guess || opts.guess === 'guard')) return false;

  // Descarta la carta jugada y deja la otra en mano.
  game.discards[pid].push(card);
  game.hands[pid] = other ? [other] : [];
  game.peek = null;
  log(game, `${cardName(card).split(' ')[0]} ${nm(game, pid)} juega ${cardName(card)}${target ? ` sobre ${nm(game, target)}` : ''}.`);

  if (card === 'princess') {
    eliminate(game, pid, 'ha descartado la Princesa');
  } else if (card === 'guard' && target && opts.guess) {
    if (game.hands[target][0] === opts.guess) {
      eliminate(game, target, `el Guardia acierta que tenía ${cardName(opts.guess)}`);
    } else {
      log(game, `🛡️ El Guardia falla: ${nm(game, target)} no tenía ${cardName(opts.guess)}.`);
    }
  } else if (card === 'priest' && target) {
    game.peek = { by: pid, target, card: game.hands[target][0] };
    log(game, `🔍 ${nm(game, pid)} mira en secreto la mano de ${nm(game, target)}.`);
  } else if (card === 'baron' && target) {
    const mine = game.hands[pid][0]; const theirs = game.hands[target][0];
    if (VALUE[mine] > VALUE[theirs]) eliminate(game, target, `pierde el duelo del Barón (${cardName(theirs)} contra ${cardName(mine)})`);
    else if (VALUE[theirs] > VALUE[mine]) eliminate(game, pid, `pierde el duelo del Barón (${cardName(mine)} contra ${cardName(theirs)})`);
    else log(game, '🤝 Empate en el duelo del Barón: nadie cae.');
  } else if (card === 'handmaid') {
    game.protected[pid] = true;
    log(game, `🛡️ ${nm(game, pid)} queda protegida hasta su próximo turno.`);
  } else if (card === 'prince' && target) {
    const forced = game.hands[target][0];
    game.discards[target].push(forced);
    game.hands[target] = [];
    if (forced === 'princess') {
      eliminate(game, target, 'el Príncipe le hace descartar la Princesa');
    } else {
      const drawn = drawCard(game);
      game.hands[target] = drawn ? [drawn] : [];
      log(game, `🤴 ${nm(game, target)} descarta ${cardName(forced)} y roba otra carta.`);
    }
  } else if (card === 'king' && target) {
    const a = game.hands[pid][0]; const b = game.hands[target][0];
    game.hands[pid] = [b]; game.hands[target] = [a];
    log(game, `👑 ${nm(game, pid)} y ${nm(game, target)} intercambian sus manos.`);
  } else if (card === 'countess') {
    log(game, `👸 ${nm(game, pid)} descarta la Condesa (sin efecto).`);
  }

  checkRoundEnd(game);
  return true;
}

// ——— Arranque de ronda ———

/** Prepara los campos de una ronda (reparte y da el turno al starter). */
export function startRound(game: LoveLetterState, seed: number): void {
  const deal = dealRound(game.playerIds, seed);
  game.deck = deal.deck;
  game.aside = deal.aside;
  game.asideUsed = false;
  game.asideUp = deal.asideUp;
  game.hands = deal.hands;
  game.discards = Object.fromEntries(game.playerIds.map((p) => [p, []]));
  game.alive = Object.fromEntries(game.playerIds.map((p) => [p, true]));
  game.protected = Object.fromEntries(game.playerIds.map((p) => [p, false]));
  game.peek = null;
  game.roundResult = null;
  beginTurn(game, game.starter);
}

export { cardName, VALUE, NEEDS_TARGET };
