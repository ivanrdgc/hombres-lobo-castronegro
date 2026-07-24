// Motor puro de «Decrypto»: reparto de palabras y códigos, rotación del
// encriptador, y resolución de cada transmisión (intercepción del rival y
// descifrado propio) con sus fichas. Sin navegador ni Firebase; determinista.
import { WORDS } from './words';
import type { DecryptoState, Team } from './types';

export const MIN_PLAYERS = 4; // 2 por equipo (encriptador + al menos uno que descifra)
export const MAX_PLAYERS = 8;
export const TOKENS_TO_WIN = 2; // 2 intercepciones ganan; 2 errores hacen perder
export const MAX_ROUNDS = 8;

export interface Player { id: string; name?: string; order?: number }
export function playersOf(game: DecryptoState): Player[] {
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

export const other = (t: Team): Team => (t === 'red' ? 'blue' : 'red');

// ——— Consultas ———

export const teamOf = (game: DecryptoState, pid: string): Team | null => game.teams[pid] ?? null;
export const teamMembers = (game: DecryptoState, t: Team): string[] =>
  game.playerIds.filter((pid) => game.teams[pid] === t);
/** El encriptador de turno del equipo `t` (pid). */
export function encoderId(game: DecryptoState, t: Team): string {
  const mem = teamMembers(game, t);
  return mem[game.encoderIdx[t] % mem.length];
}
export const isEncoder = (game: DecryptoState, pid: string): boolean =>
  pid === encoderId(game, game.teams[pid]);

/** ¿Puede el rival interceptar en esta transmisión? Solo desde la 2ª que hace
 *  ese equipo (necesita pistas anteriores). round>=2 lo garantiza. */
export function interceptorsCanPlay(game: DecryptoState): boolean {
  return game.round >= 2;
}

export const TEAM_LABEL: Record<Team, string> = { red: '🔴 Rojo', blue: '🔵 Azul' };

// ——— Reparto ———

export interface Deal {
  teams: Record<string, Team>;
  words: Record<Team, [string, string, string, string]>;
}
export function dealGame(playerIds: string[], seed: number): Deal {
  const order = shuffled(playerIds, seed);
  const half = Math.ceil(order.length / 2);
  const teams: Record<string, Team> = {};
  order.forEach((pid, i) => { teams[pid] = i < half ? 'red' : 'blue'; });
  const w = shuffled(WORDS, seed ^ 0x51ed);
  const words: Record<Team, [string, string, string, string]> = {
    red: [w[0], w[1], w[2], w[3]],
    blue: [w[4], w[5], w[6], w[7]],
  };
  return { teams, words };
}

/** Los 24 códigos posibles (3 cifras distintas de 1..4, el orden importa). */
const ALL_CODES: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  for (const a of [1, 2, 3, 4]) for (const b of [1, 2, 3, 4]) for (const c of [1, 2, 3, 4]) {
    if (a !== b && a !== c && b !== c) out.push([a, b, c]);
  }
  return out;
})();

export const codeKey = (c: readonly number[]): string => c.join('-');

/** Un código: 3 posiciones distintas de {1,2,3,4}, barajadas por semilla. En el
 *  juego de mesa las cartas de código se roban SIN reposición, así que se evita
 *  repetir uno ya usado por ese equipo (si no, un 4% de transmisiones seguidas
 *  salían idénticas y se regalaba la deducción al rival). */
export function makeCode(seed: number, used: readonly string[] = []): [number, number, number] {
  const pool = shuffled(ALL_CODES, seed);
  const pick = pool.find((c) => !used.includes(codeKey(c))) || pool[0];
  return [pick[0], pick[1], pick[2]];
}

// ——— Utilidades ———

