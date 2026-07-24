// Estado de una partida de «Wavelength» (Sintonía). Vive ENTERO en el doc de su
// partida (matches/<mid>), con `wavelength: true` como discriminante. La app
// custodia el OBJETIVO secreto del dial: solo lo ve el Psíquico de la ronda.

export type Phase =
  | 'clue' // el Psíquico ve el objetivo y da una pista (una idea que caiga ahí)
  | 'guess' // el equipo debate y coloca la marca en el dial
  | 'result' // se revela el objetivo y se puntúa por cercanía
  | 'end'; // se cumplió la meta: resumen final antes de cerrar

/** Meta de la partida, elegida al empezar. `null` = sin meta (rondas libres). */
export interface Goal {
  kind: 'rounds' | 'points';
  /** Rondas a jugar, o puntos de equipo a alcanzar. */
  n: number;
  /** Etiqueta ya redactada para la pantalla («2 vueltas a la mesa»). */
  label: string;
}

export interface WavelengthState {
  wavelength: true;
  phase: Phase;
  startedAt: number;
  seed: number;
  round: number;
  playerIds: string[];
  names: Record<string, string>;
  /** Psíquico de la ronda (índice en playerIds; rota cada ronda). */
  psychicIdx: number;
  /** Espectro de la ronda: par de opuestos (PÚBLICO). */
  spectrumId: string;
  /** Centro de la diana, 0..100 (SECRETO: solo el Psíquico lo ve). */
  target: number;
  /** El Psíquico ya dio su pista (informativo para la UI). */
  clue: boolean;
  /** La pista, escrita (opcional): a los 30 s de debate ya nadie la recuerda y
   *  el Psíquico tiene prohibido repetirla, así que queda a la vista de todos. */
  clueText?: string;
  /** Marca que el equipo está moviendo, 0..100 (PÚBLICA: todos ven la misma).
   *  `null` = nadie ha tocado aún el dial, así que todavía no se puede fijar. */
  pick: number | null;
  /** Quién movió la marca la última vez (para el «la ha puesto X»). */
  pickBy?: string | null;
  /** Posición que fijó el equipo, 0..100 (null hasta confirmar). */
  marker: number | null;
  /** Puntos de la última ronda (null hasta el resultado). */
  lastScore: number | null;
  /** Puntos por jugador: los gana el Psíquico que logró transmitir. */
  scores: Record<string, number>;
  /** Rondas que cada uno ha hecho de Psíquico. Sin esto la cuenta engaña:
   *  quien todavía no ha sido Psíquico sale con 0 y parece que va perdiendo. */
  psychicRounds: Record<string, number>;
  /** Total del equipo acumulado (suma de todas las rondas). */
  teamScore: number;
  /** Rondas puntuadas (las saltadas no cuentan): divisor de la media. */
  scored: number;
  /** Meta de la partida; al cumplirse, la fase «end» muestra el resumen. */
  goal?: Goal | null;
  usedSpectrums: string[];
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
