// Tipos del dominio de Los Hombres Lobo de Castronegro.
// Reflejan EXACTAMENTE las formas que la v1 guarda en Firestore (groups/{slug}
// y su subcolección players): la v2 comparte esquema con la v1 sin migración.
import type { RoleId } from './roles';

export type Team = 'pueblo' | 'lobos' | 'solitario';

export type StepId =
  | 'durmiendo'
  | 'ladron'
  | 'cupido'
  | 'enamorados'
  | 'nino_salvaje'
  | 'perro_lobo'
  | 'dos_hermanas'
  | 'tres_hermanos'
  | 'actor'
  | 'defensor'
  | 'vidente'
  | 'zorro'
  | 'cuervo'
  | 'lobos_reconocen'
  | 'lobos'
  | 'infecto_decision'
  | 'lobo_feroz'
  | 'lobo_albino'
  | 'bruja'
  | 'gaitero'
  | 'encantados'
  | 'gitana'
  | 'amanecer';

export type DeathCause =
  | 'lobos'
  | 'veneno'
  | 'linchado'
  | 'pena'
  | 'pena_sin_disparo'
  | 'flecha'
  | 'oxido'
  | 'sacrificio'
  | 'abandono';

export interface Powers {
  heal?: boolean;
  poison?: boolean;
  infect?: boolean;
  zorro?: boolean;
  juez?: boolean;
}

/** Jugador dentro de una partida (subconjunto del doc players/{pid} de la v1). */
export interface GamePlayer {
  id: string;
  name?: string;
  order?: number;
  inGame?: boolean;
  role?: RoleId | null;
  alive?: boolean | null;
  roleSeen?: boolean;
  lover?: boolean;
  charmed?: boolean;
  infected?: boolean;
  transformed?: boolean;
  revealedTonto?: boolean;
  ancianoHit?: boolean;
  wolfSide?: boolean | null;
  modelId?: string | null;
  sect?: string;
  keyword?: string | null;
  kwRenewedNight?: number;
  causeOfDeath?: DeathCause | null;
  deathAt?: number | null;
  protectedLast?: string | null;
  actorPower?: string | null;
  /** Papeles ya interpretados por el Actor: cada carta se gasta al usarla. */
  actorUsed?: string[] | null;
  videnteLog?: { pid: string; role?: RoleId | null; wolf?: boolean; night: number }[];
  powers?: Powers;
}

/** Registro de acciones de la noche en curso (game.acts, se vacía cada noche). */
export interface Acts {
  ladronDone?: boolean;
  cupidoPair?: [string, string];
  loversSeen?: Record<string, boolean>;
  hermanasSeen?: Record<string, boolean>;
  hermanosSeen?: Record<string, boolean>;
  lobosSeen?: Record<string, boolean>;
  encantadosSeen?: Record<string, boolean>;
  actor?: { power: 'vidente' | 'defensor' | 'cuervo'; target?: string | null };
  actorSeen?: boolean;
  defensorTarget?: string | null;
  videnteTarget?: string | null;
  videnteSeen?: boolean;
  zorroTarget?: string | null;
  zorroSeen?: boolean;
  zorroResult?: boolean | null;
  cuervoTarget?: string | null;
  wolfVictim?: string | null;
  wolfBy?: string;
  infectoDecided?: boolean;
  infectoUsed?: boolean;
  ferozVictim?: string | null;
  albinoVictim?: string | null;
  brujaDone?: boolean;
  brujaHeal?: string | null;
  brujaPoison?: string | null;
  gaiteroTargets?: string[];
  gitanaDone?: boolean;
  gitanaQIdx?: number | null;
  gitanaText?: string | null;
}

export interface PendingEntry {
  type: 'cazador' | 'sirvienta' | 'alguacil_elect' | 'alguacil_pick' | 'cabeza_pick';
  pid?: string;
  targetId?: string;
  deadline?: number;
}

export interface LogEntry {
  kind: string;
  txt: string;
}

export interface DeathRecord {
  pid: string;
  cause: DeathCause;
  role?: RoleId | null;
  hideRole?: boolean;
}

/** Anotación de muerte para la voz del ocaso (lastLynch / lastLoveDeath). */
export interface DeathNote {
  name?: string;
  role?: RoleId | null;
  hideRole: boolean;
}

export interface CaballeroRust {
  wolfId: string;
}

export type WinnerId =
  | 'pueblo'
  | 'lobos'
  | 'enamorados'
  | 'gaitero'
  | 'lobo_albino'
  | 'sectario'
  | 'angel'
  | 'nadie';

export type Composition = Partial<Record<RoleId, number>>;

/** El objeto `game` completo del doc del grupo (v1: se reescribe entero por acción). */
export interface GameState {
  mode?: 'auto' | 'manual' | 'guiado';
  phase?: 'reveal' | 'night' | 'day' | 'end' | 'manual';
  night: number;
  dayNum: number;
  steps: StepId[];
  stepIdx: number;
  startedAt?: number;
  seed?: number;
  acts: Acts;
  vote?: { target: string; by: string } | null;
  votesLeft?: number;
  pending: PendingEntry[];
  winner?: WinnerId | null;
  alguacilId?: string | null;
  soloVoteId?: string | null;
  /** Nombre del único votante designado por el Cabeza de Turco (para la voz). */
  soloVoteName?: string | null;
  juezArmed?: string | null;
  juezSecondActive?: boolean;
  deathTick?: number;
  powersLost?: boolean;
  wolfDeathOccurred?: boolean;
  caballeroRust?: CaballeroRust | null;
  lastLynch?: DeathNote | null;
  lastLoveDeath?: DeathNote | null;
  /** Nombre del Tonto del Pueblo revelado hoy al ser linchado (voz del ocaso). */
  lastTontoReveal?: string | null;
  /** Muertes por la flecha del Cazador, pendientes de anunciar por voz. */
  lastShot?: DeathNote[] | null;
  shotNonce?: number;
  lastDawn?: {
    deaths: { name: string; role: RoleId | string | null }[];
    events?: string[];
    gitana?: string | null;
    cuervo?: string | null;
    oso?: string | null;
  } | null;
  infectoPowerUsed?: boolean;
  keywordsActive?: boolean;
  kwPool?: string[];
  kwIdx?: number;
  kwDecoys?: string[];
  composition?: Composition;
  centerCards?: (RoleId | null)[];
  dropped?: { id: RoleId; reason: string }[];
  selectedRoles?: RoleId[];
  fakeAllSelected?: boolean;
  compositionPublic?: boolean;
  wolvesKnown?: boolean;
  hermanasKnown?: boolean;
  hermanosKnown?: boolean;
  revealDead?: boolean;
  noKillNight1?: boolean;
  videnteBando?: boolean;
  hideNightCauses?: boolean;
  paused?: { by: string; name?: string; at: number } | null;
  roleRefresh?: {
    confirmed?: Record<string, boolean>;
    startedAt?: number;
    closing?: boolean;
    at?: number;
  } | null;
  refreshNonce?: number;
  repeatNonce?: number;
  gitanaQ?: null;
  log?: LogEntry[];
}
