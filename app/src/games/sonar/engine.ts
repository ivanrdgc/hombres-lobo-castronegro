// Motor puro de «Captain Sonar» (adaptación por turnos): dos submarinos con
// posición secreta en una rejilla 8×8. Navegar se ANUNCIA en voz alta (el rival
// triangula); torpedos, dron, silencio y emerger gastan energía. Determinista.
import { narratesIn } from '../../core/narrator/voice-mode';
import {
  W, H, type Cell, type Dir, DIRS, DIR_LABEL, cellName, inBounds, isIsland, sameCell,
  stepTo, manhattan, chebyshev, quadrantOf,
} from './map';
import type { SonarState, Sub, Team } from './types';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
/** Tamaño ideal: 4-6 (dos tripulaciones que puedan deliberar). Con 2 «funciona»
 *  pero es un duelo de dos solitarios: se recomienda en el lobby, no se impone. */
export const BEST_PLAYERS = '4 a 6';
export const MAX_HP = 3;
export const MAX_ENERGY = 6;
export const COST_TORPEDO = 3;
export const COST_DRONE = 2;
export const COST_SILENCE = 3;
export const TORPEDO_RANGE = 4;
/** Casillas que puede recorrer una maniobra en silencio (1 o 2, en línea recta):
 *  moverse 1 gratis navegando ya da +1 de energía, así que un silencio de una
 *  sola casilla nunca compensaría (era una opción dominada). */
export const SILENCE_MAX_STEPS = 2;

/** Nombre del submarino SIN artículo: se concatena tras preposición («del …»,
 *  «al …»), así que meter aquí el «el» producía «de el submarino Azul». */
export const TEAM_NAME: Record<Team, string> = { red: 'submarino Rojo 🔴', blue: 'submarino Azul 🔵' };
export const rival = (t: Team): Team => (t === 'red' ? 'blue' : 'red');

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

// ——— Reparto ———

export interface Deal { teams: Record<Team, string[]>; subs: Record<Team, Sub> }

/** Posición inicial: el Rojo en las 3 columnas de la izquierda, el Azul en las
 *  de la derecha (nunca en isla) → empiezan lejos y a cubierto. */
function startPos(side: 'left' | 'right', seed: number): Cell {
  const rnd = mulberry32(seed);
  for (;;) {
    const x = side === 'left' ? Math.floor(rnd() * 3) : W - 3 + Math.floor(rnd() * 3);
    const y = Math.floor(rnd() * H);
    const c = { x, y };
    if (!isIsland(c)) return c;
  }
}

const mkSub = (side: 'left' | 'right', s: number): Sub => ({ pos: startPos(side, s), trail: [], hp: MAX_HP, energy: 0 });

/** Submarinos a estrenar (posición secreta, sin estela, 3 de vida, 0 de energía). */
export function freshSubs(seed: number): Record<Team, Sub> {
  return { red: mkSub('left', seed + 1), blue: mkSub('right', seed + 2) };
}

export function dealGame(playerIds: string[], seed: number): Deal {
  const order = shuffled(playerIds, seed);
  const teams: Record<Team, string[]> = { red: [], blue: [] };
  order.forEach((pid, i) => teams[i % 2 === 0 ? 'red' : 'blue'].push(pid));
  return { teams, subs: freshSubs(seed) };
}

/** F1 · Modo «uno por equipo»: los dos altavoces deben acabar en tripulaciones
 *  DISTINTAS. El reparto es al azar y los altavoces se eligen antes, así que a
 *  menudo caían los dos en el mismo submarino y el otro corro se quedaba sin
 *  voz. Intercambia el segundo altavoz con un tripulante del otro submarino
 *  (así los tamaños de las tripulaciones no cambian). */
export function splitSpeakers(
  teams: Record<Team, string[]>, a: string | null, b: string | null,
): boolean {
  if (!a || !b || a === b) return false;
  const teamWith = (pid: string): Team | null =>
    teams.red.includes(pid) ? 'red' : teams.blue.includes(pid) ? 'blue' : null;
  const ta = teamWith(a);
  if (!ta || teamWith(b) !== ta) return false; // ya están separados (o alguno no juega)
  const other = rival(ta);
  const swap = teams[other].find((pid) => pid !== a && pid !== b);
  if (!swap) return false; // el otro submarino no tiene con quién cambiar
  teams[ta] = teams[ta].map((pid) => (pid === b ? swap : pid));
  teams[other] = teams[other].map((pid) => (pid === swap ? b : pid));
  return true;
}

