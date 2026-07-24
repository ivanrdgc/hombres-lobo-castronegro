// Estado de una partida de «Captain Sonar» (adaptación por turnos). Vive ENTERO
// en el doc de su partida (matches/<mid>), con `sonar: true`. La posición y la
// estela de cada submarino son SECRETAS (solo su tripulación las ve); el rumbo
// anunciado, los torpedos, la vida y la energía son públicos.
import type { VoiceMode } from '../../core/narrator/voice-mode';
import type { Cell } from './map';

export type Phase = 'turn' | 'end';
export type Team = 'red' | 'blue';

export interface Sub {
  /** Posición actual (SECRETA para el equipo rival). */
  pos: Cell;
  /** Estela: casillas ya visitadas desde la última emersión (SECRETA). */
  trail: Cell[];
  hp: number;
  energy: number;
}

/** Anuncio público de rumbo: dirección, silencio o emersión (para la tira). */
export type Announce = 'N' | 'S' | 'E' | 'W' | 'silence' | 'surface';

export interface SonarState {
  sonar: true;
  phase: Phase;
  startedAt: number;
  seed: number;
  playerIds: string[];
  names: Record<string, string>;
  /** Tripulación de cada submarino (PÚBLICO). */
  teams: Record<Team, string[]>;
  /** Estado de cada submarino (pos/estela SECRETAS; hp/energía públicas). */
  subs: Record<Team, Sub>;
  turnTeam: Team;
  /** Rumbos anunciados por cada submarino (PÚBLICO: se dijeron en voz alta). */
  moves: Record<Team, Announce[]>;
  voiceMode: VoiceMode;
  /** Altavoz de cada submarino (modo perRoom); [0] = masterId siempre. */
  teamSpeakers: [string | null, string | null];
  winner: Team | null;
  winReason: string | null;
  scores: Record<string, number>;
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
