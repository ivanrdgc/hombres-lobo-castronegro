// Estado de una partida de «Coup» (Golpe de Estado). Vive ENTERO en el doc de
// su partida (matches/<mid>), con `coup: true` como discriminante. La app hace
// de máster OCULTO: baraja y reparte la corte, custodia las cartas boca abajo,
// resuelve los desafíos y los bloqueos (con su anidamiento), mueve las monedas
// y detecta al superviviente. Las influencias ocultas SON secretas; las
// monedas, las cartas descubiertas y de quién es el turno, PÚBLICAS.

/** Los cinco personajes de la corte. */
export type Character = 'duque' | 'asesino' | 'capitan' | 'embajador' | 'condesa';

/** Acciones posibles en un turno. */
export type ActionType =
  | 'renta' // Renta: +1 (general, sin desafío ni bloqueo)
  | 'ayuda' // Ayuda exterior: +2 (bloqueable por el Duque)
  | 'golpe' // Golpe de Estado: paga 7, la víctima pierde influencia (imparable)
  | 'impuestos' // Duque: +3 (desafiable)
  | 'asesinar' // Asesino: paga 3, la víctima pierde influencia (desafiable + bloqueable por Condesa)
  | 'robar' // Capitán: roba 2 monedas (desafiable + bloqueable por Capitán/Embajador)
  | 'intercambiar'; // Embajador: roba 2 de la corte, se queda las que quiera (desafiable)

/** Una carta de influencia en la mano de alguien (oculta hasta perderse). */
export interface Influence {
  char: Character;
  /** Descubierta y descartada (fuera de juego). Vivo = tiene alguna sin perder. */
  lost: boolean;
}

/** Acción declarada, a la espera de desafíos/bloqueos/resolución. */
export interface PendingAction {
  type: ActionType;
  actor: string;
  target: string | null;
  /** Personaje que la acción RECLAMA (impuestos→duque…); null en las generales. */
  claim: Character | null;
}

/** Bloqueo declarado, a la espera de que lo desafíen o lo acepten. */
export interface PendingBlock {
  by: string;
  claim: Character;
}

/** Alguien debe descubrir (perder) una influencia; se procesan en cola. */
export interface PendingLoss {
  pid: string;
  reason: 'golpe' | 'asesinato' | 'desafio' | 'bloqueo';
}

export type Phase =
  | 'reveal' // cada cual mira sus dos influencias y confirma
  | 'turn' // el jugador de turno declara su acción
  | 'challengeAction' // ventana: los demás pueden desafiar el personaje reclamado
  | 'block' // ventana: bloquear la acción (víctima, o cualquiera en la ayuda exterior)
  | 'challengeBlock' // ventana: desafiar el personaje del bloqueo
  | 'loseInfluence' // un jugador elige qué influencia descubrir
  | 'exchangeReturn' // el Embajador elige qué cartas conserva
  | 'end';

export interface CoupState {
  coup: true;
  phase: Phase;
  startedAt: number;
  seed: number;
  round: number;
  playerIds: string[];
  names: Record<string, string>;
  /** Influencias por jugador (2 al empezar; ocultas salvo las perdidas). */
  hands: Record<string, Influence[]>;
  coins: Record<string, number>;
  seen: Record<string, boolean>;
  /** Corte boca abajo: se roba de aquí (intercambio, reposición tras desafío). */
  deck: Character[];
  /** Nº de rebarajados (para el PRNG determinista de las devoluciones). */
  shuffles: number;
  /** Índice en playerIds del jugador de turno. */
  turnIdx: number;
  pending: PendingAction | null;
  block: PendingBlock | null;
  /** Reacciones de la ventana en curso (votante → qué hizo). */
  reactions: Record<string, 'challenge' | 'block' | 'pass'>;
  /** Cola de pérdidas de influencia pendientes (se procesan una a una). */
  losing: PendingLoss[];
  /** Qué hacer cuando la cola de pérdidas se vacíe (continuación diferida).
   *  'block' reabre la ventana de bloqueo de la víctima (desafío superado). */
  resume: 'endTurn' | 'exchange' | 'block' | null;
  /** Intercambio en curso: cartas que se ofrecen al Embajador para elegir. */
  exchange: { pid: string; options: Character[]; keep: number } | null;
  winner: string | null;
  scores: Record<string, number>;
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
