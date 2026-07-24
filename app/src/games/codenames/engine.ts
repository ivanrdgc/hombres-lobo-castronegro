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
  game.guessesMade = 0;
  game.phase = 'clue';
  game.clueAt = Date.now();
  // La línea dice a QUIÉN le toca actuar: es lo único que oye la mesa cuando el
  // altavoz está lejos, y evita el «¿y ahora quién?» entre turno y turno.
  log(game, `↪️ Turno del equipo ${game.turn === 'red' ? 'ROJO' : 'AZUL'}. El Jefe ${nm(game, game.spymaster[game.turn])} prepara su pista.`);
}

function win(game: CodenamesState, winner: Team, reason: string): void {
  game.winner = winner;
  game.winReason = reason;
  game.phase = 'end';
  game.clue = null;
  for (const pid of teamMembers(game, winner)) game.scores[pid] = (game.scores[pid] || 0) + 1;
  log(game, `🏆 ${WIN_LABELS(winner)} ${reason}`);
}

/** Compara palabras ignorando mayúsculas y tildes («volcan» = «Volcán»). */
const norm = (s: string): string =>
  s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/gu, '');

/**
 * ¿Qué le pasa a esta pista? Devuelve el motivo del rechazo o null si vale.
 * Reglas oficiales: UNA sola palabra y que NO esté en el tablero (decir una
 * palabra del tablero regala información y arruina la partida). Se valida en el
 * motor —no solo en la pantalla— porque una pista mal dada es irreversible.
 */
export function clueProblem(game: CodenamesState, word: string): string | null {
  const clean = (word || '').trim();
  if (!clean) return 'Escribe la palabra de la pista.';
  if (/\s/u.test(clean)) return 'La pista es UNA sola palabra.';
  if (clean.length > 24) return 'La pista es demasiado larga.';
  const hit = game.words.find((w) => norm(w) === norm(clean));
  if (hit) return `«${hit}» está en el tablero: elige otra palabra.`;
  return null;
}

/** ¿Esta pista deja tocar sin límite? El 0 y el ∞ del juego original. */
const isUnlimited = (num: number, unlimited: boolean): boolean => unlimited || num === 0;

/**
 * El Jefe del equipo de turno da su pista: palabra + número 0..9 (o ∞).
 * El 0 («ninguna de las mías se parece a esto») y el ∞ («seguid con lo que os
 * quedó pendiente») no acotan los toques: el equipo toca hasta fallar o pasar.
 */
export function giveClue(
  game: CodenamesState, pid: string, word: string, num: number, unlimited = false,
): boolean {
  if (game.phase !== 'clue' || game.spymaster[game.turn] !== pid) return false;
  if (clueProblem(game, word)) return false;
  const n = Math.max(0, Math.min(9, Math.floor(num)));
  const free = isUnlimited(n, unlimited);
  const clean = word.trim();
  game.clue = { word: clean, num: n, by: pid, ...(unlimited ? { unlimited: true } : {}) };
  game.guessesLeft = free ? -1 : n + 1; // el clásico «+1»; -1 = sin límite
  game.guessesMade = 0;
  game.phase = 'guess';
  const who = `El Jefe ${game.turn === 'red' ? 'rojo' : 'azul'} da la pista «${clean}»`;
  log(game, unlimited
    ? `💬 ${who}, ilimitada: su equipo puede tocar sin límite.`
    : n === 0
      ? `💬 ${who}, para 0 palabras: ninguna casilla suya se relaciona con ella.`
      : `💬 ${who}, para ${n} palabra${n === 1 ? '' : 's'}.`);
  return true;
}

/** Cuánto aguanta la mesa a un Jefe callado antes de poder saltarle el turno. */
export const CLUE_STALL_MS = 90_000;

/** ¿La fase de pista lleva parada tanto que conviene ofrecer saltarla? */
export const clueStalled = (game: CodenamesState, now: number, ms = CLUE_STALL_MS): boolean =>
  game.phase === 'clue' && !game.paused && now - (game.clueAt || game.startedAt) > ms;

