// Estado de una partida de «Good Cop Bad Cop». Vive ENTERO en el doc de su
// partida (matches/<mid>), con `goodcop: true`. La app custodia las cartas de
// integridad de todos (cada uno ve solo las suyas, y lo que investigue).
import type { Card, Kind } from './cards';

export type Phase = 'turn' | 'end';

export interface GoodCopState {
  goodcop: true;
  phase: Phase;
  startedAt: number;
  seed: number;
  playerIds: string[];
  names: Record<string, string>;
  /** Las 3 cartas de cada jugador (SECRETAS salvo las boca arriba). */
  cards: Record<string, Card[]>;
  alive: Record<string, boolean>;
  /** Tiene una pistola equipada. */
  armed: Record<string, boolean>;
  /** A quién apunta (si está armado). */
  aimAt: Record<string, string | null>;
  turn: string;
  /** Resultado de investigar: qué carta vio `by` (SOLO lo ve `by`). Efímero. */
  peek: { by: string; target: string; idx: number; kind: Kind; role: string | null } | null;
  winner: 'honest' | 'crook' | null;
  winReason: string | null;
  scores: Record<string, number>;
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
