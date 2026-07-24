// Motor puro de «Coup» (Golpe de Estado). Todo el juego —reparto, monedas,
// desafíos, bloqueos con su anidamiento, pérdidas de influencia, intercambio y
// victoria— vive aquí, operando sobre una copia de CoupState. Sin navegador ni
// Firebase: actions.ts solo lo envuelve en transacciones. Determinista (baraja
// por semilla), así que se puede probar entero.
import type { CoupState, Character, ActionType, PendingLoss } from './types';
import { ACTIONS, blockersFor, charName, actionName } from './chars';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
/** Con 10+ monedas SOLO se puede dar un Golpe de Estado. */
export const COUP_LIMIT = 10;

const ALL_CHARS: Character[] = ['duque', 'asesino', 'capitan', 'embajador', 'condesa'];

export interface Player { id: string; name?: string; order?: number }

export function playersOf(game: CoupState): Player[] {
  return (game.playerIds || []).map((id, i) => ({ id, name: game.names?.[id] || id, order: i }));
}

// ——— PRNG determinista ———

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

// ——— Reparto ———

/** Corte estándar: 3 copias de cada uno de los 5 personajes (15 cartas). */
export function newDeck(): Character[] {
  return ALL_CHARS.flatMap((c) => [c, c, c]);
}

export interface Deal {
  hands: Record<string, { char: Character; lost: boolean }[]>;
  deck: Character[];
  coins: Record<string, number>;
}

/** Baraja la corte y reparte 2 influencias y 2 monedas a cada jugador. */
export function dealGame(playerIds: string[], seed: number): Deal {
  const deck = shuffled(newDeck(), seed);
  const hands: Deal['hands'] = {};
  const coins: Record<string, number> = {};
  for (const pid of playerIds) {
    hands[pid] = [
      { char: deck.pop()!, lost: false },
      { char: deck.pop()!, lost: false },
    ];
    coins[pid] = 2;
  }
  return { hands, deck, coins };
}

// ——— Consultas ———

export const influenceCount = (game: CoupState, pid: string): number =>
  (game.hands[pid] || []).filter((h) => !h.lost).length;

export const isAlive = (game: CoupState, pid: string): boolean => influenceCount(game, pid) > 0;

export const aliveIds = (game: CoupState): string[] => game.playerIds.filter((pid) => isAlive(game, pid));

/** Personajes que alguien aún oculta (para su propia carta; jamás público). */
export const hiddenChars = (game: CoupState, pid: string): Character[] =>
  (game.hands[pid] || []).filter((h) => !h.lost).map((h) => h.char);

export const hasChar = (game: CoupState, pid: string, char: Character): boolean =>
  hiddenChars(game, pid).includes(char);

export const mustCoup = (game: CoupState, pid: string): boolean => (game.coins[pid] || 0) >= COUP_LIMIT;

/** Índice del siguiente jugador VIVO tras `from` (da la vuelta a la mesa). */
export function nextAliveIdx(game: CoupState, from: number): number {
  const n = game.playerIds.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (isAlive(game, game.playerIds[idx])) return idx;
  }
  return from;
}

const ACTION_UI_ORDER: ActionType[] = ['renta', 'ayuda', 'impuestos', 'robar', 'asesinar', 'intercambiar', 'golpe'];

/** Acciones que el jugador de turno puede declarar ahora mismo. */
export function legalActionTypes(game: CoupState, pid: string): ActionType[] {
  const coins = game.coins[pid] || 0;
  if (mustCoup(game, pid)) return ['golpe'];
  return ACTION_UI_ORDER.filter((t) => {
    if (t === 'golpe') return coins >= ACTIONS.golpe.cost;
    if (t === 'asesinar') return coins >= ACTIONS.asesinar.cost;
    return true; // renta, ayuda, impuestos, robar, intercambiar: sin coste
  });
}

/** Víctimas posibles de una acción con objetivo. */
export function targetsFor(game: CoupState, actor: string, type: ActionType): string[] {
  if (!ACTIONS[type].needsTarget) return [];
  return aliveIds(game).filter((pid) => pid !== actor);
}

