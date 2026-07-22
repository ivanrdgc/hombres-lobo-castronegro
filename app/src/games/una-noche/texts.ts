// Corpus de voz del narrador de «Una Noche en Castronegro». Una locución por
// pieza (sin las variantes deterministas de Los Hombres Lobo: el juego es
// corto y la gracia está en el orden de llamadas). Todas las piezas son
// estáticas → se pregeneran como clips (allUnaNocheStaticPieces).
import type { StepId, WinnerId } from './types';

export const WELCOME =
  'Bienvenidos a Castronegro… solo por esta noche. Mirad vuestra carta en secreto, memorizadla y confirmad. Recordad: alguien podría cambiárosla mientras dormís.';

// Textos de LOBBY para leer en voz alta en el propio dispositivo (▶️), como en
// el juego original. Se sintetizan en runtime (no son clips pregenerados).
export const INTRO_LOBBY: string[] = [
  'Una sola noche. Los roles se despiertan por turnos y, a oscuras, miran y se roban e intercambian las cartas unos a otros: al amanecer puede que ya no seas quien empezaste… y quizá ni lo sepas.',
  'De día se debate una sola vez y todos señalan a la vez a quien creen hombre lobo. Gana el Pueblo si cae un lobo; ganan los Lobos si ninguno cae; y el Curtidor gana si logra que lo linchen a él.',
];
export const HOWTO: string[] = [
  'Se reparte una carta a cada jugador y quedan tres en el centro.',
  'De noche, la voz llama a cada rol en su orden: miran y, algunos, roban o intercambian cartas entre los jugadores.',
  'Importante: cada jugador actúa según la carta que le TOCÓ al empezar la noche, aunque luego se la roben o se la cambien. Por eso, si el Ladrón te roba tu carta, tú sigues despertando y actuando con tu rol original; y quien se queda tu carta no actúa por ti.',
  'Al amanecer nadie ha muerto, pero puede que ya no seas quien empezaste. Se debate una vez y todos votan a la vez.',
  'Gana el Pueblo si cae al menos un hombre lobo; ganan los Lobos si no cae ninguno; y el Curtidor gana en solitario si consigue que lo linchen.',
];

export const LISTOS =
  'Todos conocéis ya vuestra carta. Cuando el pueblo esté listo, que caiga la noche.';

export const NIGHT_FALL =
  'Cae la noche sobre Castronegro. Cerrad todos los ojos… y que empiece el baile de las cartas.';

// Llamada de cada rol de noche (abrir los ojos + instrucción, SIN el «cerrad
// los ojos»: ese va aparte, DESPUÉS de que la acción termine). Suena IGUAL
// exista o no ese rol (si está en el centro, nadie abre los ojos): el tiempo
// no delata qué hay fuera.
export const STEP_CALL: Partial<Record<StepId, string>> = {
  doble: 'El Doble, abre los ojos. Mira la carta de otro jugador: te conviertes en ese rol. Si ese rol actúa ahora, hazlo también.',
  lobos: 'Hombres lobo, abrid los ojos y reconoceos. Si eres el único lobo, puedes mirar una carta del centro.',
  esbirro: 'Esbirro del mal, abre los ojos: los hombres lobo te mostrarán quiénes son.',
  masones: 'Masones, abrid los ojos y reconoceos entre vosotros.',
  vidente: 'Vidente, abre los ojos. Mira la carta de un jugador… o dos cartas del centro.',
  ladron: 'Ladrón, abre los ojos. Puedes cambiar tu carta por la de otro jugador y mirar tu nueva carta.',
  alborotadora: 'Alborotadora, abre los ojos. Intercambia las cartas de otros dos jugadores, sin mirarlas.',
  borracho: 'Borracho, abre los ojos. Cambia tu carta por una del centro… sin mirarla.',
  insomne: 'Insomne, abre los ojos y mira tu propia carta, no vaya a ser que ya no seas quien eras.',
};

// «Cerrad los ojos» de cada rol: se dice DESPUÉS de que su acción termine (o,
// en un paso fantasma, tras la espera), nunca dentro de la llamada.
export const STEP_CLOSE: Partial<Record<StepId, string>> = {
  doble: 'El Doble, vuelve a cerrar los ojos.',
  lobos: 'Hombres lobo, cerrad los ojos.',
  esbirro: 'Esbirro, cierra los ojos.',
  masones: 'Masones, cerrad los ojos.',
  vidente: 'Vidente, cierra los ojos.',
  ladron: 'Ladrón, cierra los ojos.',
  alborotadora: 'Alborotadora, cierra los ojos.',
  borracho: 'Borracho, cierra los ojos.',
  insomne: 'Insomne, cierra los ojos… y con eso, Castronegro entero duerme.',
};

export const DAWN = 'Castronegro, abrid todos los ojos. Ha amanecido, y alguien entre vosotros no es quien dice ser.';

export const DEBATE =
  'Es de día. Debatid: ¿quién esconde colmillos? Cuando el pueblo lo tenga claro, que una persona registre a quién condena… o si preferís perdonar y que no muera nadie.';

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
    ...Object.values(STEP_CLOSE).filter((t): t is string => !!t),
    ...Object.values(END),
  ];
}
