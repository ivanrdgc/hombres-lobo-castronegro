// Estado de una partida de «Wavelength» (Sintonía). Vive ENTERO en el doc de su
// partida (matches/<mid>), con `wavelength: true` como discriminante. La app
// custodia el OBJETIVO secreto del dial: solo lo ve el Psíquico de la ronda.

export type Phase =
  | 'clue' // el Psíquico ve el objetivo y da una pista (una idea que caiga ahí)
  | 'guess' // el equipo debate y coloca el marcador en el dial
  | 'result'; // se revela el objetivo y se puntúa por cercanía

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
  /** Posición que fijó el equipo, 0..100 (null hasta confirmar). */
  marker: number | null;
  /** Puntos de la última ronda (null hasta el resultado). */
  lastScore: number | null;
  /** Puntos por jugador: los gana el Psíquico que logró transmitir. */
  scores: Record<string, number>;
  /** Total del equipo acumulado (suma de todas las rondas). */
  teamScore: number;
  usedSpectrums: string[];
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