/** Quién debe reaccionar (desafiar/bloquear/pasar) en la ventana en curso. */
export function reactorsOf(game: CoupState): string[] {
  const p = game.pending;
  if (game.phase === 'challengeAction' && p) return aliveIds(game).filter((pid) => pid !== p.actor);
  if (game.phase === 'block' && p) {
    if (p.type === 'ayuda') return aliveIds(game).filter((pid) => pid !== p.actor);
    return p.target && isAlive(game, p.target) ? [p.target] : [];
  }
  if (game.phase === 'challengeBlock' && game.block) {
    return aliveIds(game).filter((pid) => pid !== game.block!.by);
  }
  return [];
}

/** Qué puede hacer `pid` en la ventana actual (para pintar los botones). */
export function allowedReactions(game: CoupState, pid: string): { challenge: boolean; block: boolean; blockClaims: Character[] } {
  if (!reactorsOf(game).includes(pid) || game.reactions[pid] !== undefined) {
    return { challenge: false, block: false, blockClaims: [] };
  }
  const p = game.pending;
  if (game.phase === 'challengeAction') return { challenge: true, block: false, blockClaims: [] };
  if (game.phase === 'challengeBlock') return { challenge: true, block: false, blockClaims: [] };
  if (game.phase === 'block' && p) return { challenge: false, block: true, blockClaims: blockersFor(p.type) };
  return { challenge: false, block: false, blockClaims: [] };
}

const allPassed = (game: CoupState): boolean => {
  const r = reactorsOf(game);
  return r.length > 0 && r.every((pid) => game.reactions[pid] === 'pass');
};

export function checkWinner(game: CoupState): string | null {
  const alive = aliveIds(game);
  return alive.length === 1 ? alive[0] : null;
}

export const winnerName = (game: CoupState): string => (game.winner && game.names[game.winner]) || '¿?';

// ——— Utilidades internas de mazo / mano ———

const log = (game: CoupState, txt: string) => game.log.push({ txt });
const nm = (game: CoupState, pid: string | null | undefined) => (pid && game.names[pid]) || 'alguien';

function reshuffleDeck(game: CoupState): void {
  game.shuffles = (game.shuffles || 0) + 1;
  const s = ((game.seed || 1) + game.shuffles * 0x9e3779b1) >>> 0;
  game.deck = shuffled(game.deck, s);
}

/** El reclamante enseña el personaje, lo devuelve a la corte y roba otro. */
function proveAndRedraw(game: CoupState, pid: string, char: Character): void {
  const hand = game.hands[pid];
  const i = hand.findIndex((h) => !h.lost && h.char === char);
  if (i < 0) return;
  game.deck.push(char);
  reshuffleDeck(game);
  hand[i] = { char: game.deck.pop()!, lost: false };
}

function revealCard(game: CoupState, pid: string, handIdx: number, reason: PendingLoss['reason']): void {
  const card = game.hands[pid][handIdx];
  if (!card || card.lost) return;
  card.lost = true;
  const dead = influenceCount(game, pid) === 0;
  log(game, `💥 ${nm(game, pid)} descubre ${charName(card.char)}${dead ? ' y queda ELIMINADO.' : '.'}`);
  void reason;
}

function enqueueLoss(game: CoupState, pid: string, reason: PendingLoss['reason']): void {
  game.losing.push({ pid, reason });
}

function finishIfWon(game: CoupState): boolean {
  if (game.winner) return true;
  const w = checkWinner(game);
  if (!w) return false;
  game.winner = w;
  game.phase = 'end';
  game.scores[w] = (game.scores[w] || 0) + 1;
  game.losing = [];
  game.resume = null;
  log(game, `👑 ¡${nm(game, w)} es el último en pie y gana el golpe de Estado!`);
  return true;
}

/** Efecto de la acción pendiente cuando SALE ADELANTE (superó desafíos/bloqueos). */
function applyActionEffect(game: CoupState): void {
  const p = game.pending!;
  if (p.type === 'impuestos') {
    game.coins[p.actor] += 3;
    log(game, `🎩 ${nm(game, p.actor)} cobra impuestos: +3 monedas (tiene ${game.coins[p.actor]}).`);
  } else if (p.type === 'ayuda') {
    game.coins[p.actor] += 2;
    log(game, `🤝 ${nm(game, p.actor)} recibe ayuda exterior: +2 monedas (tiene ${game.coins[p.actor]}).`);
  } else if (p.type === 'robar' && p.target) {
    const amt = Math.min(2, game.coins[p.target] || 0);
    game.coins[p.target] -= amt;
    game.coins[p.actor] += amt;
    log(game, `⚓ ${nm(game, p.actor)} roba ${amt} moneda${amt === 1 ? '' : 's'} a ${nm(game, p.target)}.`);
  } else if (p.type === 'asesinar' && p.target) {
    log(game, `🗡️ El asesinato de ${nm(game, p.target)} sigue adelante.`);
    enqueueLoss(game, p.target, 'asesinato');
  } else if (p.type === 'intercambiar') {
    game.resume = 'exchange';
  }
}

