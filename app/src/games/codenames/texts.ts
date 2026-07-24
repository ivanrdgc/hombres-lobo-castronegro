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
      'La app reparte los equipos casi a la par y designa un Jefe por equipo (lo veréis en vuestra carta). El equipo que empieza tiene 9 palabras; el otro, 8. Hay 7 neutrales y 1 asesino.',
      'Colocaos de modo que los agentes NO vean la pantalla de su Jefe: ahí está el mapa con los colores.',
    ],
  },
  {
    heading: '💬 La pista del Jefe',
    items: [
      'En su turno, el Jefe da EN VOZ ALTA una pista de UNA sola palabra y un número: la palabra relaciona varias casillas suyas; el número dice cuántas. Por ejemplo «fuego: 2».',
      'En la app, el Jefe introduce la pista y el número (1 a 9) y la confirma. No puede hacer gestos ni dar más pistas: solo esa palabra y ese número.',
    ],
  },
  {
    heading: '👉 Los agentes tocan',
    items: [
      'Los agentes de ese equipo debaten y van tocando palabras del tablero, una a una. Cada palabra revela su color: si es de vuestro equipo, ¡seguid!; podéis tocar hasta el número de la pista MÁS una.',
      'Si tocáis una neutral (un «transeúnte» ⬜), el turno pasa al rival. Si tocáis una del rival, se la regaláis y el turno pasa. Y si tocáis al ASESINO 💀, perdéis la partida al instante.',
      'Debéis tocar al menos UNA palabra por turno (regla oficial); a partir de ahí, «🤐 Pasar el turno» cuando no queráis arriesgar más.',
    ],
  },
  {
    heading: '🏆 Ganar',
    items: [
      'Los turnos se alternan entre los dos equipos hasta que uno destapa todas sus palabras (gana) o alguien topa con el asesino (pierde su equipo).',
      'La app lleva el marcador de casillas restantes y anuncia cada jugada en voz alta (nunca el mapa oculto). Jugad las partidas que queráis; se guarda el marcador.',
    ],
  },
];

// ——— Voz del narrador ———

export const CN_INTRO =
  'Codenames. Dos equipos y veinticinco palabras. Cada Jefe de espías ve el mapa en su móvil y guía a los suyos con una pista de una palabra y un número. El primero en descubrir todas las suyas gana… pero quien toque al asesino, pierde. Jefes, mirad el mapa; agentes, solo las palabras.';

export function turnLine(team: 'red' | 'blue', spymaster: string): string {
  return `Turno del equipo ${team === 'red' ? 'rojo' : 'azul'}. El Jefe ${spymaster} prepara su pista.`;
}

export function clueLine(team: 'red' | 'blue', word: string, num: number): string {
  const w = word ? `«${word}»` : 'su pista';
  return `El Jefe ${team === 'red' ? 'rojo' : 'azul'} dice ${w}, para ${num} palabra${num === 1 ? '' : 's'}. Agentes, a tocar.`;
}

export function endLine(winner: 'red' | 'blue', reason: string): string {
  return `${winner === 'red' ? 'Gana el equipo rojo.' : 'Gana el equipo azul.'} ${reason}`;
}

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

export function allCodenamesStaticPieces(): string[] {
  return [CN_INTRO, ...helpPieces()];
}

export function lastLogLine(game: CodenamesState): string {
  const l = game.log[game.log.length - 1];
  return l ? l.txt.replace(/^[^\p{L}\d]+/u, '').trim() : '';
}
