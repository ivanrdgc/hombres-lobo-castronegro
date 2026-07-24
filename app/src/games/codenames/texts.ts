// Corpus de «Codenames»: intro del lobby (▶️), «cómo se juega» y voz del
// narrador. El MAPA secreto no se dice jamás; la voz relata lo público (turnos,
// pistas, aciertos y desenlace), que es lo que va al diario.
import { cleanForSpeech } from '../../core/util/speech';
import type { CodenamesState } from './types';

export const INTRO_LOBBY: string[] = [
  'Codenames: dos equipos, rojo y azul, frente a un tablero de 25 palabras. Cada equipo tiene un JEFE de espías que ve, solo en su móvil, qué palabras son de los suyos, cuáles del rival, cuáles neutrales… y cuál esconde al ASESINO.',
  'Por turnos, cada Jefe da una pista de UNA palabra y un número, y sus agentes tocan las palabras que creen suyas. El primero que descubre todas las suyas gana; pero quien toque al asesino, pierde en el acto. La app hace de tablero secreto: solo los Jefes ven los colores.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 De qué va',
    items: [
      'Dos equipos (rojo y azul) compiten sobre un tablero de 25 palabras. Cada equipo tiene un JEFE de espías; el resto son agentes.',
      'Solo los Jefes ven el MAPA secreto: qué palabras son de su equipo, del rival, neutrales y cuál es el ASESINO. Los agentes solo ven las 25 palabras.',
      'Gana el equipo que primero destapa TODAS sus palabras. Pero cuidado: si tu equipo toca la palabra del asesino, perdéis en el acto. La app custodia el mapa y lo revela solo a los Jefes.',
    ],
  },
  {
    heading: '🗺️ El reparto',
    items: [
      'Jugáis de 4 a 16 personas. La app reparte los equipos casi a la par y designa un Jefe por equipo (lo veréis en vuestra carta). El equipo que empieza tiene 9 palabras; el otro, 8. Hay 7 neutrales y 1 asesino.',
      'Colocaos de modo que los agentes NO vean la pantalla de su Jefe: ahí está el mapa con los colores. Con el botón 🎴 podéis volver a mirar vuestro papel y la chuleta de colores cuando queráis.',
    ],
  },
  {
    heading: '💬 La pista del Jefe',
    items: [
      'En su turno, el Jefe da EN VOZ ALTA una pista de UNA sola palabra y un número: la palabra relaciona varias casillas suyas; el número dice cuántas. Por ejemplo «fuego: 2».',
      'En la app, el Jefe introduce la pista y el número y la confirma. No puede hacer gestos ni dar más pistas: solo esa palabra y ese número. La app rechaza dos palabras juntas y cualquier palabra que esté en el tablero, que son jugadas prohibidas.',
      'Dos números especiales: el 0 avisa de que NINGUNA casilla suya se relaciona con esa palabra (útil para alejar a los tuyos de una trampa) y el ∞ sirve para seguir con las que quedaron pendientes de pistas anteriores. Con los dos, el equipo puede tocar sin límite hasta fallar o pasar.',
      'Si el Jefe de turno se queda sin batería o se marcha, cualquiera puede saltarle el turno desde el menú ⋯ pasado un rato: la partida no se queda muerta.',
    ],
  },
  {
    heading: '👉 Los agentes tocan',
    items: [
      'Los agentes de ese equipo debaten y van destapando palabras del tablero, una a una. Tocar una palabra solo la SELECCIONA: se destapa al confirmarla abajo, para que un roce no cueste la partida.',
      'Cada palabra revela su color: si es de vuestro equipo, ¡seguid!; podéis destapar hasta el número de la pista MÁS una.',
      'Si destapáis una neutral (un «transeúnte» ⬜), el turno pasa al rival. Si destapáis una del rival, se la regaláis y el turno pasa. Y si destapáis al ASESINO 💀, perdéis la partida al instante.',
      'Debéis destapar al menos UNA palabra por turno (regla oficial); a partir de ahí, «🤐 Pasar el turno» cuando no queráis arriesgar más.',
    ],
  },
  {
    heading: '🏆 Ganar y puntuar',
    items: [
      'Los turnos se alternan entre los dos equipos hasta que uno destapa todas sus palabras (gana), alguien topa con el asesino (pierde su equipo) o un equipo destapa la ÚLTIMA casilla que le quedaba al rival: se la regala y el rival gana ahí mismo.',
      'Al terminar, TODOS veis el mapa completo destapado: podéis comentar la jugada y ver de qué os habéis librado.',
      'Cada miembro del equipo ganador suma 1 punto. En «🔁 Otra partida» se reparten equipos, Jefes, tablero y mapa NUEVOS, pero el marcador de puntos no se borra: se acumula mientras la mesa siga jugando.',
      'La app lleva la cuenta de casillas restantes y anuncia cada jugada en voz alta (nunca el mapa oculto).',
    ],
  },
];

// ——— Voz del narrador ———

export const CN_INTRO =
  'Codenames. Dos equipos y veinticinco palabras. Cada Jefe de espías ve el mapa en su móvil y guía a los suyos con una pista de una palabra y un número. El primero en descubrir todas las suyas gana… pero quien toque al asesino, pierde. Jefes, mirad el mapa; agentes, solo las palabras.';

// Los turnos, las pistas y el desenlace NO tienen frase propia aquí: el diario
// ya los redacta para oírse (engine.ts) y el narrador lo locuta tal cual, así
// que pantalla y voz dicen exactamente lo mismo, sin dos redacciones que
// mantener. Aquí solo queda lo que la voz dice y la pantalla no.

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

export function allCodenamesStaticPieces(): string[] {
  return [CN_INTRO, ...helpPieces()];
}

/** Fila de la chuleta del tablero (mismo trato que RefRows del shell). */
export interface BoardRefRow { emoji: string; name: string; note?: string; desc: string }

/**
 * Chuleta del tablero: qué es cada color y cómo funciona la pista. Vive aquí
 * porque se enseña en DOS sitios —el modal 🎴 y, plegada, dentro del propio
 * panel de acción— y nadie debería salir de la pantalla en la que decide.
 */
export function boardRef(game: CodenamesState): BoardRefRow[] {
  return [
    { emoji: '🔴', name: 'Casillas rojas', note: `quedan ${game.remaining.red}`, desc: 'Las del equipo rojo: destapadlas todas para ganar.' },
    { emoji: '🔵', name: 'Casillas azules', note: `quedan ${game.remaining.blue}`, desc: 'Las del equipo azul.' },
    { emoji: '⬜', name: 'Transeúntes (neutrales)', note: '7 en el tablero', desc: 'Destapar una corta el turno de tu equipo.' },
    { emoji: '💀', name: 'El Asesino', note: '1 en el tablero', desc: 'Destaparla hace PERDER a tu equipo al instante.' },
    { emoji: '💬', name: 'La pista', desc: 'UNA palabra + un número: el equipo destapa hasta número+1 casillas (con 0 o ∞, sin límite). No vale una palabra del tablero.' },
    { emoji: '👉', name: 'Destapar', desc: 'Tocar una palabra la selecciona; se destapa al confirmarla abajo. Al menos una por turno; luego ya se puede pasar.' },
  ];
}

export function lastLogLine(game: CodenamesState): string {
  const l = game.log[game.log.length - 1];
  return l ? l.txt.replace(/^[^\p{L}\d]+/u, '').trim() : '';
}