/** Prepara el intercambio del Embajador: roba 2 de la corte y ofrece la elección. */
function beginExchange(game: CoupState): void {
  const actor = game.pending!.actor;
  const keep = influenceCount(game, actor);
  const drawn: Character[] = [game.deck.pop()!, game.deck.pop()!];
  game.exchange = { pid: actor, options: [...hiddenChars(game, actor), ...drawn], keep };
  game.phase = 'exchangeReturn';
  log(game, `🎭 ${nm(game, actor)} baraja con la corte y decide qué cartas conserva.`);
}

function endTurn(game: CoupState): void {
  game.pending = null;
  game.block = null;
  game.reactions = {};
  game.exchange = null;
  game.resume = null;
  if (finishIfWon(game)) return;
  game.turnIdx = nextAliveIdx(game, game.turnIdx);
  game.round += 1;
  game.phase = 'turn';
  log(game, `🎬 Turno de ${nm(game, game.playerIds[game.turnIdx])}.`);
}

/**
 * Procesa la cola de pérdidas una a una (auto si solo queda 1 carta; pausa para
 * elegir si quedan 2). Vaciada la cola, ejecuta la continuación diferida.
 */
function settle(game: CoupState): void {
  while (game.losing.length) {
    const nxt = game.losing[0];
    if (!isAlive(game, nxt.pid)) { game.losing.shift(); continue; }
    const idxs = game.hands[nxt.pid].map((h, i) => ({ h, i })).filter((x) => !x.h.lost).map((x) => x.i);
    if (idxs.length <= 1) {
      if (idxs.length === 1) revealCard(game, nxt.pid, idxs[0], nxt.reason);
      game.losing.shift();
      if (finishIfWon(game)) return;
      continue;
    }
    game.phase = 'loseInfluence'; // 2 cartas: el jugador elige cuál descubre
    return;
  }
  if (finishIfWon(game)) return;
  const resume = game.resume;
  game.resume = null;
  if (resume === 'exchange') { beginExchange(game); return; }
  if (resume === 'block') { reopenBlock(game); return; }
  endTurn(game);
}

// Reabre la ventana de bloqueo de la víctima tras un desafío superado (regla
// oficial: desafiar y perder NO quita el derecho a bloquear, ni a la víctima ni
// cuando el que dudó fue un tercero). Si la víctima cayó con el propio desafío,
// la jugada se queda sin destinatario y el turno pasa.
function reopenBlock(game: CoupState): void {
  const p = game.pending!;
  if (p.target && isAlive(game, p.target)) {
    game.reactions = {};
    game.phase = 'block';
    log(game, `🤔 Superado el desafío, la jugada sigue en pie. ${nm(game, p.target)}, ¿bloqueas?`);
    return;
  }
  endTurn(game);
}

// ——— Comienzo de la partida ———

export function beginPlay(game: CoupState): boolean {
  if (game.phase !== 'reveal') return false;
  if (!game.playerIds.every((pid) => game.seen[pid])) return false;
  game.phase = 'turn';
  log(game, `🎬 Turno de ${nm(game, game.playerIds[game.turnIdx])}.`);
  return true;
}

// ——— Declaración de acción ———

