// Registro de juegos de la mesa. El shell (mesa, dispositivos, identidad,
// presencia, voz) es común; cada juego aporta su GameDefinition: metadatos de
// catálogo + pantallas (lobby de configuración, «Empezar partida» y partida)
// + sus modales. Añadir un juego = añadir su definición a GAME_DEFS.
import type { Component } from 'svelte';
import type { GroupDoc, PlayerDoc } from '../core/sync/schema';
import { hombresLobo } from './hombres-lobo';
import { espia } from './espia';
import { unaNoche } from './una-noche';
import { avalon } from './avalon';
import { secretHitler } from './secret-hitler';
import { chameleon } from './chameleon';
import { insider } from './insider';
import { coup } from './coup';
import { twoRooms } from './two-rooms';

/** Props que reciben las pantallas principales de un juego. */
export type GameScreenProps = { group: GroupDoc; my: PlayerDoc };

export interface GameDefinition {
  id: string;
  emoji: string;
  name: string;
  /** Descripción corta para el catálogo de la mesa. */
  desc: string;
  /** Rango de jugadores admitidos (se muestra en el catálogo). */
  minPlayers: number;
  maxPlayers: number;
  /** Lobby de configuración del juego (explicación, roles, ajustes…). */
  Lobby: Component<GameScreenProps>;
  /** Pantalla «Empezar partida»: jugadores, orden, narrador y modo. */
  Start: Component<GameScreenProps>;
  /** Pantalla de partida (decide internamente por modo y fase). */
  Screen: Component<GameScreenProps>;
  /** Modales propios del juego, por app.ui.modal.type. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cada modal define sus props
  modals: Record<string, Component<any>>;
}

export const GAME_DEFS: GameDefinition[] = [hombresLobo, unaNoche, avalon, secretHitler, chameleon, insider, coup, twoRooms, espia];

/** Definición del juego seleccionado en el grupo (por defecto, el primero). */
export function gameDef(id: string | null | undefined): GameDefinition {
  return GAME_DEFS.find((g) => g.id === id) ?? GAME_DEFS[0];
}
