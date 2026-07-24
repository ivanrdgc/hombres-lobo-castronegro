// Estado de una partida de «Skull» (Cráneos). Vive ENTERO en el doc de su
// partida (matches/<mid>), con `skull: true` como discriminante. La app
// custodia las PILAS boca abajo: solo su dueño sabe qué discos tiene puestos.
export type Disc = 'flower' | 'skull';

export type Phase =
  | 'setup' // colocación simultánea: cada uno pone 1 disco boca abajo
  | 'play' // por turnos: colocar otro disco o abrir una apuesta
  | 'bid' // los demás suben la apuesta o pasan
  | 'reveal' // el que ganó la apuesta levanta discos (primero los suyos)
  | 'roundEnd' // se muestra el resultado; cualquiera pasa a la siguiente ronda
  | 'end';

export interface SkullState {
  skull: true;
  phase: Phase;
  startedAt: number;
  seed: number;
  round: number;
  /** Contador para el azar reproducible (disco perdido). */
  rng: number;
  playerIds: string[];
  names: Record<string, string>;
  /** Inventario TOTAL de cada jugador (lo que posee). Empieza 3 flores + 1 calavera. */
  inv: Record<string, { flowers: number; skulls: number }>;
  /** Pila jugada esta ronda (de abajo arriba); SECRETA salvo para su dueño. */
  stacks: Record<string, Disc[]>;
  /** Jugador activo (turno o puja). */
  turn: string;
  /** Quién empieza la ronda. */
  starter: string;
  /** Apuesta en curso. */
  bid: { by: string; n: number } | null;
  /** Quién ha pasado en la puja. */
  passed: Record<string, boolean>;
  /** Revelado en curso: cuántas flores hacen falta, qué se ha levantado. */
  reveal: { by: string; need: number; flipped: { owner: string; disc: Disc }[] } | null;
  /** Resultado de la última ronda (para la fase roundEnd). */
  lastResult: { by: string; success: boolean; text: string } | null;
  /** Retos ganados por jugador (2 = victoria). */
  marks: Record<string, number>;
  /** Sigue en juego (con discos). */
  alive: Record<string, boolean>;
  winner: string | null;
  scores: Record<string, number>;
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