export function declareAction(game: CoupState, actor: string, type: ActionType, target: string | null): boolean {
  if (game.phase !== 'turn') return false;
  if (game.playerIds[game.turnIdx] !== actor || !isAlive(game, actor)) return false;
  if (!legalActionTypes(game, actor).includes(type)) return false;
  const info = ACTIONS[type];
  if ((game.coins[actor] || 0) < info.cost) return false;
  if (info.needsTarget) {
    if (!target || !targetsFor(game, actor, type).includes(target)) return false;
  } else {
    target = null;
  }
  game.coins[actor] -= info.cost; // el coste (golpe 7, asesinar 3) se paga al declarar
  game.pending = { type, actor, target, claim: info.claim };
  game.block = null;
  game.reactions = {};
  game.resume = 'endTurn';

  if (type === 'renta') {
    game.coins[actor] += 1;
    log(game, `🪙 ${nm(game, actor)} coge 1 moneda de renta (tiene ${game.coins[actor]}).`);
    endTurn(game);
    return true;
  }
  if (type === 'golpe' && target) {
    log(game, `💥 ${nm(game, actor)} da un golpe de Estado a ${nm(game, target)} (paga 7). ¡Imparable!`);
    enqueueLoss(game, target, 'golpe');
    settle(game);
    return true;
  }
  if (type === 'ayuda') {
    log(game, `🤝 ${nm(game, actor)} pide ayuda exterior (+2). ¿La bloquea alguien con el Duque?`);
    game.phase = 'block';
    return true;
  }
  // Acciones de personaje (impuestos, asesinar, robar, intercambiar): ventana de desafío.
  const tgt = target ? ` a ${nm(game, target)}` : '';
  log(game, `${info.emoji} ${nm(game, actor)} declara ${actionName(type)}${tgt} (dice ser ${charName(info.claim!)}). ¿Alguien lo desafía?`);
  game.phase = 'challengeAction';
  return true;
}

// ——— Reacciones (desafiar / bloquear / pasar) ———

export function doPass(game: CoupState, pid: string): boolean {
  if (!reactorsOf(game).includes(pid) || game.reactions[pid] !== undefined) return false;
  game.reactions[pid] = 'pass';
  if (!allPassed(game)) return true;
  advanceAfterAllPass(game);
  return true;
}

function advanceAfterAllPass(game: CoupState): void {
  const p = game.pending!;
  if (game.phase === 'challengeAction') {
    game.reactions = {};
    if (p.type === 'asesinar' || p.type === 'robar') {
      // Nadie desafió: se abre el bloqueo (solo la víctima).
      log(game, `🤔 Nadie desafía. ${nm(game, p.target)}, ¿bloqueas?`);
      game.phase = 'block';
      return;
    }
    // Impuestos / intercambiar: no se bloquean → salen adelante.
    applyActionEffect(game);
    settle(game);
    return;
  }
  if (game.phase === 'block') {
    game.reactions = {};
    log(game, `🤔 Nadie bloquea.`);
    applyActionEffect(game);
    settle(game);
    return;
  }
  if (game.phase === 'challengeBlock') {
    // Nadie desafía el bloqueo → el bloqueo se mantiene y la acción queda anulada.
    log(game, `🛡️ El bloqueo se mantiene: la acción queda anulada.`);
    game.block = null;
    game.reactions = {};
    game.resume = 'endTurn';
    settle(game);
  }
}

export function doChallenge(game: CoupState, challenger: string): boolean {
  const react = allowedReactions(game, challenger);
  if (!react.challenge) return false;
  if (game.phase === 'challengeAction') return resolveActionChallenge(game, challenger);
  if (game.phase === 'challengeBlock') return resolveBlockChallenge(game, challenger);
  return false;
}

function resolveActionChallenge(game: CoupState, challenger: string): boolean {
  const p = game.pending!;
  const claim = p.claim!;
  log(game, `❗ ${nm(game, challenger)} desafía a ${nm(game, p.actor)}: «no eres ${charName(claim)}».`);
  game.reactions = {};
  if (hasChar(game, p.actor, claim)) {
    log(game, `✅ ${nm(game, p.actor)} SÍ era ${charName(claim)}: lo enseña y roba otra carta.`);
    proveAndRedraw(game, p.actor, claim);
    enqueueLoss(game, challenger, 'desafio'); // el que desafió en falso pierde influencia
    if (p.type === 'asesinar' || p.type === 'robar') {
      // Regla oficial: superado el desafío, la víctima CONSERVA su derecho a
      // bloquear (Condesa / Capitán·Embajador), incluso si la que dudó fue ella.
      game.resume = 'block';
      settle(game);
    } else {
      game.resume = 'endTurn';
      applyActionEffect(game); // impuestos cobra; intercambiar difiere a 'exchange'
      settle(game);
    }
  } else {
    log(game, `🤥 ${nm(game, p.actor)} mentía: no era ${charName(claim)}. La acción se cae.`);
    enqueueLoss(game, p.actor, 'desafio');
    game.resume = 'endTurn'; // el coste ya pagado (asesinar) no se devuelve
    settle(game);
  }
  return true;
}

