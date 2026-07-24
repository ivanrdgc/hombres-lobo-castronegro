// Estado de una partida de «Love Letter». Vive ENTERO en el doc de su partida
// (matches/<mid>), con `loveletter: true` como discriminante. La app custodia
// el mazo y las manos: cada jugador solo ve su propia carta (y lo que el
// Sacerdote le deje mirar).
import type { Card } from './cards';

export type Phase =
  | 'turn' // el jugador de turno tiene 2 cartas y juega una
  | 'roundEnd' // se muestra quién ganó la ronda; cualquiera pasa a la siguiente
  | 'end'; // alguien alcanzó los favores para ganar la partida

export interface LoveLetterState {
  loveletter: true;
  phase: Phase;
  startedAt: number;
  seed: number;
  round: number;
  playerIds: string[];
  names: Record<string, string>;
  deck: Card[];
  /** Carta apartada boca abajo (oculta); la usa el Príncipe si el mazo se agota. */
  aside: Card | null;
  asideUsed: boolean;
  /** Con 2 jugadores, 3 cartas quedan boca arriba (PÚBLICAS). */
  asideUp: Card[];
  /** Mano de cada jugador (1 carta; 2 durante su turno). SECRETA salvo la propia. */
  hands: Record<string, Card[]>;
  /** Descartes de cada jugador (PÚBLICOS). */
  discards: Record<string, Card[]>;
  alive: Record<string, boolean>;
  /** Protegido por la Doncella hasta su próximo turno. */
  protected: Record<string, boolean>;
  turn: string;
  starter: string;
  /** Resultado del Sacerdote: qué vio `by` (SOLO lo ve `by`). Efímero. */
  peek: { by: string; target: string; card: Card } | null;
  /** Resumen de la última ronda (para la fase roundEnd). */
  roundResult: { winner: string; reason: string } | null;
  /** Favores (rondas ganadas) por jugador. */
  tokens: Record<string, number>;
  /** Favores necesarios para ganar la partida (según nº de jugadores). */
  need: number;
  winner: string | null;
  scores: Record<string, number>;
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
