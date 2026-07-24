// Motor puro de «Shadow Hunters» (adaptación digital): reparto de personajes,
// turnos con una acción (pista, ataque, descanso o revelarse+poder), dados por
// semilla y victorias por facción + objetivos neutrales. Testeable entero.
import { CHARS, HUNTERS, SHADOWS, NEUTRALS, PISTAS, factionCounts, pistaApplies, FACTION_LABEL } from './chars';
import type { Faction } from './chars';
import type { ShadowHState } from './types';

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 8;
// Vida inicial: 8, no 10. El daño medio de |d6−d4| es 1,83, así que 10 PV pedían
// ~5,5 impactos por muerte y con 8 jugadores hay que tumbar a 3 (30 PV): el
// primero en caer se pasaba media hora mirando. Con 8 PV son ~4,4 impactos, un
// 20 % menos de partida. El original reparte 11-14 PV, pero también tiene cartas
// de equipo y localizaciones que aceleran; esta adaptación no las tiene.
export const MAX_HP = 8;

export interface Player { id: string; name?: string; order?: number }
export function playersOf(game: ShadowHState): Player[] {
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

/** Azar reproducible ligado al estado (dados, pistas). */
function roll(game: ShadowHState, faces: number): number {
  game.rng = (game.rng || 0) + 1;
  const rnd = mulberry32(((game.seed || 1) + game.rng * 0x9e3779b1) >>> 0);
  return 1 + Math.floor(rnd() * faces);
}

// ——— Consultas ———

export const isAlive = (game: ShadowHState, pid: string): boolean => !!game.alive[pid];
export const aliveIds = (game: ShadowHState): string[] => game.playerIds.filter((p) => game.alive[p]);
export const factionOf = (game: ShadowHState, pid: string): Faction => CHARS[game.chars[pid]].faction;
export const charOf = (game: ShadowHState, pid: string) => CHARS[game.chars[pid]];

export function nextAlive(game: ShadowHState, pid: string): string {
  const n = game.playerIds.length; const i = game.playerIds.indexOf(pid);
  for (let d = 1; d <= n; d++) { const c = game.playerIds[(i + d) % n]; if (game.alive[c]) return c; }
  return pid;
}

// ——— Reparto ———

export interface Deal { chars: Record<string, string> }
export function dealGame(playerIds: string[], seed: number): Deal {
  const counts = factionCounts(playerIds.length);
  const pool = [
    ...shuffled(HUNTERS, seed + 1).slice(0, counts.hunter),
    ...shuffled(SHADOWS, seed + 2).slice(0, counts.shadow),
    ...shuffled(NEUTRALS, seed + 3).slice(0, counts.neutral),
  ];
  const order = shuffled(playerIds, seed);
  const chars: Record<string, string> = {};
  order.forEach((pid, i) => { chars[pid] = pool[i]; });
  return { chars };
}

// ——— Utilidades internas ———

const log = (game: ShadowHState, txt: string) => game.log.push({ txt });
const nm = (game: ShadowHState, pid: string | null | undefined) => (pid && game.names[pid]) || 'alguien';

function damage(game: ShadowHState, target: string, amount: number, by: string | null): void {
  if (!isAlive(game, target) || amount <= 0) return;
  game.hp[target] = Math.max(0, game.hp[target] - amount);
  if (game.hp[target] === 0) {
    game.alive[target] = false;
    game.revealed[target] = true;
    if (by) game.killsBy[by] = (game.killsBy[by] || 0) + 1;
    const c = charOf(game, target);
    log(game, `☠️ ${nm(game, target)} cae: era ${c.emoji} ${c.name} (${FACTION_LABEL[c.faction]}).`);
  }
}

function heal(game: ShadowHState, target: string, amount: number): void {
  if (!isAlive(game, target)) return;
  game.hp[target] = Math.min(game.maxHp, game.hp[target] + amount);
}

/** Pasa el turno y lo CANTA: con los móviles en el bolsillo, la voz es lo único
 *  que dice a quién le toca (como en Coup y en Skull). Sin esta línea la mesa
 *  oía «Ana ataca a Bea» y nadie sabía quién actuaba después. */
function endTurn(game: ShadowHState): void {
  if (checkWin(game)) return;
  game.turn = nextAlive(game, game.turn);
  log(game, `🎬 Turno de ${nm(game, game.turn)}.`);
}

/** ¿Ha terminado? Cazadores ganan sin Sombras vivas y viceversa; si caen los
 *  últimos de AMBOS bandos a la vez (poder de área), es empate. Los neutrales
 *  se suman a los ganadores si cumplieron su objetivo. */
export function checkWin(game: ShadowHState): boolean {
  const shadowsAlive = aliveIds(game).some((p) => factionOf(game, p) === 'shadow');
  const huntersAlive = aliveIds(game).some((p) => factionOf(game, p) === 'hunter');
  if (shadowsAlive && huntersAlive) return false;
  // Sin el caso null, un remate simultáneo (Valquiria) daba la victoria a unos
  // Cazadores igual de muertos.
  const winner: 'hunter' | 'shadow' | null = shadowsAlive ? 'shadow' : huntersAlive ? 'hunter' : null;
  game.winner = winner;
  game.winReason = winner === 'hunter' ? 'No queda ninguna Sombra en pie.'
    : winner === 'shadow' ? 'No queda ningún Cazador en pie.'
      : 'Han caído a la vez el último Cazador y la última Sombra.';
  const winners = winner ? game.playerIds.filter((p) => factionOf(game, p) === winner) : [];
  // Neutrales: Allie gana si sigue viva; Bob, si dio algún golpe de gracia.
  for (const p of game.playerIds) {
    const c = charOf(game, p);
    if (c.id === 'allie' && isAlive(game, p)) winners.push(p);
    if (c.id === 'bob' && (game.killsBy[p] || 0) > 0) winners.push(p);
  }
  game.winners = [...new Set(winners)];
  for (const p of game.winners) game.scores[p] = (game.scores[p] || 0) + 1;
  for (const p of game.playerIds) game.revealed[p] = true;
  game.phase = 'end';
  log(game, winner ? `🏆 Ganan ${FACTION_LABEL[winner]}. ${game.winReason}` : `🏆 Empate: ningún bando gana. ${game.winReason}`);
  return true;
}

// ——— Acciones del turno (una por turno) ———

/** Pista del Ermitaño: la app roba una carta al azar y la aplica EN SECRETO. */
export function givePista(game: ShadowHState, pid: string, target: string): boolean {
  if (game.phase !== 'turn' || game.turn !== pid) return false;
  if (target === pid || !isAlive(game, target)) return false;
  const idx = roll(game, PISTAS.length) - 1;
  const p = PISTAS[idx];
  const applies = pistaApplies(p, factionOf(game, target));
  // La cura NO cambia nada si el objetivo ya está a tope (al principio todos lo
  // están y la mitad del mazo cura): cantar «se cura 1» sin que suba la vida
  // parecía un fallo de la app y, peor, delataba que la carta SÍ le aplicaba.
  const hurts = applies && p.effect === 'damage1';
  const heals = applies && p.effect === 'heal1' && game.hp[target] < game.maxHp;
  const outcome = hurts ? 'pierde 1 punto de vida' : heals ? 'se cura 1 punto de vida' : 'no le afecta';
  game.pista = { by: pid, target, idx, outcome, ack: [] };
  // El sujeto se nombra otra vez: «…y Bea pierde 1 punto de vida» (al oído,
  // «y pierde 1» sonaba a que la que perdía era quien daba la pista).
  log(game, `🔮 ${nm(game, pid)} entrega una pista a ${nm(game, target)}… y ${outcome === 'no le afecta' ? 'no le afecta' : `${nm(game, target)} ${outcome}`}.`);
  // El efecto se aplica DESPUÉS de la línea para que un «☠️ … cae» salga detrás.
  // El autor es `pid`: una pista que remata SÍ es golpe de gracia (objetivo de Bob).
  if (hurts) damage(game, target, 1, pid);
  else if (heals) heal(game, target, 1);
  endTurn(game);
  return true;
}

/** Ataque: la app tira 1d6 y 1d4; el daño es la DIFERENCIA (0 = fallo). */
export function attack(game: ShadowHState, pid: string, target: string): boolean {
  if (game.phase !== 'turn' || game.turn !== pid) return false;
  if (target === pid || !isAlive(game, target)) return false;
  const d6 = roll(game, 6);
  const d4 = roll(game, 4);
  const dmg = Math.abs(d6 - d4);
  // «saca 5 y 2, y le hace 3 de daño»: la flecha se leía como coma y salían tres
  // cifras seguidas («dados 5 y 2, 3 de daño»), imposible de seguir de oído.
  if (dmg === 0) {
    log(game, `⚔️ ${nm(game, pid)} ataca a ${nm(game, target)}: saca ${d6} y ${d4}… ¡falla!`);
  } else {
    log(game, `⚔️ ${nm(game, pid)} ataca a ${nm(game, target)}: saca ${d6} y ${d4}, y le hace ${dmg} de daño.`);
    damage(game, target, dmg, pid);
  }
  endTurn(game);
  return true;
}

/** Descansar: +1 PV. */
export function rest(game: ShadowHState, pid: string): boolean {
  if (game.phase !== 'turn' || game.turn !== pid) return false;
  heal(game, pid, 1);
  log(game, `💊 ${nm(game, pid)} descansa y recupera 1 punto de vida.`);
  endTurn(game);
  return true;
}

/** Revelarse: identidad pública + poder de un solo uso (con objetivo si pide). */
export function revealSelf(game: ShadowHState, pid: string, target: string | null): boolean {
  if (game.phase !== 'turn' || game.turn !== pid || game.revealed[pid]) return false;
  const c = charOf(game, pid);
  if (c.powerTarget) {
    if (!target || !isAlive(game, target)) return false;
    if (target === pid && c.id !== 'fuka') return false; // solo Fuka puede elegirse a sí misma
  }
  // El candado del poder es `revealed[pid]` (arriba): no hay un segundo flag.
  game.revealed[pid] = true;
  log(game, `🎭 ${nm(game, pid)} se revela: es ${c.emoji} ${c.name} (${FACTION_LABEL[c.faction]}).`);
  if (c.id === 'georg' && target) damage(game, target, 2, pid);
  else if (c.id === 'franklin' && target) { const d = roll(game, 4); log(game, `⚡ El rayo de Franklin hace ${d} de daño.`); damage(game, target, d, pid); }
  else if (c.id === 'fuka' && target) heal(game, target, 3);
  // El Vampiro ROBA: se cura lo que ha quitado de verdad (si la víctima tenía
  // 1 PV, roba 1, no 2: la vida no puede salir de la nada).
  else if (c.id === 'vampiro' && target) { const before = game.hp[target]; damage(game, target, 2, pid); heal(game, pid, before - game.hp[target]); }
  else if (c.id === 'licantropo') heal(game, pid, 3);
  else if (c.id === 'valquiria') for (const p of aliveIds(game)) { if (p !== pid) damage(game, p, 1, pid); }
  else if (c.id === 'allie') game.hp[pid] = game.maxHp;
  else if (c.id === 'bob' && target) damage(game, target, 2, pid);
  endTurn(game);
  return true;
}

export function resetForRematch(game: ShadowHState, seed: number): void {
  const deal = dealGame(game.playerIds, seed);
  game.seed = seed;
  game.rng = 0;
  game.phase = 'turn';
  game.chars = deal.chars;
  game.hp = Object.fromEntries(game.playerIds.map((p) => [p, game.maxHp]));
  game.alive = Object.fromEntries(game.playerIds.map((p) => [p, true]));
  game.revealed = Object.fromEntries(game.playerIds.map((p) => [p, false]));
  game.turn = game.playerIds[seed % game.playerIds.length];
  game.pista = null;
  game.killsBy = {};
  game.winner = null;
  game.winners = [];
  game.winReason = null;
}

export { FACTION_LABEL, PISTAS, CHARS };
