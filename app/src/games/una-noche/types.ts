// Tipos de «Una Noche en Castronegro» (One Night Ultimate Werewolf, sin
// Doppelgänger). A diferencia de Los Hombres Lobo: la noche NO mata: es puro
// intercambio de cartas + información, en un orden fijo, y termina con un
// único día y una votación SIMULTÁNEA. El motor rastrea «qué carta hay en cada
// silla» (slots) — que las acciones nocturnas barajan — aparte de «qué le
// tocó a cada uno» (originalRole, que decide qué HACE de noche). El bando y la
// victoria se calculan por la carta FINAL.

export type RoleId =
  | 'doble' // 👯 El Doble: mira la carta de otro y copia ese rol para toda la partida
  | 'lobo' // 🐺 Hombre Lobo (×2): se reconocen; lobo solitario mira 1 carta del centro
  | 'esbirro' // 😈 Esbirro: ve a los lobos, pero ellos no lo ven a él (bando lobo)
  | 'mason' // 🧱 Masón (×2): se reconocen entre ellos
  | 'vidente' // 🔮 Vidente: mira 1 carta de otro jugador O 2 del centro
  | 'ladron' // 🃏 Ladrón: cambia su carta por la de otro y la mira
  | 'alborotadora' // 🌀 Alborotadora: intercambia las cartas de otros dos (sin mirar)
  | 'borracho' // 🍺 Borracho: cambia su carta por una del centro (SIN mirar)
  | 'insomne' // 😴 Insomne: al final de la noche mira su propia carta
  | 'aldeano' // 🧑‍🌾 Aldeano: sin poder
  | 'cazador' // 🏹 Cazador: si muere, también muere a quien votó
  | 'tanner'; // 🪢 El Curtidor: harto de la vida, gana SOLO si muere

export type Team = 'pueblo' | 'lobos' | 'tanner';

export type StepId =
  | 'durmiendo'
  | 'doble'
  | 'lobos'
  | 'esbirro'
  | 'masones'
  | 'vidente'
  | 'ladron'
  | 'alborotadora'
  | 'borracho'
  | 'insomne'
  | 'amanecer';

export type Phase = 'reveal' | 'night' | 'day' | 'end';

export type WinnerId = 'pueblo' | 'lobos' | 'tanner' | 'nadie';

/** Lo que la Vidente vio (se guarda como foto: swaps posteriores no lo alteran). */
export type VidenteView =
  | { kind: 'player'; pid: string; role: RoleId }
  | { kind: 'center'; idx: number[]; roles: RoleId[] }
  | null;

/** Registro de la única noche (game.acts). Las «vistas» se congelan al actuar. */
export interface Acts {
  // — El Doble (actúa el primero) —
  /** Rol copiado por El Doble (fijo el resto de la partida). */
  dobleRole?: RoleId | null;
  /** A quién miró El Doble para copiarlo. */
  dobleTarget?: string | null;
  /** La acción copiada (si copió Vidente/Ladrón/Alborotadora/Borracho) ya está hecha. */
  dobleActionDone?: boolean;
  /** La acción copiada se ejecutó (Alborotadora/Borracho: sin resultado que leer). */
  dobleActed?: boolean;
  dobleView?: VidenteView; // si copió Vidente
  dobleCard?: RoleId | null; // si copió Ladrón: su nueva carta
  // — Reconocimientos y acciones (por pid, para admitir un Doble duplicando el rol) —
  lobosSeen?: Record<string, boolean>;
  /** Índice de la carta del centro que un lobo solitario miró (+ su carta). */
  loneWolfPeek?: number | null;
  loneWolfCard?: RoleId | null;
  esbirroSeen?: Record<string, boolean>;
  masonesSeen?: Record<string, boolean>;
  videnteDone?: boolean;
  videnteView?: VidenteView;
  videnteSeen?: boolean;
  ladronDone?: boolean;
  ladronTarget?: string | null;
  /** Carta que el Ladrón sostiene tras robar (la que ve y confirma). */
  ladronCard?: RoleId | null;
  ladronSeen?: boolean;
  alborotadoraDone?: boolean;
  alborotadoraPair?: [string, string] | null;
  borrachoDone?: boolean;
  borrachoCenter?: number | null;
  insomneSeen?: Record<string, boolean>;
  insomneCard?: Record<string, RoleId>;
}

export interface LogEntry {
  kind: string;
  txt: string;
}

export type Composition = Partial<Record<RoleId, number>>;

/** El objeto `game` del doc de la partida (auto). */
export interface GameState {
  /** Discriminante: marca la partida como de Una Noche (como `espia` en El Espía). */
  unaNoche?: true;
  mode?: 'auto';
  phase?: Phase | 'manual';
  startedAt?: number;
  seed?: number;
  /** Jugadores en orden de asiento (índice = orden). El narrador/altavoz que no juega no está aquí. */
  playerIds: string[];
  /** Nombres por pid (se guardan para no leer los docs de jugador en cada transacción). */
  names: Record<string, string>;
  steps: StepId[];
  stepIdx: number;
  /** Pasos (por índice) que el narrador ha SALTADO a mano porque nadie actuaba:
   *  a partir de ahí ese paso no espera a nadie y la noche puede seguir. */
  skippedSteps?: number[];
  acts: Acts;
  /** Carta repartida a cada jugador (lo que ve al empezar y qué HACE de noche). */
  originalRole: Record<string, RoleId>;
  /** Carta ACTUAL en cada silla (los intercambios la mueven). Verdad al final. */
  slots: Record<string, RoleId>;
  /** Las 3 cartas del centro (índices 0..2). */
  center: RoleId[];
  composition: Composition;
  selectedRoles: RoleId[];
  /** Reparto visto por cada jugador (fase reveal). */
  seen?: Record<string, boolean>;
  /** Decisión registrada por el pueblo (una persona la anota, como en Los
   *  Hombres Lobo): lista de condenados. En One Night un empate mata a TODOS los
   *  empatados, por eso es una lista. `null` = aún sin decidir; `[]` = perdón. */
  lynched?: string[] | null;
  /** Cazador (por carta FINAL) que ha muerto linchado y debe disparar su flecha. */
  pendingHunter?: string | null;
  /** Cazadores que ya dispararon (evita cadenas infinitas de flechas). */
  huntersShot?: string[];
  /** Muertos del día (pids). */
  deaths?: string[];
  winner?: WinnerId | null;
  /** Todos los bandos ganadores (Una Noche admite varios: p. ej. Curtidor + Pueblo). */
  winners?: WinnerId[];
  /** Fin del tiempo de debate (ms epoch); null = sin límite. En Una Noche el
   *  límite (unos minutos) es parte de la regla: al agotarse, se vota. */
  discussionEndsAt?: number | null;
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log?: LogEntry[];
}