// ——— Consultas ———

export function teamOf(game: SonarState, pid: string): Team | null {
  if (game.teams.red.includes(pid)) return 'red';
  if (game.teams.blue.includes(pid)) return 'blue';
  return null;
}

/** ¿Puede actuar? Cualquier tripulante del submarino al que le toca (así un
 *  móvil despistado nunca bloquea la partida). */
export function canAct(game: SonarState, pid: string): boolean {
  return game.phase === 'turn' && !game.paused && teamOf(game, pid) === game.turnTeam;
}

const blocked = (sub: Sub, c: Cell): boolean =>
  !inBounds(c) || isIsland(c) || sameCell(sub.pos, c) || sub.trail.some((t) => sameCell(t, c));

/** Direcciones legales de navegación (fuera de islas, bordes y tu estela). */
export function legalDirs(game: SonarState, team: Team): Dir[] {
  const sub = game.subs[team];
  return (Object.keys(DIRS) as Dir[]).filter((d) => !blocked(sub, stepTo(sub.pos, d)));
}

/** Casillas a tiro de torpedo (distancia Manhattan 1..4, no isla). */
export function torpedoTargets(game: SonarState, team: Team): Cell[] {
  const from = game.subs[team].pos;
  const out: Cell[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = { x, y }; const d = manhattan(from, c);
    if (d >= 1 && d <= TORPEDO_RANGE && !isIsland(c)) out.push(c);
  }
  return out;
}

// ——— Utilidades internas ———

const log = (game: SonarState, txt: string) => game.log.push({ txt });

function endTurn(game: SonarState): void {
  if (game.phase !== 'turn') return;
  game.turnTeam = rival(game.turnTeam);
}

function finish(game: SonarState, winner: Team, reason: string): void {
  game.winner = winner;
  game.winReason = reason;
  game.phase = 'end';
  for (const pid of game.teams[winner]) game.scores[pid] = (game.scores[pid] || 0) + 1;
  log(game, `🏆 ¡Gana el ${TEAM_NAME[winner]}! ${reason}`);
  log(game, `📍 Posiciones finales: Rojo en ${cellName(game.subs.red.pos)}, Azul en ${cellName(game.subs.blue.pos)}.`);
}

// ——— Acciones del turno (una por turno de submarino) ———

export function move(game: SonarState, pid: string, dir: Dir): boolean {
  if (!canAct(game, pid)) return false;
  const team = game.turnTeam; const sub = game.subs[team];
  const to = stepTo(sub.pos, dir);
  if (blocked(sub, to)) return false;
  sub.trail.push({ ...sub.pos });
  sub.pos = to;
  sub.energy = Math.min(MAX_ENERGY, sub.energy + 1);
  game.moves[team].push(dir);
  log(game, `🧭 El ${TEAM_NAME[team]} navega al ${DIR_LABEL[dir]}. (+1 de energía ⚡)`);
  endTurn(game);
  return true;
}

/** Recorrido legal de un silencio en esa dirección: 0 (imposible), 1 o 2. */
export function silenceSteps(game: SonarState, team: Team, dir: Dir): number {
  const sub = game.subs[team];
  let cur = sub.pos; let n = 0;
  for (let i = 0; i < SILENCE_MAX_STEPS; i++) {
    const nxt = stepTo(cur, dir);
    if (blocked(sub, nxt)) break;
    cur = nxt; n++;
  }
  return n;
}

/** Silencio: 1 o 2 casillas en línea recta sin anunciar el rumbo (las casillas
 *  atravesadas cuentan como estela). Mover 2 es lo que lo hace valer su precio. */
