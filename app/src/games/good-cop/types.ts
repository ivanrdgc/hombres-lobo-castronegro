// Estado de una partida de «Good Cop Bad Cop». Vive ENTERO en el doc de su
// partida (matches/<mid>), con `goodcop: true`. La app custodia las cartas de
// integridad de todos (cada uno ve solo las suyas, y lo que investigue).
import type { Card, Kind } from './cards';

export type Phase = 'turn' | 'end';

/** Una carta investigada por alguien: SOLO la ve `by`. */
export interface Peek {
  by: string;
  target: string;
  idx: number;
  kind: Kind;
  role: string | null;
  /** Nº de línea del diario en que se miró (para ordenar el historial). */
  at: number;
  /** Ya la ha leído (la tarjeta deja de saltar en su pantalla). */
  ack: boolean;
}

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
  /** Lo investigado por cada jugador, en orden (cada uno solo ve lo suyo). */
  peeks: Record<string, Peek[]>;
  winner: 'honest' | 'crook' | null;
  winReason: string | null;
  scores: Record<string, number>;
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
