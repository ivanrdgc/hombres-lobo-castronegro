// Motor puro de «Skull»: colocación, apuestas, pujas y revelado (parando si sale
// una calavera), pérdida de disco al azar y victoria por dos retos. Sin
// navegador ni Firebase; determinista (el azar sale de la semilla). Testeable.
import type { SkullState, Disc } from './types';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 6;
export const MARKS_TO_WIN = 2;
export const START_FLOWERS = 3;
export const START_SKULLS = 1;

export interface Player { id: string; name?: string; order?: number }

export function playersOf(game: SkullState): Player[] {
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

// ——— Consultas ———

export const isAlive = (game: SkullState, pid: string): boolean => !!game.alive[pid];
export const aliveIds = (game: SkullState): string[] => game.playerIds.filter((p) => game.alive[p]);
export const invCount = (game: SkullState, pid: string): number => game.inv[pid].flowers + game.inv[pid].skulls;
export const placed = (game: SkullState, pid: string): Disc[] => game.stacks[pid] || [];
export const placedCount = (game: SkullState, pid: string): number => placed(game, pid).length;

/** Discos que le quedan a `pid` EN MANO (inventario menos lo ya puesto).
 *  Nunca negativo: al fallar se descuenta del inventario pero la pila sigue en
 *  la mesa hasta `nextRound`, así que en `roundEnd` lo puesto puede superarlo
 *  (y un negativo reventaría los `'🌸'.repeat(n)` de la interfaz). */
export function inHand(game: SkullState, pid: string): { flowers: number; skulls: number } {
  const st = placed(game, pid);
  const usedSkulls = st.filter((d) => d === 'skull').length;
  const usedFlowers = st.length - usedSkulls;
  return {
    flowers: Math.max(0, game.inv[pid].flowers - usedFlowers),
    skulls: Math.max(0, game.inv[pid].skulls - usedSkulls),
  };
}
export const handCount = (game: SkullState, pid: string): number => {
  const h = inHand(game, pid); return h.flowers + h.skulls;
};

/** Total de discos puestos sobre la mesa (tope de una apuesta). */
export const totalPlaced = (game: SkullState): number =>
  aliveIds(game).reduce((s, pid) => s + placedCount(game, pid), 0);

/** Siguiente jugador VIVO tras `pid` (en orden de mesa). */
export function nextAlive(game: SkullState, pid: string): string {
  const n = game.playerIds.length;
  const i = game.playerIds.indexOf(pid);
  for (let d = 1; d <= n; d++) {
    const cand = game.playerIds[(i + d) % n];
    if (game.alive[cand]) return cand;
  }
  return pid;
}

/** Siguiente vivo que aún no ha pasado la puja (tras `pid`). */
function nextBidder(game: SkullState, pid: string): string {
  let cur = pid;
  for (let k = 0; k < game.playerIds.length; k++) {
    cur = nextAlive(game, cur);
    if (!game.passed[cur]) return cur;
  }
  return pid;
}

/** Pilas de las que el que revela puede levantar ahora (primero la SUYA). */
export function flipTargets(game: SkullState): string[] {
  const r = game.reveal;
  if (!r) return [];
  if (placed(game, r.by).length > countFlipped(game, r.by)) return [r.by]; // aún quedan propios
  return aliveIds(game).filter((pid) => pid !== r.by && placedCount(game, pid) > countFlipped(game, pid));
}

function countFlipped(game: SkullState, owner: string): number {
  return (game.reveal?.flipped || []).filter((f) => f.owner === owner).length;
}

export const flippedFlowers = (game: SkullState): number =>
  (game.reveal?.flipped || []).filter((f) => f.disc === 'flower').length;

// ——— Setup y reparto ———

export interface Deal { inv: Record<string, { flowers: number; skulls: number }> }

export function dealGame(playerIds: string[]): Deal {
  const inv: Deal['inv'] = {};
  for (const pid of playerIds) inv[pid] = { flowers: START_FLOWERS, skulls: START_SKULLS };
  return { inv };
}

const log = (game: SkullState, txt: string) => game.log.push({ txt });
const nm = (game: SkullState, pid: string | null | undefined) => (pid && game.names[pid]) || 'alguien';

/** Todos han colocado su disco de salida: empieza el turno del jugador inicial. */
function maybeStartPlay(game: SkullState): void {
  if (aliveIds(game).every((pid) => placedCount(game, pid) >= 1)) {
    game.phase = 'play';
    game.turn = game.starter;
    log(game, `🎬 Turno de ${nm(game, game.turn)}: coloca otro disco o abre una apuesta.`);
  }
}

// ——— Mutadores (boolean) ———

/** Colocación de salida (fase setup): cada jugador pone 1 disco boca abajo. */
export function placeInitial(game: SkullState, pid: string, disc: Disc): boolean {
  if (game.phase !== 'setup' || !isAlive(game, pid) || placedCount(game, pid) >= 1) return false;
  const h = inHand(game, pid);
  if (disc === 'skull' ? h.skulls <= 0 : h.flowers <= 0) return false;
  game.stacks[pid] = [disc];
  maybeStartPlay(game);
  return true;
}

/** Colocar otro disco sobre la pila propia (fase play, en tu turno). */
export function placeDisc(game: SkullState, pid: string, disc: Disc): boolean {
  if (game.phase !== 'play' || game.turn !== pid) return false;
  const h = inHand(game, pid);
  if (disc === 'skull' ? h.skulls <= 0 : h.flowers <= 0) return false;
  game.stacks[pid] = [...placed(game, pid), disc];
  game.turn = nextAlive(game, pid);
  // Línea pública (sin decir QUÉ disco): si no, la voz calla toda la colocación.
  log(game, `🌀 ${nm(game, pid)} coloca otro disco. Turno de ${nm(game, game.turn)}.`);
  return true;
}

/** Abrir una apuesta (fase play): «levantaré N flores sin topar calavera». */
export function openBid(game: SkullState, pid: string, n: number): boolean {
  if (game.phase !== 'play' || game.turn !== pid) return false;
  const max = totalPlaced(game);
  if (n < 1 || n > max) return false;
  game.bid = { by: pid, n };
  game.passed = {};
  game.phase = 'bid';
  game.turn = nextBidder(game, pid);
  log(game, `🗣️ ${nm(game, pid)} apuesta que levanta ${n} flor${n === 1 ? '' : 'es'} sin topar una calavera.`);
  // Apuesta al tope: nadie puede subir, así que se revela ya (si no, obligaría
  // a una vuelta de «Pasar» inútiles). Mismo criterio que `raiseBid`.
  if (n >= max) { startReveal(game); return true; }
  if (game.turn === pid) startReveal(game); // nadie más puede pujar
  return true;
}

/** Subir la apuesta (fase bid, en tu turno). */
export function raiseBid(game: SkullState, pid: string, n: number): boolean {
  if (game.phase !== 'bid' || game.turn !== pid || !game.bid) return false;
  const max = totalPlaced(game);
  if (n <= game.bid.n || n > max) return false;
  game.bid = { by: pid, n };
  log(game, `📈 ${nm(game, pid)} sube la apuesta a ${n}.`);
  if (n >= max) { startReveal(game); return true; } // tope: se revela ya
  game.turn = nextBidder(game, pid);
  return true;
}

/** Pasar en la puja (fase bid). Cuando todos menos el apostador pasan, se revela. */
export function passBid(game: SkullState, pid: string): boolean {
  if (game.phase !== 'bid' || game.turn !== pid || !game.bid || pid === game.bid.by) return false;
  game.passed[pid] = true;
  log(game, `🤐 ${nm(game, pid)} pasa.`);
  const others = aliveIds(game).filter((x) => x !== game.bid!.by);
  if (others.every((x) => game.passed[x])) { startReveal(game); return true; }
  game.turn = nextBidder(game, pid);
  return true;
}

function startReveal(game: SkullState): void {
  const by = game.bid!.by;
  game.reveal = { by, need: game.bid!.n, flipped: [] };
  game.phase = 'reveal';
  game.turn = by;
  log(game, `🎲 ${nm(game, by)} debe levantar ${game.bid!.n} flor${game.bid!.n === 1 ? '' : 'es'}, empezando por las suyas.`);
}

/** Levantar el disco de arriba de la pila de `target` (primero la propia). */
export function flip(game: SkullState, pid: string, target: string): boolean {
  const r = game.reveal;
  if (game.phase !== 'reveal' || !r || r.by !== pid) return false;
  if (!flipTargets(game).includes(target)) return false;
  const idx = placedCount(game, target) - 1 - countFlipped(game, target);
  const disc = placed(game, target)[idx];
  if (!disc) return false;
  r.flipped.push({ owner: target, disc });
  log(game, `🃏 ${nm(game, pid)} levanta un disco de ${target === pid ? 'su propia pila' : nm(game, target)}: ${disc === 'skull' ? '💀 ¡CALAVERA!' : '🌸 flor'}.`);
  if (disc === 'skull') { resolveFail(game); return true; }
  if (flippedFlowers(game) >= r.need) { resolveSuccess(game); return true; }
  return true;
}

function resolveSuccess(game: SkullState): void {
  const by = game.reveal!.by;
  game.marks[by] = (game.marks[by] || 0) + 1;
  game.lastResult = { by, success: true, text: `✅ ${nm(game, by)} lo logra: gana el reto (${game.marks[by]}/${MARKS_TO_WIN}).` };
  log(game, game.lastResult.text);
  if (game.marks[by] >= MARKS_TO_WIN) { finishWin(game, by, `${nm(game, by)} gana su segundo reto.`); return; }
  game.starter = by; // el ganador empieza la siguiente
  endRound(game);
}

function resolveFail(game: SkullState): void {
  const by = game.reveal!.by;
  const lost = loseRandomDisc(game, by);
  game.lastResult = {
    by, success: false,
    text: `💀 ${nm(game, by)} topa con una calavera y pierde un disco (${lost === 'skull' ? 'su calavera' : 'una flor'}).`,
  };
  log(game, game.lastResult.text);
  if (invCount(game, by) === 0) {
    game.alive[by] = false;
    // «ELIMINADO» chirriaba con nombres femeninos: «FUERA» vale para todos.
    log(game, `☠️ ${nm(game, by)} se queda sin discos y queda FUERA de la partida.`);
  }
  // El que perdió empieza la siguiente (si sigue vivo; si no, el siguiente).
  game.starter = isAlive(game, by) ? by : nextAlive(game, by);
  const alive = aliveIds(game);
  if (alive.length === 1) { finishWin(game, alive[0], `${nm(game, alive[0])} es el último en pie.`); return; }
  endRound(game);
}

/** Quita un disco al azar del inventario del jugador (proporcional). */
function loseRandomDisc(game: SkullState, pid: string): Disc {
  game.rng = (game.rng || 0) + 1;
  const rnd = mulberry32((game.seed || 1) + game.rng * 0x9e3779b1);
  const inv = game.inv[pid];
  const total = inv.flowers + inv.skulls;
  const pick = Math.floor(rnd() * total);
  if (pick < inv.flowers) { inv.flowers -= 1; return 'flower'; }
  inv.skulls -= 1; return 'skull';
}

function endRound(game: SkullState): void {
  game.bid = null;
  game.passed = {};
  game.reveal = null;
  game.phase = 'roundEnd';
}

function finishWin(game: SkullState, pid: string, why: string): void {
  game.winner = pid;
  game.bid = null; game.passed = {}; game.reveal = null;
  game.phase = 'end';
  game.scores[pid] = (game.scores[pid] || 0) + 1;
  log(game, `👑 ¡${nm(game, pid)} gana la partida! ${why}`);
}

/** Nueva ronda: se recogen las pilas y vuelve la colocación de salida. */
export function nextRound(game: SkullState): boolean {
  if (game.phase !== 'roundEnd') return false;
  game.round += 1;
  for (const pid of game.playerIds) game.stacks[pid] = [];
  game.bid = null; game.passed = {}; game.reveal = null; game.lastResult = null;
  if (!isAlive(game, game.starter)) game.starter = nextAlive(game, game.starter);
  // Sin esto el tablero seguiría resaltando al último que reveló (que puede
  // estar ya fuera) durante toda la colocación.
  game.turn = game.starter;
  game.phase = 'setup';
  log(game, `🔄 Ronda ${game.round}: cada uno coloca un disco. Empieza ${nm(game, game.starter)}.`);
  return true;
}

export function resetForRematch(game: SkullState, seed: number): void {
  const deal = dealGame(game.playerIds);
  game.seed = seed;
  game.rng = 0;
  game.round = 1;
  game.phase = 'setup';
  game.inv = deal.inv;
  for (const pid of game.playerIds) { game.stacks[pid] = []; game.marks[pid] = 0; game.alive[pid] = true; }
  game.bid = null; game.passed = {}; game.reveal = null; game.lastResult = null;
  game.turn = game.starter;
  game.winner = null;
}