/**
 * Escotilla anti-bloqueo: si el Jefe de turno no puede dar su pista (se ha ido
 * de la mesa, se quedó sin batería…), cualquiera cede el turno al otro equipo.
 * Sin esto la partida se queda muerta: en fase de pista solo actúa el Jefe.
 */
export function skipClue(game: CodenamesState, pid: string): boolean {
  if (game.phase !== 'clue') return false;
  log(game, `⏭️ ${nm(game, pid)} salta el turno del Jefe ${game.turn === 'red' ? 'rojo' : 'azul'}.`);
  endTurn(game);
  return true;
}

/** Un agente del equipo de turno destapa una casilla. */
export function reveal(game: CodenamesState, pid: string, cell: number): boolean {
  if (!canGuess(game, pid)) return false;
  if (cell < 0 || cell >= BOARD || game.revealed[cell]) return false;
  const color = game.map[cell];
  game.revealed[cell] = true;
  game.guessesMade += 1;
  const turn = game.turn;
  const who = nm(game, pid);
  const word = game.words[cell];
  // Una sola línea por toque, redactada para oírse (la voz lee esto): quién
  // toca, qué palabra y en qué acaba. Nada de telegramas «Ana: Volcán rojo».
  if (color === 'assassin') {
    log(game, `💀 ${who} destapa «${word}»… ¡y era el ASESINO!`);
    win(game, other(turn), `El equipo ${turn === 'red' ? 'rojo' : 'azul'} tocó al asesino.`);
    return true;
  }
  if (color === 'neutral') {
    log(game, `⬜ ${who} destapa «${word}» y era un transeúnte: se acaba el turno.`);
    endTurn(game);
    return true;
  }
  // Casilla de un equipo.
  const colorName = color === 'red' ? 'roja' : 'azul';
  game.remaining[color] = Math.max(0, game.remaining[color] - 1);
  if (game.remaining[color] === 0) {
    log(game, `${color === turn ? '👉' : '😬'} ${who} destapa «${word}» y era la ÚLTIMA casilla ${colorName}.`);
    win(game, color, color === turn
      ? `El equipo ${color === 'red' ? 'rojo' : 'azul'} ha destapado todas sus casillas.`
      : `El equipo ${turn === 'red' ? 'rojo' : 'azul'} le regaló la última casilla que le quedaba.`);
    return true;
  }
  if (color === turn) {
    log(game, `👉 ${who} destapa «${word}» y era ${colorName}: ¡acierto!`);
    if (game.guessesLeft > 0) game.guessesLeft -= 1; // -1 (pista de 0 o ∞) no gasta intentos
    if (game.guessesLeft === 0) {
      log(game, '✋ Se agotan los intentos: fin del turno.');
      endTurn(game);
    }
    return true;
  }
  // Regaló una casilla al rival.
  log(game, `😬 ${who} destapa «${word}» y era ${colorName}, del rival: casilla regalada y fin del turno.`);
  endTurn(game);
  return true;
}

/** ¿Puede el equipo de turno pasar ya? Regla oficial: al menos UN toque antes. */
export function canPass(game: CodenamesState): boolean {
  return game.phase === 'guess' && !!game.clue && game.guessesMade > 0;
}

/** El equipo de turno decide no arriesgar más y pasa (tras al menos un toque). */
export function pass(game: CodenamesState, pid: string): boolean {
  if (!canGuess(game, pid) || !canPass(game)) return false;
  log(game, `🤐 El equipo ${game.turn === 'red' ? 'rojo' : 'azul'} pasa.`);
  endTurn(game);
  return true;
}

/** Revancha: tablero, mapa, EQUIPOS y Jefes nuevos. El marcador se acumula. */
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
  game.guessesMade = 0;
  game.clueAt = Date.now();
  game.remaining = deal.remaining;
  game.winner = null;
  game.winReason = null;
}
