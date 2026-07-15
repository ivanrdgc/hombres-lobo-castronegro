// Formas EXACTAS de los documentos de Firestore que escribe/lee la app.
// El esquema es el mismo que el de la v1 (sin migración): groups/{slug} con
// subcolección players/{pid}. Las claves de primer nivel del grupo están
// fijadas por firestore.rules (hasOnly): no añadir campos nuevos aquí sin
// actualizar las reglas.
import type { GameState, GamePlayer } from '../../games/hombres-lobo/types';
import type { RoleId } from '../../games/hombres-lobo/roles';

/** Ajustes de la mesa (group.settings). Se escriben campo a campo. */
export interface TableSettings {
  revealDead?: boolean;
  showComposition?: boolean;
  alguacil?: boolean;
  casual?: boolean;
  primeraNocheTranquila?: boolean;
  wolvesCount?: number | null;
  villagersCount?: number | null;
  videnteSoloBando?: boolean;
  ocultarCausas?: boolean;
  /** v2: perfil de ritmo del narrador (rapido | normal | teatral). */
  pacing?: string;
}

/** Doc del grupo (groups/{slug}) + id inyectado por el listener. */
export interface GroupDoc {
  id: string;
  name: string;
  createdAt: number;
  masterId: string | null;
  lastNarratorId: string | null;
  currentGame: string | null;
  status: 'lobby' | 'playing';
  settings: TableSettings;
  extraRoles: RoleId[];
  seating?: string[];
  /** RPC de flanco: «leed la explicación en voz alta». */
  explain?: { nonce: number; by: string };
  game: GameState | null;
}

/** Doc de jugador (groups/{slug}/players/{pid}) + id. */
export interface PlayerDoc extends GamePlayer {
  deviceToken?: string;
  isPlayer?: boolean;
  /** v2: latido de presencia del narrador (Date.now()). */
  heartbeatAt?: number;
}

export interface Session {
  pid: string;
  token: string;
  name: string;
}
