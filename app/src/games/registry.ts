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
import { wavelength } from './wavelength';
import { codenames } from './codenames';
import { skull } from './skull';
import { loveLetter } from './love-letter';
import { decrypto } from './decrypto';
import { goodCop } from './good-cop';
import { shadowHunters } from './shadow-hunters';
import { sonar } from './sonar';

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

export const GAME_DEFS: GameDefinition[] = [hombresLobo, unaNoche, avalon, secretHitler, chameleon, insider, coup, twoRooms, codenames, decrypto, goodCop, shadowHunters, sonar, wavelength, skull, loveLetter, espia];

/** Definición del juego seleccionado en el grupo (por defecto, el primero). */
export function gameDef(id: string | null | undefined): GameDefinition {
  return GAME_DEFS.find((g) => g.id === id) ?? GAME_DEFS[0];
}

// Lo que una mesa necesita para ELEGIR sin haber jugado a nada: cuánto dura y
// de qué palo es. Vive aquí y no en cada GameDefinition para poder compararlos
// de un vistazo (y para que la tabla se mantenga coherente entre juegos).
export interface GameMeta {
  /** Duración típica de una partida completa, en minutos (mínimo y máximo). */
  mins: [number, number];
  /** De qué palo es, en tres palabras. */
  vibe: string;
  /** Entrada suave para una mesa que no ha jugado a nada de esto. */
  easy?: boolean;
}

export const GAME_META: Record<string, GameMeta> = {
  hombres_lobo: { mins: [30, 60], vibe: 'Roles ocultos, noche narrada' },
  una_noche: { mins: [5, 10], vibe: 'Una sola noche, muy rápido', easy: true },
  avalon: { mins: [25, 45], vibe: 'Misiones y traición' },
  secret_hitler: { mins: [30, 60], vibe: 'Política y sospecha' },
  chameleon: { mins: [10, 20], vibe: 'Una palabra, un impostor', easy: true },
  insider: { mins: [10, 15], vibe: 'Contrarreloj, traidor cooperativo', easy: true },
  coup: { mins: [15, 30], vibe: 'Farol y desafíos' },
  two_rooms: { mins: [15, 25], vibe: 'Dos salas, dos bandos' },
  codenames: { mins: [15, 30], vibe: 'Palabras por equipos', easy: true },
  decrypto: { mins: [30, 45], vibe: 'Pistas cifradas por equipos' },
  good_cop: { mins: [15, 25], vibe: 'Comisaría podrida, dos líderes' },
  shadow_hunters: { mins: [30, 45], vibe: 'Tres facciones y dados' },
  sonar: { mins: [20, 40], vibe: 'Submarinos a ciegas' },
  wavelength: { mins: [15, 30], vibe: 'Intuición en equipo', easy: true },
  skull: { mins: [15, 25], vibe: 'Farol puro, reglas mínimas', easy: true },
  love_letter: { mins: [15, 25], vibe: 'Cartas, deducción, rondas cortas', easy: true },
  espia: { mins: [10, 20], vibe: 'Un lugar, un intruso', easy: true },
};

export function gameMeta(id: string): GameMeta {
  return GAME_META[id] ?? { mins: [15, 30], vibe: '' };
}
