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
  /** Cómo se sostiene el móvil (B28) — decide el diseño de sus pantallas:
   *  `mesa` plano y desbloqueado (todas las pantallas iguales, lo secreto tras
   *  un gesto), `mano` mirando a ti (tu baraja siempre a la vista) y `equipo`
   *  como mano pero compartido con los tuyos y oculto al rival. */
  posture: 'mesa' | 'mano' | 'equipo';
}

/** Cómo colocar el móvil, para decírselo a la mesa antes de repartir. */
export const POSTURE_HINT: Record<GameMeta['posture'], string> = {
  mesa: '🍽️ Móvil plano en la mesa: todas las pantallas se ven iguales, y lo tuyo solo aparece cuando lo pides.',
  mano: '🃏 Móvil en la mano, mirando a ti: la pantalla es tu mano de cartas, no la enseñes.',
  equipo: '👥 Móvil a la vista de los tuyos y tapado al equipo rival: lo que sale en pantalla es secreto de equipo.',
};

export const GAME_META: Record<string, GameMeta> = {
  hombres_lobo: { mins: [30, 60], vibe: 'Roles ocultos, noche narrada', posture: 'mesa' },
  una_noche: { mins: [5, 10], vibe: 'Una sola noche, muy rápido', easy: true, posture: 'mesa' },
  avalon: { mins: [25, 45], vibe: 'Misiones y traición', posture: 'mesa' },
  secret_hitler: { mins: [30, 60], vibe: 'Política y sospecha', posture: 'mesa' },
  chameleon: { mins: [10, 20], vibe: 'Una palabra, un impostor', easy: true, posture: 'mesa' },
  insider: { mins: [10, 15], vibe: 'Contrarreloj, traidor cooperativo', easy: true, posture: 'mesa' },
  coup: { mins: [15, 30], vibe: 'Farol y desafíos', posture: 'mano' },
  two_rooms: { mins: [15, 25], vibe: 'Dos salas, dos bandos', posture: 'mesa' },
  codenames: { mins: [15, 30], vibe: 'Palabras por equipos', easy: true, posture: 'equipo' },
  decrypto: { mins: [30, 45], vibe: 'Pistas cifradas por equipos', posture: 'equipo' },
  good_cop: { mins: [15, 25], vibe: 'Comisaría podrida, dos líderes', posture: 'mesa' },
  shadow_hunters: { mins: [30, 45], vibe: 'Tres facciones y dados', posture: 'mesa' },
  sonar: { mins: [20, 40], vibe: 'Submarinos a ciegas', posture: 'equipo' },
  wavelength: { mins: [15, 30], vibe: 'Intuición en equipo', easy: true, posture: 'equipo' },
  skull: { mins: [15, 25], vibe: 'Farol puro, reglas mínimas', easy: true, posture: 'mano' },
  love_letter: { mins: [15, 25], vibe: 'Cartas, deducción, rondas cortas', easy: true, posture: 'mano' },
  espia: { mins: [10, 20], vibe: 'Un lugar, un intruso', easy: true, posture: 'mesa' },
};

export function gameMeta(id: string): GameMeta {
  return GAME_META[id] ?? { mins: [15, 30], vibe: '', posture: 'mesa' };
}
