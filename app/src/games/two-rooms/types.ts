// Estado de una partida de «Two Rooms and a Boom» (adaptación de mesa digital).
// Vive ENTERO en el doc de su partida (matches/<mid>), con `tworooms: true` como
// discriminante. La app hace de máster oculto: reparte bandos y roles en secreto
// (Presidente azul, Bombardero rojo), reparte a la gente en DOS salas, lleva el
// reloj de cada ronda y, al final, dictamina quién gana comprobando si el
// Bombardero acabó en la misma sala que el Presidente. El reparto de rehenes de
// cada ronda lo decide cada sala por votación.

export type Team = 'red' | 'blue';
export type Role = 'president' | 'bomber' | 'none';

export type Phase =
  | 'reveal' // cada cual mira su carta (bando + rol) y en qué sala empieza
  | 'discuss' // ronda en marcha: contrarreloj para hablar y enseñar cartas
  | 'hostages' // acabado el tiempo, cada sala vota a quién manda de rehén
  | 'end';

export interface TwoRoomsState {
  tworooms: true;
  phase: Phase;
  startedAt: number;
  seed: number;
  /** Ronda actual (1..totalRounds). */
  round: number;
  totalRounds: number;
  playerIds: string[];
  names: Record<string, string>;
  /**
   * Cómo suena la voz (las dos salas están físicamente separadas):
   * - `single`: un solo dispositivo narra (llega solo a su sala).
   * - `perRoom`: un dispositivo por sala (roomSpeakers[0] y [1]), ambos narran.
   * - `all`: TODOS los móviles narran (cada sala se oye sola, sin extras).
   */
  voiceMode: 'single' | 'perRoom' | 'all';
  /** Dispositivo altavoz de cada sala (modo perRoom); [0] = masterId siempre. */
  roomSpeakers: [string | null, string | null];
  /** Bando de cada jugador (SECRETO). */
  teams: Record<string, Team>;
  /** Rol especial de cada jugador (SECRETO): president | bomber | none. */
  roles: Record<string, Role>;
  /** Sala de cada jugador (0 ó 1). PÚBLICA: todos ven quién está en cada sala. */
  room: Record<string, 0 | 1>;
  seen: Record<string, boolean>;
  durationMs: number;
  /** Fin del reloj de la ronda (epoch); null salvo en 'discuss'. */
  deadline: number | null;
  /** Voto de rehén: votante → señalado (mismo cuarto). Se vacía cada ronda. */
  hVotes: Record<string, string>;
  /** Rehén ya decidido por cada sala esta ronda ([sala0, sala1]); null si falta. */
  pick: [string | null, string | null];
  /** Historial de intercambios (para la crónica). */
  swaps: { round: number; from0: string; from1: string }[];
  winner: Team | null;
  scores: Record<string, number>;
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
