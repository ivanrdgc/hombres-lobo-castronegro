// Estado de una partida de El Espía. Vive ENTERO en group.game (con
// `espia: true` como discriminante frente a Hombres Lobo): este juego no
// escribe nada en los docs de jugador, así que convive con cualquier resto de
// otras partidas sin riesgo de esquema.

/** Votación de una acusación (overlay sobre play o timeup). */
export interface EspiaVote {
  accuserId: string;
  accusedId: string;
  /** pid → sí/no. Votan todos menos acusador (sí implícito) y acusado. */
  votes: Record<string, boolean>;
  /** Milisegundos que quedaban al congelar el reloj (fase play). */
  frozenMs: number;
  /** La acusación llegó tras agotarse el tiempo (turnos). */
  fromTimeup: boolean;
}

export type EspiaOutcomeType =
  | 'spy_caught' // acusación unánime al espía → ganan los agentes
  | 'wrong_accusation' // condenado un inocente → gana el espía (+4)
  | 'spy_guessed' // el espía se revela y acierta el lugar (+4)
  | 'spy_wrong' // el espía se revela y falla → ganan los agentes
  | 'spy_survived' // se acabó el tiempo sin condena → gana el espía (+2)
  | 'spy_left'; // el espía abandonó la ronda → ganan los agentes

export interface EspiaOutcome {
  type: EspiaOutcomeType;
  spyId: string;
  locationId: string;
  accusedId?: string;
  initiatorId?: string;
  guessId?: string;
  /** Puntos de ESTA ronda, pid → delta (ya aplicados a scores). */
  delta: Record<string, number>;
  txt: string;
}

export interface EspiaRoundNote {
  round: number;
  locationId: string;
  spyId: string;
  txt: string;
}

export interface EspiaState {
  espia: true;
  phase: 'reveal' | 'play' | 'timeup' | 'end';
  startedAt: number;
  round: number;
  /** Jugadores de la ronda, en orden de mesa (congelado al empezar). */
  playerIds: string[];
  /** Nombres congelados (para voz y crónica aunque alguien se marche). */
  names: Record<string, string>;
  dealerId: string;
  spyId: string;
  locationId: string;
  /** pid → papel en la localización (el espía no aparece). */
  roles: Record<string, string>;
  seen: Record<string, boolean>;
  durationMs: number;
  /** Fin del reloj (epoch); null en reveal, votación, timeup y end. */
  deadline: number | null;
  /** Contador de acusaciones (claves de escena y selección). */
  voteSeq: number;
  accusedUsed: Record<string, boolean>;
  vote: EspiaVote | null;
  /** Índice del turno de acusación tras el tiempo (sobre playerIds desde el repartidor). */
  timeupTurn: number | null;
  usedLocations: string[];
  scores: Record<string, number>;
  history: EspiaRoundNote[];
  outcome: EspiaOutcome | null;
  log: { txt: string }[];
}
