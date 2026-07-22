// Corpus de voz del narrador de «Una Noche en Castronegro». Una locución por
// pieza (sin las variantes deterministas de Los Hombres Lobo: el juego es
// corto y la gracia está en el orden de llamadas). Todas las piezas son
// estáticas → se pregeneran como clips (allUnaNocheStaticPieces).
import type { StepId, WinnerId } from './types';

export const WELCOME =
  'Bienvenidos a Castronegro… solo por esta noche. Mirad vuestra carta en secreto, memorizadla y confirmad. Recordad: alguien podría cambiárosla mientras dormís.';

export const LISTOS =
  'Todos conocéis ya vuestra carta. Cuando el pueblo esté listo, que caiga la noche.';

export const NIGHT_FALL =
  'Cae la noche sobre Castronegro. Cerrad todos los ojos… y que empiece el baile de las cartas.';

// Llamada de cada rol de noche. Suena IGUAL exista o no ese rol en la mesa (si
// está en el centro, nadie abre los ojos): el tiempo no delata qué hay fuera.
export const STEP_CALL: Partial<Record<StepId, string>> = {
  doble: 'El Doble, abre los ojos. Mira la carta de otro jugador: te conviertes en ese rol. Si ese rol actúa ahora, hazlo. Cierra los ojos.',
  lobos: 'Hombres lobo, abrid los ojos y reconoceos. Si eres el único lobo, puedes mirar una carta del centro. Volved a cerrar los ojos.',
  esbirro: 'Esbirro del mal, abre los ojos: los hombres lobo te mostrarán quiénes son. Cierra los ojos.',
  masones: 'Masones, abrid los ojos y reconoceos entre vosotros. Cerrad los ojos.',
  vidente: 'Vidente, abre los ojos. Mira la carta de un jugador… o dos cartas del centro. Cierra los ojos.',
  ladron: 'Ladrón, abre los ojos. Puedes cambiar tu carta por la de otro jugador y mirar tu nueva carta. Cierra los ojos.',
  alborotadora: 'Alborotadora, abre los ojos. Intercambia las cartas de otros dos jugadores, sin mirarlas. Cierra los ojos.',
  borracho: 'Borracho, abre los ojos. Cambia tu carta por una del centro… sin mirarla. Cierra los ojos.',
  insomne: 'Insomne, abre los ojos y mira tu propia carta, no vaya a ser que ya no seas quien eras. Cierra los ojos.',
};

export const DAWN = 'Castronegro, abrid todos los ojos. Ha amanecido, y alguien entre vosotros no es quien dice ser.';

export const DEBATE =
  'Es de día. Debatid: ¿quién esconde colmillos? Cuando estéis listos, a la de tres, señalad todos a la vez al que queráis eliminar… y registrad el voto en la pantalla.';

export const END: Record<WinnerId, string> = {
  pueblo: 'Se acabó. El pueblo respira: gana el Pueblo de Castronegro.',
  lobos: 'Se acabó. Los aullidos celebran en la noche: ganan los Hombres Lobo.',
  tanner: 'Se acabó. El Curtidor sonríe por fin desde el otro barrio: gana él, y solo él.',
  nadie: 'Se acabó… y esta vez no gana nadie. Castronegro se queda con la duda.',
};

/** Todas las piezas estáticas del juego (para pregenerar clips en la F6). */
export function allUnaNocheStaticPieces(): string[] {
  return [
    WELCOME, LISTOS, NIGHT_FALL, DAWN, DEBATE,
    ...Object.values(STEP_CALL).filter((t): t is string => !!t),
    ...Object.values(END),
  ];
}
