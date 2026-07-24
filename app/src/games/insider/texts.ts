// Corpus de «Insider»: intro del lobby (▶️), «cómo se juega» por apartados y la
// voz del narrador. La PALABRA secreta NUNCA se dice en voz alta; el Maestro sí
// es público (la voz lo anuncia por su nombre).
import { cleanForSpeech } from '../../core/util/speech';
import type { InsiderState } from './types';

// ——— Lobby ———

export const INTRO_LOBBY: string[] = [
  'Insider: el equipo tiene que adivinar una palabra secreta a base de preguntas de sí o no, contrarreloj. Uno de vosotros, el Maestro, la conoce y responde con la verdad. Y hay un infiltrado: el Insider, que también la conoce y empuja al grupo hacia ella… sin que se le note.',
  'Si adivináis la palabra a tiempo, os queda cazar al Insider con un voto. Si lo pilláis, gana el equipo; si se escurre, gana él. Y si se acaba el tiempo sin adivinar, pierden todos. Partidas de pocos minutos, muy habladas.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🕵️ De qué va',
    items: [
      'Insider es un juego cooperativo… con un traidor. El EQUIPO debe adivinar una palabra secreta haciendo preguntas de sí/no; el MAESTRO la conoce y responde con la verdad; y el INSIDER, oculto entre el equipo, también la conoce y trata de que la adivinen guiándoos con disimulo.',
      'Gana el EQUIPO (Maestro y comunes) si adivináis la palabra a tiempo Y luego desenmascaráis al Insider. Gana el INSIDER si, adivinada la palabra, la mesa NO lo señala. Y si el tiempo se agota sin adivinar la palabra, PIERDEN TODOS, Insider incluido.',
      'La app hace de máster oculto: elige la palabra, reparte los papeles (el Insider en secreto), lleva el reloj y cuenta el voto. Nadie apunta nada a mano.',
    ],
  },
  {
    heading: '🎴 El reparto',
    items: [
      'Cada ronda, la app designa un MAESTRO (es público: la voz lo dice, y todos lo veis en pantalla). El Maestro rota cada ronda.',
      'En su carta privada, cada jugador ve su papel. El Maestro y el Insider ven además la PALABRA secreta. Los comunes solo ven que son del equipo y que no la conocen.',
      'Miradlo a solas y confirmad. Nadie más debe ver vuestra pantalla: que sois el Insider (o no) es secreto hasta el final.',
    ],
  },
  {
    heading: '⏱️ El interrogatorio',
    items: [
      'Cuando todos han confirmado, el Maestro pone el reloj en marcha (3, 5 u 8 minutos, a elegir). Empieza preguntando quien indique la app.',
      'El equipo hace preguntas de SÍ o NO para acorralar la palabra: «¿es un animal?», «¿cabe en una mano?». El Maestro solo puede responder «sí», «no» o «no lo sé». No da pistas ni la nombra.',
      'El INSIDER hace lo mismo que los demás, pero sabiendo la respuesta: su arte es orientar las preguntas hacia la palabra sin cantarse. Si el equipo se atasca, le interesa echar un cable… con cuidado.',
    ],
  },
  {
    heading: '✅ Adivinada la palabra',
    items: [
      'En cuanto alguien dice la palabra correcta en voz alta, el Maestro pulsa «¡Adivinada!»: el reloj se para y el equipo ha superado la primera parte.',
      'Si el reloj llega a cero sin que nadie la diga, la ronda termina de golpe: pierden todos (también el Insider). El Insider gana solo si la palabra se adivina y además él se escapa.',
    ],
  },
  {
    heading: '👉 La caza del Insider',
    items: [
      'Adivinada la palabra, se abre un breve debate: ¿quién orientaba las preguntas con demasiada puntería? Luego TODOS votan a la vez, en secreto (también el Maestro).',
      'No puedes votarte a ti mismo ni al Maestro (es público, no puede ser el Insider). La app destapa el recuento: si el más señalado es el Insider, lo habéis cazado; si señaláis a un inocente o hay empate en cabeza, el Insider escapa.',
    ],
  },
  {
    heading: '🏆 Puntos (varias rondas)',
    items: [
      'Insider cazado: +1 para el Maestro y para cada común. Insider que escapa (con la palabra adivinada): +2 para él.',
      'Tiempo agotado sin adivinar: nadie puntúa. El Maestro rota y la palabra no se repite hasta agotarse; jugad las rondas que queráis.',
    ],
  },
];

// ——— Voz del narrador (piezas estáticas: se pregeneran como clips) ———

export const INSIDER_INTRO =
  'Insider. Uno de vosotros conoce la palabra y responde con la verdad; entre los demás se esconde el Insider, que también la sabe y os empujará hacia ella sin delatarse. Mirad vuestra carta y que nadie vea la pantalla ajena.';

export const QUESTION_START =
  'El reloj corre. Preguntad de sí o no para cercar la palabra; el Maestro responde sí, no o no lo sé, y jamás la nombra.';

export const GUESSED_LINE =
  '¡Palabra adivinada! Ahora lo importante: entre vosotros hubo un Insider guiando la conversación. Debatid y señaladlo en secreto.';

export const VOTE_HINT = 'Cuando lo tengáis, cada uno señala a un sospechoso. No vale el Maestro ni uno mismo.';

export const TIMEOUT_LINE =
  'Se acabó el tiempo y la palabra sigue oculta. En Insider, si el equipo no adivina, pierden todos… empezando por el propio Insider, que no supo llevaros a tiempo.';

export const WARN_HALF = 'Mitad del tiempo.';
export const WARN_MIN = 'Un minuto.';
export const WARN_10S = 'Diez segundos.';

// ——— Líneas dinámicas (nombres → síntesis en vivo, nunca la palabra) ———

export function masterLine(name: string): string {
  return `El Maestro de esta ronda es ${name}: conoce la palabra y solo él responde.`;
}
export function starterLine(name: string): string {
  return `Empieza preguntando ${name}.`;
}
export function outcomeSpeech(game: InsiderState): string {
  const nm = (pid: string) => game.names[pid] || 'alguien';
  if (game.outcome === 'group') return `El Insider era ${nm(game.insiderId)}, y lo habéis cazado. Gana el equipo.`;
  if (game.outcome === 'insider') return `Nadie lo vio: ${nm(game.insiderId)} era el Insider y se escapa tras llevaros hasta la palabra. Suya es la ronda.`;
  return `El Insider era ${nm(game.insiderId)}. Se acabó el tiempo sin dar con la palabra: esta vez no gana nadie.`;
}

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

/** Piezas SIN nombres ni palabra: se pregeneran como clips (el resto va por
 *  síntesis en vivo, donde la latencia no delata nada). */
export function allInsiderStaticPieces(): string[] {
  return [INSIDER_INTRO, QUESTION_START, GUESSED_LINE, VOTE_HINT, TIMEOUT_LINE, WARN_HALF, WARN_MIN, WARN_10S, ...helpPieces()];
}
