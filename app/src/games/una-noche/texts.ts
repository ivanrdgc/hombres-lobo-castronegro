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
export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🌘 De qué va',
    items: [
      'Una SOLA noche y un SOLO día. De noche, los roles se despiertan por turnos y, a oscuras, miran, roban o intercambian cartas entre unos y otros. Al amanecer nadie ha muerto… pero puede que ya no seas quien empezaste, y quizá ni lo sepas.',
      'De día se debate una vez y el pueblo condena a alguien. Gana el PUEBLO si cae al menos un hombre lobo; ganan los LOBOS si no cae ninguno; y el CURTIDOR gana en solitario si logra que lo linchen a él.',
      'Lo que decide todo es tu carta FINAL (la que tengas al acabar la noche), no la del principio.',
    ],
  },
  {
    heading: '🎴 El reparto',
    items: [
      'La app reparte una carta a cada jugador y deja TRES en el centro, boca abajo. Cada uno mira la suya a solas y la confirma.',
      'Memorízala bien: durante la noche alguien puede cambiártela sin que te enteres. Por eso solo se te muestra tu carta INICIAL, con el aviso de que pudo cambiar.',
      'El mazo (qué roles y cuántos) se elige en el lobby y siempre suma jugadores + 3 cartas de centro.',
    ],
  },
  {
    heading: '🌙 La noche, paso a paso',
    items: [
      'La voz llama a cada rol EN SU ORDEN. Solo quien es llamado abre los ojos, actúa en su pantalla con disimulo y vuelve a cerrarlos.',
      'REGLA DE ORO: actúas según la carta que te TOCÓ al empezar, aunque luego te la roben o cambien. Si el Ladrón te roba tu carta, tú sigues despertando y actuando con tu rol original; quien se queda tu carta NO actúa por ti.',
      'Los roles que NO se repartieron (están en el centro) también se llaman: es un turno «fantasma» para que el tiempo no delate qué hay fuera. Si eres tú quien no está, no pasa nada: nadie abre los ojos.',
      'Cada rol hace lo suyo: unos MIRAN cartas (Vidente, Insomne, el lobo solitario…), otros las INTERCAMBIAN (Ladrón, Alborotadora, Borracho) y otros solo se RECONOCEN (lobos, masones). Toca cada ficha de abajo para el detalle.',
    ],
  },
  {
    heading: '☀️ El día y la votación',
    items: [
      'Amanece y se abren los ojos. Se debate una vez: ¿quién esconde colmillos? Cuando el pueblo lo tenga claro, UNA persona registra la decisión en la app (como en Los Hombres Lobo), y es definitiva.',
      'Se puede condenar a uno, PERDONAR (que no muera nadie) o, si hubo EMPATE, señalar a varios a la vez: en One Night, en un empate mueren TODOS los empatados.',
      'Si el condenado resulta ser el Cazador (por su carta final), su flecha se lleva a alguien más antes de acabar.',
    ],
  },
  {
    heading: '🏆 Cómo se gana',
    items: [
      'Todo se calcula por la carta FINAL de cada uno. Gana el Pueblo si entre los condenados cae al menos un hombre lobo.',
      'Ganan los Lobos si hay lobos en juego y ninguno cae. Si no hay lobos en la mesa (todos en el centro) y no muere nadie, también gana el Pueblo (acertó al no linchar).',
      'El Curtidor gana SOLO si lo linchan a él. Puede haber varios ganadores a la vez (p. ej. Curtidor + Pueblo).',
    ],
  },
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

// RE-llamada de un rol que tarda: se dice si tras la llamada nadie confirma en
// unos segundos (como haría un narrador humano al ver a alguien dudar). Suena
// IGUAL exista o no el rol (fantasma), así que nunca revela si hay alguien.
// NO repite «abrid los ojos» (ya están abiertos): solo empuja a terminar.
export const STEP_NAG: Partial<Record<StepId, string>> = {
  doble: 'El Doble, cuando hayas copiado tu carta, vuelve a cerrar los ojos.',
  lobos: 'Hombres lobo, cuando os hayáis reconocido, cerrad los ojos.',
  esbirro: 'Esbirro, cuando tengas tu información, cierra los ojos.',
  masones: 'Masones, cuando os hayáis reconocido, cerrad los ojos.',
  vidente: 'Vidente, tómate tu tiempo… y cuando termines de mirar, cierra los ojos.',
  ladron: 'Ladrón, decídete: roba una carta o no, y luego cierra los ojos.',
  alborotadora: 'Alborotadora, haz tu intercambio —o déjalo— y cierra los ojos.',
  borracho: 'Borracho, coge tu carta del centro y cierra los ojos.',
  insomne: 'Insomne, echa un último vistazo a tu carta y cierra los ojos.',
};

// Recordatorio genérico si la cosa se alarga aún más: alguien pudo quedarse
// dormido u olvidar su rol. Vale para todos y no delata nada (rota entre estas).
export const NAG_FORGOT: string[] = [
  '¿Alguien se ha quedado dormido? Recordad bien qué carta os tocó al empezar… y, si os toca actuar ahora, hacedlo con calma.',
  'Sin prisa, pero sin pausa. Quien deba actuar en este turno, que lo haga y vuelva a cerrar los ojos.',
];

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
    ...Object.values(STEP_NAG).filter((t): t is string => !!t),
    ...NAG_FORGOT,
    ...Object.values(END),
  ];
}
