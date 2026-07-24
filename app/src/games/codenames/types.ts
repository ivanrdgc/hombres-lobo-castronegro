// Estado de una partida de «Codenames» (Nombres en Clave). Vive ENTERO en el
// doc de su partida (matches/<mid>), con `codenames: true` como discriminante.
// La app custodia el MAPA secreto: qué palabras son de cada equipo, cuáles
// neutrales y cuál el asesino. Solo lo ven los dos Jefes de espías.

export type Team = 'red' | 'blue';
export type CellKind = 'red' | 'blue' | 'neutral' | 'assassin';
export type Phase =
  | 'clue' // el Jefe del equipo de turno da una pista (palabra + número)
  | 'guess' // su equipo toca cartas hasta agotar los intentos o pasar
  | 'end';

export interface CodenamesState {
  codenames: true;
  phase: Phase;
  startedAt: number;
  seed: number;
  playerIds: string[];
  names: Record<string, string>;
  /** Bando de cada jugador. */
  teams: Record<string, Team>;
  /** Jefe de espías de cada equipo (ve el mapa; no toca cartas). */
  spymaster: Record<Team, string>;
  /** Las 25 palabras del tablero (PÚBLICAS). */
  words: string[];
  /** Color secreto de cada casilla (solo lo ven los Jefes). */
  map: CellKind[];
  /** Casillas ya destapadas (su color es público). */
  revealed: boolean[];
  /** Equipo que empezó (tiene 9 casillas; el otro, 8). */
  starting: Team;
  /** Equipo al que le toca ahora. */
  turn: Team;
  /** Pista en curso: palabra, número y quién la dio. `unlimited` = pista «∞». */
  clue: { word: string; num: number; by: string; unlimited?: boolean } | null;
  /** Toques que le quedan al equipo en este turno (número + 1); -1 = sin límite
   *  (pistas de 0 y de ∞, que no acotan cuántas casillas se pueden tocar). */
  guessesLeft: number;
  /** Toques ya dados en este turno: con 0/∞ es lo único que distingue «aún no
   *  ha tocado nadie» (no se puede pasar) de «ya han tocado» (sí se puede). */
  guessesMade: number;
  /** Cuándo empezó la fase de pista: si se eterniza, la mesa puede saltarla. */
  clueAt?: number;
  /** Casillas por destapar de cada equipo. */
  remaining: Record<Team, number>;
  winner: Team | null;
  winReason: string | null;
  scores: Record<string, number>;
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