export function silence(game: SonarState, pid: string, dir: Dir, steps = 1): boolean {
  if (!canAct(game, pid)) return false;
  const team = game.turnTeam; const sub = game.subs[team];
  if (sub.energy < COST_SILENCE) return false;
  if (steps < 1 || steps > SILENCE_MAX_STEPS || silenceSteps(game, team, dir) < steps) return false;
  // Se valida todo el recorrido antes de tocar nada: cada casilla atravesada
  // queda como estela (no se puede volver a pisar).
  const path: Cell[] = [];
  let cur = sub.pos;
  for (let i = 0; i < steps; i++) { cur = stepTo(cur, dir); path.push(cur); }
  sub.trail.push({ ...sub.pos }, ...path.slice(0, -1));
  sub.pos = path[path.length - 1];
  sub.energy -= COST_SILENCE;
  game.moves[team].push('silence');
  log(game, `🤫 El ${TEAM_NAME[team]} maniobra en silencio: rumbo desconocido (1 o 2 casillas).`);
  endTurn(game);
  return true;
}

export function torpedo(game: SonarState, pid: string, target: Cell): boolean {
  if (!canAct(game, pid)) return false;
  const team = game.turnTeam; const sub = game.subs[team];
  if (sub.energy < COST_TORPEDO) return false;
  const d = manhattan(sub.pos, target);
  if (d < 1 || d > TORPEDO_RANGE || isIsland(target) || !inBounds(target)) return false;
  sub.energy -= COST_TORPEDO;
  const hits: string[] = [];
  for (const t of ['red', 'blue'] as Team[]) {
    const s = game.subs[t];
    const dmg = sameCell(s.pos, target) ? 2 : chebyshev(s.pos, target) === 1 ? 1 : 0;
    if (dmg > 0) {
      s.hp = Math.max(0, s.hp - dmg);
      hits.push(`${dmg === 2 ? `¡IMPACTO DIRECTO en el ${TEAM_NAME[t]}!` : `la onda alcanza al ${TEAM_NAME[t]}`} (${dmg} de daño, le quedan ${s.hp})`);
    }
  }
  log(game, `🚀 Torpedo del ${TEAM_NAME[team]} contra ${cellName(target)}: ${hits.length ? hits.join(' y ') : 'agua. Nada a la vista'}.`);
  const enemy = rival(team);
  // Primero el PROPIO casco: si el torpedo hunde a los dos a la vez, gana el que
  // no disparó (lo que promete la ayuda). Al revés ganaba quien acababa de
  // hundirse con su propia onda.
  if (game.subs[team].hp <= 0) return finish(game, enemy, `El ${TEAM_NAME[team]} se hunde con su propio torpedo.`), true;
  if (game.subs[enemy].hp <= 0) return finish(game, team, `El ${TEAM_NAME[enemy]} se hunde.`), true;
  endTurn(game);
  return true;
}

export function drone(game: SonarState, pid: string): boolean {
  if (!canAct(game, pid)) return false;
  const team = game.turnTeam; const sub = game.subs[team];
  if (sub.energy < COST_DRONE) return false;
  sub.energy -= COST_DRONE;
  const enemy = rival(team);
  log(game, `🛰️ Dron del ${TEAM_NAME[team]}: el ${TEAM_NAME[enemy]} está en el cuadrante ${quadrantOf(game.subs[enemy].pos)}.`);
  endTurn(game);
  return true;
}

/** Emerger: siempre legal (la válvula de escape: nunca te quedas sin jugada).
 *  Borra tu estela a cambio de cantar tu cuadrante. */
export function surface(game: SonarState, pid: string): boolean {
  if (!canAct(game, pid)) return false;
  const team = game.turnTeam; const sub = game.subs[team];
  sub.trail = [];
  game.moves[team].push('surface');
  log(game, `⏫ El ${TEAM_NAME[team]} emerge en el cuadrante ${quadrantOf(sub.pos)} y borra su estela.`);
  endTurn(game);
  return true;
}

/** Revancha: MISMAS tripulaciones (nadie tiene que cambiar de corro ni de
 *  altavoz: `teamSpeakers` sigue valiendo) y submarinos recolocados en secreto. */
export function resetForRematch(game: SonarState, seed: number): void {
  game.seed = seed;
  game.phase = 'turn';
  game.subs = freshSubs(seed);
  game.turnTeam = seed % 2 === 0 ? 'red' : 'blue';
  game.moves = { red: [], blue: [] };
  game.winner = null;
  game.winReason = null;
}

/** ¿Debe narrar este dispositivo? Mecanismo compartido (core/narrator). */
export function narrates(game: SonarState, pid: string, masterId: string | null): boolean {
  return narratesIn(game.voiceMode, game.teamSpeakers, game.playerIds, pid, masterId);
}