function resolveBlockChallenge(game: CoupState, challenger: string): boolean {
  const b = game.block!;
  log(game, `❗ ${nm(game, challenger)} desafía el bloqueo de ${nm(game, b.by)}: «no eres ${charName(b.claim)}».`);
  game.reactions = {};
  if (hasChar(game, b.by, b.claim)) {
    log(game, `✅ ${nm(game, b.by)} SÍ era ${charName(b.claim)}: el bloqueo aguanta y la acción se anula.`);
    proveAndRedraw(game, b.by, b.claim);
    enqueueLoss(game, challenger, 'desafio');
    game.block = null;
    game.resume = 'endTurn'; // acción anulada por el bloqueo
    settle(game);
  } else {
    log(game, `🤥 ${nm(game, b.by)} mentía con el bloqueo: pierde influencia y la acción sigue.`);
    enqueueLoss(game, b.by, 'bloqueo');
    game.block = null;
    game.resume = 'endTurn';
    applyActionEffect(game); // el bloqueo falla → la acción original se ejecuta
    settle(game);
  }
  return true;
}

export function doBlock(game: CoupState, blocker: string, claim: Character): boolean {
  const react = allowedReactions(game, blocker);
  if (!react.block || !react.blockClaims.includes(claim)) return false;
  game.block = { by: blocker, claim };
  game.reactions = {};
  game.phase = 'challengeBlock';
  const p = game.pending!;
  const what = p.type === 'ayuda' ? 'la ayuda exterior' : p.type === 'asesinar' ? 'el asesinato' : 'el robo';
  log(game, `🛡️ ${nm(game, blocker)} bloquea ${what} diciendo ser ${charName(claim)}. ¿Alguien lo desafía?`);
  return true;
}

// ——— Pérdida de influencia elegida ———

export function chooseLoss(game: CoupState, pid: string, handIdx: number): boolean {
  if (game.phase !== 'loseInfluence') return false;
  const nxt = game.losing[0];
  if (!nxt || nxt.pid !== pid) return false;
  const card = game.hands[pid][handIdx];
  if (!card || card.lost) return false;
  revealCard(game, pid, handIdx, nxt.reason);
  game.losing.shift();
  if (finishIfWon(game)) return true;
  settle(game);
  return true;
}

// ——— Intercambio del Embajador ———

export function exchangeKeep(game: CoupState, pid: string, keepIdxs: number[]): boolean {
  if (game.phase !== 'exchangeReturn' || !game.exchange || game.exchange.pid !== pid) return false;
  const ex = game.exchange;
  const uniq = [...new Set(keepIdxs)];
  if (uniq.length !== ex.keep) return false;
  if (uniq.some((i) => i < 0 || i >= ex.options.length)) return false;
  const kept = uniq.map((i) => ex.options[i]);
  const returned = ex.options.filter((_, i) => !uniq.includes(i));
  const hiddenPositions = game.hands[pid].map((h, i) => ({ h, i })).filter((x) => !x.h.lost).map((x) => x.i);
  hiddenPositions.forEach((pos, k) => { game.hands[pid][pos] = { char: kept[k], lost: false }; });
  returned.forEach((c) => game.deck.push(c));
  reshuffleDeck(game);
  game.exchange = null;
  log(game, `🎭 ${nm(game, pid)} devuelve ${returned.length} carta${returned.length === 1 ? '' : 's'} a la corte.`);
  endTurn(game);
  return true;
}

// ——— Revancha ———

export function resetForRematch(game: CoupState, seed: number): void {
  const deal = dealGame(game.playerIds, seed);
  game.seed = seed;
  game.round = 1;
  game.phase = 'reveal';
  game.hands = deal.hands;
  game.deck = deal.deck;
  game.coins = deal.coins;
  game.shuffles = 0;
  game.seen = {};
  game.turnIdx = seed % game.playerIds.length;
  game.pending = null;
  game.block = null;
  game.reactions = {};
  game.losing = [];
  game.resume = null;
  game.exchange = null;
  game.winner = null;
}
