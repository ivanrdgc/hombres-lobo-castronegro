// Estado de una partida de «Decrypto». Vive ENTERO en el doc de su partida
// (matches/<mid>), con `decrypto: true` como discriminante. La app custodia las
// 4 palabras clave de cada equipo (solo las ve ese equipo) y el código secreto
// de la ronda (solo lo ve el encriptador de turno).

export type Team = 'red' | 'blue';
export type Phase =
  | 'clue' // el encriptador del equipo activo escribe 3 pistas para su código
  | 'intercept' // el equipo RIVAL intenta adivinar el código (desde la ronda 2)
  | 'decode' // el propio equipo adivina su código
  | 'reveal' // se destapa el código y se reparten fichas
  | 'end';

export interface Transmission {
  team: Team;
  round: number;
  code: [number, number, number]; // orden de palabras (1..4), distintas
  clues: [string, string, string];
}

export interface DecryptoState {
  decrypto: true;
  phase: Phase;
  startedAt: number;
  seed: number;
  round: number;
  playerIds: string[];
  names: Record<string, string>;
  teams: Record<string, Team>;
  /** Las 4 palabras clave de cada equipo (SECRETAS para el rival). */
  words: Record<Team, [string, string, string, string]>;
  /** Encriptador de turno de cada equipo (índice dentro de su equipo; rota). */
  encoderIdx: Record<Team, number>;
  /** Equipo que transmite en este medio-turno. */
  active: Team;
  /** Código de la transmisión en curso (SECRETO salvo para el encriptador). */
  code: [number, number, number];
  /** Las 3 pistas ya escritas (PÚBLICAS en cuanto se confirman). */
  clues: [string, string, string] | null;
  /** Intento de INTERCEPTAR del rival (orden de dígitos). */
  intercept: [number, number, number] | null;
  /** Intento del PROPIO equipo de descifrar su código. */
  decode: [number, number, number] | null;
  /** Fichas: intercepciones logradas y errores de comunicación, por equipo. */
  tokens: Record<Team, { intercepts: number; errors: number }>;
  /** Historial de transmisiones (pistas y códigos ya revelados). */
  history: Transmission[];
  winner: Team | null;
  winReason: string | null;
  scores: Record<string, number>;
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
