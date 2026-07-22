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
  /** El Espía: duración de la ronda en minutos (oficial: 8). */
  espiaMin?: number;
  /** Una Noche: mazo elegido (rol → nº de cartas). Se recuerda entre partidas. */
  unaNoche?: Record<string, number>;
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

/**
 * Doc de una PARTIDA en curso (groups/{slug}/matches/{mid}) + id inyectado.
 * Una mesa puede tener varias partidas a la vez (grupos de gente distintos);
 * cada una lleva su propio narrador, sus ajustes (foto al arrancar) y su
 * estado de juego. Sus claves están fijadas por firestore.rules (hasOnly).
 */
export interface MatchDoc {
  id: string;
  /** Juego de la partida (GameDefinition.id). */
  gameId: string;
  createdAt: number;
  /** Dispositivos ocupados por esta partida: jugadores + narrador/altavoz. */
  members: string[];
  masterId: string | null;
  lastNarratorId: string | null;
  /** Foto de los ajustes de la mesa al arrancar (los cambios posteriores en la mesa no la tocan). */
  settings: TableSettings;
  extraRoles: RoleId[];
  game: GameState | null;
}

/**
 * Vista de partida: el grupo con una partida superpuesta (misma forma que
 * GroupDoc, para que las pantallas y acciones de los juegos no distingan
 * entre «la partida del grupo» de antes y una de las partidas de ahora).
 */
export interface GroupView extends GroupDoc {
  matchId?: string;
}

/** Doc de jugador (groups/{slug}/players/{pid}) + id. */
export interface PlayerDoc extends GamePlayer {
  deviceToken?: string;
  isPlayer?: boolean;
  /** Recuerdo POR JUEGO de «este dispositivo (no) juega»: así deseleccionar a
   *  alguien para una partida de lobos no lo borra del Empezar de El Espía. */
  isPlayerFor?: Record<string, boolean>;
  /** v2: latido de presencia del dispositivo (Date.now()); lo escriben todos. */
  heartbeatAt?: number;
}

export interface Session {
  pid: string;
  token: string;
  name: string;
}