const log = (game: DecryptoState, txt: string) => game.log.push({ txt });
const nm = (game: DecryptoState, pid: string | null | undefined) => (pid && game.names[pid]) || 'alguien';
const sameCode = (a: number[], b: number[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

/** ¿Las fichas ya deciden la partida? No cierra nada: se consulta al SALIR del
 *  destape (`nextTransmission`), para que la mesa llegue a ver el `reveal` del
 *  código ganador en vez de saltar directa al final. */
export function pendingWin(game: DecryptoState): { winner: Team; reason: string } | null {
  for (const t of ['red', 'blue'] as Team[]) {
    if (game.tokens[t].intercepts >= TOKENS_TO_WIN) {
      return { winner: t, reason: `${TEAM_LABEL[t]} logra ${TOKENS_TO_WIN} intercepciones.` };
    }
    if (game.tokens[t].errors >= TOKENS_TO_WIN) {
      return { winner: other(t), reason: `${TEAM_LABEL[t]} acumula ${TOKENS_TO_WIN} errores de comunicación.` };
    }
  }
  return null;
}

// Cierra la partida. `winner: null` = tablas (nadie suma punto).
function finish(game: DecryptoState, winner: Team | null, reason: string): void {
  game.winner = winner;
  game.winReason = reason;
  game.phase = 'end';
  if (!winner) { log(game, `🤝 Tablas. ${reason}`); return; }
  for (const pid of teamMembers(game, winner)) game.scores[pid] = (game.scores[pid] || 0) + 1;
  log(game, `🏆 Gana el equipo ${TEAM_LABEL[winner]}. ${reason}`);
}

// Fin por límite de rondas: decide quien más interceptó; si empatan, quien
// menos errores cometió; y si TODO empata son tablas de verdad (antes ganaba el
// azul «por decreto» y el motivo anunciado era falso).
function finishByRounds(game: DecryptoState): void {
  const r = game.tokens.red; const b = game.tokens.blue;
  const done = `Se agotaron las ${MAX_ROUNDS} rondas`;
  if (r.intercepts !== b.intercepts) {
    const w: Team = r.intercepts > b.intercepts ? 'red' : 'blue';
    finish(game, w, `${done}: el equipo ${TEAM_LABEL[w]} interceptó más veces.`);
  } else if (r.errors !== b.errors) {
    const w: Team = r.errors < b.errors ? 'red' : 'blue';
    finish(game, w, `${done} con las mismas intercepciones: el equipo ${TEAM_LABEL[w]} cometió menos errores.`);
  } else {
    finish(game, null, `${done} y los dos equipos acaban con las mismas fichas: nadie gana.`);
  }
}

// ——— Comienzo de medio-turno ———

/** Prepara la transmisión del equipo activo: nuevo código para su encriptador,
 *  nunca uno que ese equipo ya haya transmitido en esta partida. */
export function beginTransmission(game: DecryptoState, seed: number): void {
  if (!game.usedCodes) game.usedCodes = { red: [], blue: [] };
  const used = (game.usedCodes[game.active] ||= []);
  game.code = makeCode(seed, used);
  used.push(codeKey(game.code));
  game.clues = null;
  game.intercept = null;
  game.decode = null;
  game.phase = 'clue';
  log(game, `📡 Ronda ${game.round} de ${MAX_ROUNDS}. Transmite el equipo ${TEAM_LABEL[game.active]}: ${nm(game, encoderId(game, game.active))} prepara sus 3 pistas; los demás esperan.`);
}

/** Releva al encriptador de turno (se quedó sin batería, se ausentó…): rota al
 *  siguiente de su equipo y reparte código nuevo, porque el anterior ya lo vio. */
export function relieveEncoder(game: DecryptoState, pid: string, seed: number): boolean {
  if (game.phase !== 'clue') return false;
  if (game.teams[pid] !== game.active) return false; // solo su propio equipo releva
  const mem = teamMembers(game, game.active);
  if (mem.length < 2) return false;
  const before = encoderId(game, game.active);
  if (!game.usedCodes) game.usedCodes = { red: [], blue: [] };
  const used = (game.usedCodes[game.active] ||= []);
  if (!used.includes(codeKey(game.code))) used.push(codeKey(game.code)); // el que se abandona ya está quemado
  game.encoderIdx[game.active] += 1;
  log(game, `🔄 ${nm(game, before)} no puede encriptar: toma el relevo ${nm(game, encoderId(game, game.active))}, con un código nuevo.`);
  beginTransmission(game, seed);
  return true;
}

// ——— Mutadores ———

/** El encriptador escribe sus 3 pistas (una por dígito de su código). */
export function giveClues(game: DecryptoState, pid: string, clues: [string, string, string]): boolean {
  if (game.phase !== 'clue' || pid !== encoderId(game, game.active)) return false;
  if (clues.some((c) => !c || !c.trim())) return false;
  game.clues = [clues[0].trim().slice(0, 30), clues[1].trim().slice(0, 30), clues[2].trim().slice(0, 30)];
  game.phase = interceptorsCanPlay(game) ? 'intercept' : 'decode';
  // Las pistas son PÚBLICAS: el diario (y la voz) pueden decirlas sin fuga, y de
  // paso se anuncia a quién le toca AHORA, no lo que acaba de pasar.
  const next = interceptorsCanPlay(game)
    ? `Ahora intenta interceptarlo el equipo ${TEAM_LABEL[other(game.active)]}.`
    : `Ahora lo descifra el propio equipo ${TEAM_LABEL[game.active]}, sin su encriptador.`;
  log(game, `💬 Pistas del equipo ${TEAM_LABEL[game.active]}: ${game.clues.join(', ')}. ${next}`);
  return true;
}

/** El rival registra su intento de interceptar (orden de los 3 dígitos). */
export function submitIntercept(game: DecryptoState, pid: string, guess: [number, number, number]): boolean {
  if (game.phase !== 'intercept') return false;
  if (game.teams[pid] !== other(game.active)) return false; // solo el rival
  if (!validCode(guess)) return false;
  game.intercept = guess;
  game.phase = 'decode';
  log(game, `🕵️ El equipo ${TEAM_LABEL[other(game.active)]} ya ha registrado su intercepción. Ahora descifra el equipo ${TEAM_LABEL[game.active]}: su encriptador calla.`);
  return true;
}

/** El propio equipo (no el encriptador) registra su descifrado. */
export function submitDecode(game: DecryptoState, pid: string, guess: [number, number, number]): boolean {
  if (game.phase !== 'decode') return false;
  if (game.teams[pid] !== game.active || pid === encoderId(game, game.active)) return false;
  if (!validCode(guess)) return false;
  game.decode = guess;
  resolve(game);
  return true;
}

export function validCode(c: number[]): boolean {
  return c.length === 3 && c.every((x) => x >= 1 && x <= 4) && new Set(c).size === 3;
}

// Reparte fichas y prepara el siguiente medio-turno (o cierra la partida).
function resolve(game: DecryptoState): void {
  const active = game.active;
  const opp = other(active);
  const codeOk = !!game.decode && sameCode(game.decode, game.code);
  const intercepted = !!game.intercept && sameCode(game.intercept, game.code);
  if (!codeOk) {
    game.tokens[active].errors += 1;
    log(game, `❌ El equipo ${TEAM_LABEL[active]} NO descifró su propio código (${game.code.join('-')}): error de comunicación.`);
  } else {
    log(game, `✅ El equipo ${TEAM_LABEL[active]} descifró su código (${game.code.join('-')}).`);
  }
  if (intercepted) {
    game.tokens[opp].intercepts += 1;
    log(game, `🕵️ ¡El equipo ${TEAM_LABEL[opp]} INTERCEPTÓ el código!`);
  } else if (game.intercept) {
    log(game, `🔒 El equipo ${TEAM_LABEL[opp]} no logró interceptar.`);
  }
  game.history.push({ team: active, round: game.round, code: game.code, clues: game.clues! });
  // El desenlace NO se resuelve aquí: la fase 'reveal' tiene que verse (antes,
  // la transmisión ganadora saltaba al final sin destaparse en pantalla).
  game.phase = 'reveal';
  log(game, pendingWin(game)
    ? '🏁 Se destapa el código. Pulsad «Ver el desenlace».'
    : '📻 Se destapa el código. Cuando estéis, pulsad «Siguiente transmisión».');
}

/** Tras el resultado, pasa al siguiente medio-turno (cualquiera lo dispara). */
export function nextTransmission(game: DecryptoState, seed: number): boolean {
  if (game.phase !== 'reveal') return false;
  const pend = pendingWin(game);
  if (pend) { finish(game, pend.winner, pend.reason); return true; }
  // Alterna equipo; cuando vuelve a rojo, sube la ronda y rota encriptadores.
  if (game.active === 'blue') {
    game.round += 1;
    game.encoderIdx.red += 1;
    game.encoderIdx.blue += 1;
    if (game.round > MAX_ROUNDS) { finishByRounds(game); return true; }
  }
  game.active = other(game.active);
  beginTransmission(game, seed);
  return true;
}

export function resetForRematch(game: DecryptoState, seed: number): void {
  const deal = dealGame(game.playerIds, seed);
  game.seed = seed;
  game.round = 1;
  game.teams = deal.teams;
  game.words = deal.words;
  game.encoderIdx = { red: 0, blue: 0 };
  game.active = 'red';
  game.tokens = { red: { intercepts: 0, errors: 0 }, blue: { intercepts: 0, errors: 0 } };
  game.history = [];
  game.usedCodes = { red: [], blue: [] }; // mazo de códigos nuevo
  game.winner = null;
  game.winReason = null;
  beginTransmission(game, seed ^ 0xabcd);
}

/** La «hoja de deducción» del juego de mesa: todas las pistas que un equipo ha
 *  dado ya para su palabra `n` (1..4), en orden. Es lo que de verdad se juega:
 *  ronda 1 «marea»→4 y ronda 2 «ola»→4 delatan que su 4 va de mar. */
export function cluesForWord(game: DecryptoState, t: Team, n: number): { clue: string; round: number }[] {
  const out: { clue: string; round: number }[] = [];
  for (const h of game.history) {
    if (h.team !== t) continue;
    const j = h.code.indexOf(n);
    if (j >= 0 && h.clues[j]) out.push({ clue: h.clues[j], round: h.round });
  }
  return out;
}
