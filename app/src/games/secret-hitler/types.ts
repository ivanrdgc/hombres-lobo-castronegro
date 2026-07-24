// Estado de una partida de «Secret Hitler». Vive ENTERO en el doc de su
// partida (matches/<mid>), con `secretHitler: true` como discriminante. La app
// custodia el mazo de decretos y las cartas que cada gobierno ve en secreto.
import type { PolicyId, PowerType, RoleId } from './roles';

export type Phase =
  | 'reveal' // cada cual mira su carta y confirma
  | 'nominate' // el Presidente nomina Canciller
  | 'election' // todos los vivos votan Ja/Nein el gobierno
  | 'legislativePresident' // el Presidente ve 3 decretos y descarta 1
  | 'legislativeChancellor' // el Canciller ve 2 y promulga 1
  | 'vetoDecision' // el Presidente decide sobre el veto propuesto
  | 'power' // poder presidencial (mirar/investigar/elección especial/ejecutar)
  | 'end';

export interface ElectionRecord {
  president: string;
  chancellor: string;
  ja: string[];
  nein: string[];
  passed: boolean;
}

export interface SHState {
  secretHitler: true;
  phase: Phase;
  startedAt: number;
  seed: number;
  playerIds: string[];
  names: Record<string, string>;
  roles: Record<string, RoleId>;
  alive: Record<string, boolean>;
  seen: Record<string, boolean>;
  /** Puntero de rotación regular de la presidencia (índice en playerIds). */
  presidentIdx: number;
  /** Presidente de una elección especial (turno único); null = rotación normal. */
  specialPresident: string | null;
  nominatedChancellor: string | null;
  /** Últimos cargos ELECTOS (límites de mandato para el Canciller). */
  lastPresident: string | null;
  lastChancellor: string | null;
  votes: Record<string, boolean>;
  lastElection: ElectionRecord | null;
  electionTracker: number;
  liberalPolicies: number;
  fascistPolicies: number;
  /** Mazo y descartes (SECRETOS: solo la app los ve). */
  draw: PolicyId[];
  discard: PolicyId[];
  /** Las 3 que ve el Presidente y las 2 que pasa al Canciller (secretas). */
  presidentDraw: PolicyId[] | null;
  chancellorDraw: PolicyId[] | null;
  vetoUnlocked: boolean;
  vetoRequested: boolean;
  /** El Presidente ya rechazó un veto en ESTA sesión legislativa: el Canciller
   *  está obligado a promulgar (regla oficial: no se puede re-vetar). */
  vetoRefused?: boolean;
  lastEnacted: PolicyId | null;
  /** Poder en curso (quién lo ejerce). */
  power: { type: PowerType; by: string } | null;
  /** Top-3 mostradas al Presidente durante «mirar» (secretas). */
  peek: PolicyId[] | null;
  /** Resultado de investigar (solo lo ve el Presidente investigador). */
  investigateResult: { target: string; faction: 'liberal' | 'fascist' } | null;
  /** pids ya investigados (no se puede investigar dos veces al mismo). */
  investigated: string[];
  /** Reshuffle: veces que se rebarajó el mazo (para la crónica/claves). */
  reshuffles: number;
  winner: 'liberal' | 'fascist' | null;
  winReason: string | null;
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
