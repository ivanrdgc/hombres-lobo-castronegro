// Estado de una partida de «Ávalon». Vive ENTERO en el doc de su partida
// (groups/<mesa>/matches/<mid>), con `avalon: true` como discriminante (como
// `espia`/`unaNoche`). No toca los docs de jugador: convive con otras partidas.
import type { RoleId, Team } from './roles';

export type Phase =
  | 'reveal' // cada cual mira su carta (rol + conocimiento) y confirma
  | 'propose' // el líder forma el equipo de la misión
  | 'vote' // TODOS votan la propuesta en secreto (aprobar/rechazar)
  | 'voteReveal' // se destapan los votos a la vez (públicos, como en el original)
  | 'quest' // los del equipo juegan carta de Éxito/Fracaso en secreto
  | 'result' // se anuncia el resultado de la misión
  | 'assassin' // el Bien ganó 3: el Asesino busca a Merlín
  | 'end';

export interface VoteRecord {
  team: string[];
  leaderId: string;
  approvals: string[];
  rejections: string[];
  approved: boolean;
  /** Misión a la que pertenecía la propuesta (para el historial público). */
  quest?: number;
}

export interface QuestRecord {
  quest: number;
  team: string[];
  fails: number;
  required: number;
  success: boolean;
  /** Quién propuso el equipo que salió (para el historial público). */
  leaderId?: string;
}

export interface AvalonState {
  avalon: true;
  phase: Phase;
  startedAt: number;
  seed: number;
  /** Jugadores en orden de mesa (congelado al empezar). */
  playerIds: string[];
  names: Record<string, string>;
  /** Lealtades SECRETAS (solo se destapan al final). */
  roles: Record<string, RoleId>;
  /** Roles opcionales activados en el lobby. */
  enabledRoles: RoleId[];
  dropped?: RoleId[];
  seen: Record<string, boolean>;
  /** Índice del líder actual en playerIds. */
  leaderIdx: number;
  /** Misión en curso (1..5). */
  quest: number;
  /** Resultados de las misiones completadas, en orden. */
  results: ('success' | 'fail')[];
  /** Propuestas rechazadas seguidas en esta misión (5 → gana el Mal). */
  voteTrack: number;
  /** Equipo propuesto (pids) durante voto/misión. */
  team: string[];
  /** Voto secreto por jugador (pid → aprobar); se destapa al completarse. */
  votes: Record<string, boolean>;
  lastVote: VoteRecord | null;
  /** Todas las votaciones resueltas, en orden (información PÚBLICA: quién
   *  propuso qué y quién lo aprobó o rechazó). La mesa real lo recuerda; aquí
   *  se consulta en pantalla en vez de fiarlo a la memoria. */
  proposals?: VoteRecord[];
  /** Carta secreta de misión por miembro del equipo (pid → éxito). */
  questCards: Record<string, boolean>;
  lastQuest: QuestRecord | null;
  /** Misiones ya resueltas, en orden (equipo, líder y cuántos sabotajes). */
  missions?: QuestRecord[];
  assassinTarget: string | null;
  winner: Team | null;
  winReason: string | null;
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
