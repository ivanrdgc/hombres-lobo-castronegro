// Motor puro de «Codenames»: reparto de equipos, jefes, tablero y mapa secreto,
// y resolución de las pistas y los toques. Sin navegador ni Firebase (testeable).
import { WORDS } from './words';
import type { CodenamesState, Team, CellKind } from './types';

export const MIN_PLAYERS = 4; // 2 por equipo (1 jefe + 1 agente)
export const MAX_PLAYERS = 16;
export const BOARD = 25;

export interface Player { id: string; name?: string; order?: number }

export function playersOf(game: CodenamesState): Player[] {
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

function shuffled<T>(arr: readonly T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const other = (t: Team): Team => (t === 'red' ? 'blue' : 'red');

export interface Deal {
  teams: Record<string, Team>;
  spymaster: Record<Team, string>;
  words: string[];
  map: CellKind[];
  starting: Team;
  remaining: Record<Team, number>;
}

/**
 * Reparte una partida: equipos casi a la par (el primero se lleva el impar),
 * un Jefe por equipo, 25 palabras y el mapa (9 del equipo inicial, 8 del otro,
 * 7 neutrales y 1 asesino), todo barajado por la semilla.
 */
export function dealGame(playerIds: string[], seed: number): Deal {
  const rnd = mulberry32(seed);
  const order = shuffled(playerIds, rnd);
  const half = Math.ceil(order.length / 2);
  const reds = order.slice(0, half);
  const blues = order.slice(half);
  const teams: Record<string, Team> = {};
  for (const p of reds) teams[p] = 'red';
  for (const p of blues) teams[p] = 'blue';
  const spymaster: Record<Team, string> = { red: reds[0], blue: blues[0] };
  const words = shuffled(WORDS, rnd).slice(0, BOARD);
  const starting: Team = rnd() < 0.5 ? 'red' : 'blue';
  const cells: CellKind[] = [
    ...Array(9).fill(starting),
    ...Array(8).fill(other(starting)),
    ...Array(7).fill('neutral' as CellKind),
    'assassin' as CellKind,
  ];
  const map = shuffled(cells, rnd);
  return { teams, spymaster, words, map, starting, remaining: { red: 0, blue: 0, [starting]: 9, [other(starting)]: 8 } as Record<Team, number> };
}

// ——— Consultas ———

export const teamOf = (game: CodenamesState, pid: string): Team | null => game.teams[pid] ?? null;
export const isSpymaster = (game: CodenamesState, pid: string): boolean =>
  game.spymaster.red === pid || game.spymaster.blue === pid;
/** Los Jefes ven el mapa entero (cualquiera de los dos); todos, al terminar. */
export const canSeeMap = (game: CodenamesState, pid: string): boolean =>
  game.phase === 'end' || isSpymaster(game, pid);
/** ¿Puede `pid` tocar cartas ahora? Agente (no jefe) del equipo de turno, en fase de adivinar. */
export const canGuess = (game: CodenamesState, pid: string): boolean =>
  game.phase === 'guess' && teamOf(game, pid) === game.turn && !isSpymaster(game, pid);

export const teamMembers = (game: CodenamesState, t: Team): string[] =>
  game.playerIds.filter((pid) => game.teams[pid] === t);

export const TEAM_LABEL: Record<Team, string> = { red: '🔴 Rojo', blue: '🔵 Azul' };

export const WIN_LABELS = (winner: Team): string =>
  `${winner === 'red' ? '🔴 ¡Gana el equipo ROJO!' : '🔵 ¡Gana el equipo AZUL!'}`;

// ——— Mutadores (devuelven boolean: true si aplicaron) ———

const log = (game: CodenamesState, txt: string) => game.log.push({ txt });
const nm = (game: CodenamesState, pid: string | null | undefined) => (pid && game.names[pid]) || 'alguien';

function endTurn(game: CodenamesState): void {
  game.turn = other(game.turn);
  game.clue = null;
  game.guessesLeft = 0;
  game.phase = 'clue';
  log(game, `↪️ Turno del equipo ${game.turn === 'red' ? 'ROJO' : 'AZUL'}.`);
}

function win(game: CodenamesState, winner: Team, reason: string): void {
  game.winner = winner;
  game.winReason = reason;
  game.phase = 'end';
  game.clue = null;
  for (const pid of teamMembers(game, winner)) game.scores[pid] = (game.scores[pid] || 0) + 1;
  log(game, `🏆 ${WIN_LABELS(winner)} ${reason}`);
}

/** El Jefe del equipo de turno da su pista (palabra opcional + número 1..9). */
export function giveClue(game: CodenamesState, pid: string, word: string, num: number): boolean {
  if (game.phase !== 'clue' || game.spymaster[game.turn] !== pid) return false;
  const n = Math.max(1, Math.min(9, Math.floor(num)));
  const clean = (word || '').trim().slice(0, 24);
  game.clue = { word: clean, num: n, by: pid };
  game.guessesLeft = n + 1; // el clásico «+1»
  game.phase = 'guess';
  log(game, `💬 El Jefe ${game.turn === 'red' ? 'rojo' : 'azul'} da una pista${clean ? ` («${clean}»)` : ''} para ${n} palabra${n === 1 ? '' : 's'}.`);
  return true;
}

/** Un agente del equipo de turno destapa una casilla. */
export function reveal(game: CodenamesState, pid: string, cell: number): boolean {
  if (!canGuess(game, pid)) return false;
  if (cell < 0 || cell >= BOARD || game.revealed[cell]) return false;
  const color = game.map[cell];
  game.revealed[cell] = true;
  const turn = game.turn;
  log(game, `👉 ${nm(game, pid)} destapa «${game.words[cell]}»: ${labelOf(color)}.`);
  if (color === 'assassin') {
    win(game, other(turn), `El equipo ${turn === 'red' ? 'rojo' : 'azul'} tocó al ASESINO.`);
    return true;
  }
  if (color === 'neutral') {
    log(game, '🌫️ Transeúnte: fin del turno.');
    endTurn(game);
    return true;
  }
  // Casilla de un equipo.
  game.remaining[color] = Math.max(0, game.remaining[color] - 1);
  if (game.remaining[color] === 0) {
    win(game, color, `${color === 'red' ? 'El rojo' : 'El azul'} ha destapado todas sus casillas.`);
    return true;
  }
  if (color === turn) {
    game.guessesLeft -= 1;
    if (game.guessesLeft <= 0) {
      log(game, '✋ Se agotan los intentos: fin del turno.');
      endTurn(game);
    }
    return true;
  }
  // Regaló una casilla al rival.
  log(game, '😬 Era del rival: fin del turno.');
  endTurn(game);
  return true;
}

/** El equipo de turno decide no arriesgar más y pasa. */
export function pass(game: CodenamesState, pid: string): boolean {
  if (!canGuess(game, pid)) return false;
  if (game.clue && game.guessesLeft > (game.clue.num + 1)) return false; // sanidad
  log(game, `🤐 El equipo ${game.turn === 'red' ? 'rojo' : 'azul'} pasa.`);
  endTurn(game);
  return true;
}

function labelOf(c: CellKind): string {
  return c === 'red' ? '🔴 rojo' : c === 'blue' ? '🔵 azul' : c === 'neutral' ? '⬜ transeúnte' : '💀 ASESINO';
}

export function resetForRematch(game: CodenamesState, seed: number): void {
  const deal = dealGame(game.playerIds, seed);
  game.seed = seed;
  game.phase = 'clue';
  game.teams = deal.teams;
  game.spymaster = deal.spymaster;
  game.words = deal.words;
  game.map = deal.map;
  game.revealed = Array(BOARD).fill(false);
  game.starting = deal.starting;
  game.turn = deal.starting;
  game.clue = null;
  game.guessesLeft = 0;
  game.remaining = deal.remaining;
  game.winner = null;
  game.winReason = null;
}
