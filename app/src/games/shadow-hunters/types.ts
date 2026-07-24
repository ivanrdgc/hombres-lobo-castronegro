// Estado de una partida de «Shadow Hunters» (adaptación digital). Vive ENTERO
// en el doc de su partida (matches/<mid>), con `shadowh: true`. La app custodia
// las identidades (cada uno ve la suya y lo que deduzca) y tira los dados.

export type Phase = 'turn' | 'end';

export interface ShadowHState {
  shadowh: true;
  phase: Phase;
  startedAt: number;
  seed: number;
  /** Contador para el azar reproducible (dados y pistas). */
  rng: number;
  playerIds: string[];
  names: Record<string, string>;
  /** Personaje de cada jugador (SECRETO hasta revelarse o morir). */
  chars: Record<string, string>;
  hp: Record<string, number>;
  maxHp: number;
  alive: Record<string, boolean>;
  /** Identidad pública. Es también el candado del poder: se usa al revelarse. */
  revealed: Record<string, boolean>;
  turn: string;
  /** Pista en curso: solo `by` y `target` ven el TEXTO; la mesa, el resultado.
   *  `ack` = quién ha pulsado «Entendido»; la carta no se retira hasta que la
   *  han leído los DOS (el que la da pulsa enseguida y dejaba al receptor sin
   *  la información, que es justo lo que se juega aquí). */
  pista: { by: string; target: string; idx: number; outcome: string; ack: string[] } | null;
  /** Golpes de gracia por jugador (objetivo de Bob: tener al menos uno). */
  killsBy: Record<string, number>;
  /** Facción ganadora ('hunter'/'shadow') o null si acabó por otra vía. */
  winner: 'hunter' | 'shadow' | null;
  /** Ganadores individuales (incluye neutrales que cumplieron su objetivo). */
  winners: string[];
  winReason: string | null;
  scores: Record<string, number>;
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
