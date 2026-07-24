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
export const MAX_HP = 3;
export const MAX_ENERGY = 6;
export const COST_TORPEDO = 3;
export const COST_DRONE = 2;
export const COST_SILENCE = 3;
export const TORPEDO_RANGE = 4;

export const TEAM_LABEL: Record<Team, string> = { red: '🔴 el submarino Rojo', blue: '🔵 el submarino Azul' };
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

export function dealGame(playerIds: string[], seed: number): Deal {
  const order = shuffled(playerIds, seed);
  const teams: Record<Team, string[]> = { red: [], blue: [] };
  order.forEach((pid, i) => teams[i % 2 === 0 ? 'red' : 'blue'].push(pid));
  const mkSub = (side: 'left' | 'right', s: number): Sub => ({ pos: startPos(side, s), trail: [], hp: MAX_HP, energy: 0 });
  return { teams, subs: { red: mkSub('left', seed + 1), blue: mkSub('right', seed + 2) } };
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
  log(game, `🏆 ¡Gana ${TEAM_LABEL[winner]}! ${reason}`);
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
  log(game, `🧭 ${TEAM_LABEL[team]} navega al ${DIR_LABEL[dir]}. (+1 de energía)`);
  endTurn(game);
  return true;
}

export function silence(game: SonarState, pid: string, dir: Dir): boolean {
  if (!canAct(game, pid)) return false;
  const team = game.turnTeam; const sub = game.subs[team];
  if (sub.energy < COST_SILENCE) return false;
  const to = stepTo(sub.pos, dir);
  if (blocked(sub, to)) return false;
  sub.trail.push({ ...sub.pos });
  sub.pos = to;
  sub.energy -= COST_SILENCE;
  game.moves[team].push('silence');
  log(game, `🤫 ${TEAM_LABEL[team]} maniobra en silencio: rumbo desconocido.`);
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
      hits.push(`${dmg === 2 ? '¡IMPACTO DIRECTO' : 'la onda alcanza'} a ${TEAM_LABEL[t]}${dmg === 2 ? '!' : ''} (${dmg} de daño, le quedan ${s.hp})`);
    }
  }
  log(game, `🚀 Torpedo de ${TEAM_LABEL[team]} contra ${cellName(target)}: ${hits.length ? hits.join(' y ') : 'agua. Nada a la vista'}.`);
  const enemy = rival(team);
  if (game.subs[enemy].hp <= 0) return finish(game, team, `${TEAM_LABEL[enemy]} se hunde.`), true;
  if (game.subs[team].hp <= 0) return finish(game, enemy, `${TEAM_LABEL[team]} se hunde con su propio torpedo.`), true;
  endTurn(game);
  return true;
}

export function drone(game: SonarState, pid: string): boolean {
  if (!canAct(game, pid)) return false;
  const team = game.turnTeam; const sub = game.subs[team];
  if (sub.energy < COST_DRONE) return false;
  sub.energy -= COST_DRONE;
  const enemy = rival(team);
  log(game, `🛰️ Dron de ${TEAM_LABEL[team]}: ${TEAM_LABEL[enemy]} está en el cuadrante ${quadrantOf(game.subs[enemy].pos)}.`);
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
  log(game, `⏫ ${TEAM_LABEL[team]} emerge en el cuadrante ${quadrantOf(sub.pos)} y borra su estela.`);
  endTurn(game);
  return true;
}

export function resetForRematch(game: SonarState, seed: number): void {
  const deal = dealGame(game.playerIds, seed);
  game.seed = seed;
  game.phase = 'turn';
  game.teams = deal.teams;
  game.subs = deal.subs;
  game.turnTeam = seed % 2 === 0 ? 'red' : 'blue';
  game.moves = { red: [], blue: [] };
  game.winner = null;
  game.winReason = null;
}

/** ¿Debe narrar este dispositivo? Mecanismo compartido (core/narrator). */
export function narrates(game: SonarState, pid: string, masterId: string | null): boolean {
  return narratesIn(game.voiceMode, game.teamSpeakers, game.playerIds, pid, masterId);
}
