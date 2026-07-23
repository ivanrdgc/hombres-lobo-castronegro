// Corpus de «Coup»: intro del lobby (▶️), «cómo se juega» por apartados y la voz
// del narrador. Las influencias OCULTAS no se dicen jamás; el narrador solo
// relata lo público (turnos, acciones declaradas, desafíos, bloqueos, cartas
// descubiertas y el ganador) — que es justo lo que va al diario.
import type { CoupState } from './types';

// ——— Lobby ———

export const INTRO_LOBBY: string[] = [
  'Coup: estáis en una corte podrida y cada uno esconde dos cartas de influencia. En tu turno haces una jugada —cobrar impuestos, robar, asesinar, dar un golpe de Estado…— diciendo ser un personaje que te lo permite. Puedes decir la verdad… o marcarte un farol.',
  'Cualquiera puede DESAFIAR tu farol: si mentías, pierdes una carta; si decías la verdad, el que dudó la pierde él. Y muchas jugadas se pueden BLOQUEAR diciendo tener el personaje que las corta. Quien se queda sin cartas, fuera. El último en pie gana. Partidas rápidas y muy tramposas.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 De qué va',
    items: [
      'Cada jugador empieza con 2 cartas de influencia boca abajo (secretas) y 2 monedas. Perder una influencia es descubrir una carta: quien pierde las dos, queda eliminado. Gana el último que conserve alguna.',
      'La gracia: para muchas acciones dices SER un personaje… lo tengas o no. La app custodia las cartas y la corte, y resuelve los desafíos y bloqueos sin que nadie tenga que enseñar nada de más.',
    ],
  },
  {
    heading: '🪙 Acciones básicas (sin personaje)',
    items: [
      'Renta: coge 1 moneda. Nadie puede impedirlo.',
      'Ayuda exterior: coge 2 monedas. Cuidado: quien diga tener el Duque puede bloquearla.',
      'Golpe de Estado: paga 7 monedas y elige víctima; pierde una influencia sí o sí. No se puede desafiar ni bloquear. Con 10 o más monedas estás OBLIGADO a dar un golpe.',
    ],
  },
  {
    heading: '🎭 Acciones de personaje',
    items: [
      'Duque 🎩: cobra Impuestos (+3 monedas).',
      'Asesino 🗡️: paga 3 y asesina; la víctima pierde una influencia.',
      'Capitán ⚓: roba 2 monedas a otro jugador.',
      'Embajador 🎭: intercambia cartas con la corte (roba 2, te quedas las que quieras).',
      'Al declararlas dices tener ese personaje. Si nadie te desafía, la jugada sigue adelante… tengas la carta o no.',
    ],
  },
  {
    heading: '❗ Desafíos',
    items: [
      'Cuando alguien declara una acción de personaje (o un bloqueo), cualquier otro puede DESAFIARLO.',
      'Si el desafiado tenía el personaje, lo enseña, lo devuelve a la corte y roba otro; el que dudó pierde una influencia. Si NO lo tenía, era un farol: pierde una influencia y su jugada se cae.',
      'Ojo con el Asesino: si te asesinan, desafías y pierdes, te llevas dos golpes (el del desafío y el del asesinato) y quedas fuera de una tacada.',
    ],
  },
  {
    heading: '🛡️ Bloqueos',
    items: [
      'La Ayuda exterior la bloquea el Duque. El Robo lo bloquean el Capitán o el Embajador. El Asesinato lo bloquea la Condesa.',
      'Bloquear también es decir tener ese personaje: puede ser un farol, y por tanto también se puede desafiar. Solo la víctima bloquea el robo o el asesinato; la ayuda exterior la bloquea cualquiera.',
    ],
  },
  {
    heading: '🏆 Ganar',
    items: [
      'Se juega por turnos alrededor de la mesa. Vas gastando y ganando monedas, faroleando y cazando faroles, hasta que solo quede alguien con influencia: ese gana la partida.',
      'La app lleva la cuenta de monedas, cartas y turnos, y anuncia en voz alta lo que pasa (nunca tus cartas ocultas). Jugad las partidas que queráis; se guarda el marcador.',
    ],
  },
];

// ——— Voz del narrador ———

// El grueso de la voz son las líneas del diario (con nombres → síntesis en
// vivo). Esta pieza fija se pregenera como clip para arrancar la partida.
export const COUP_INTRO =
  'Coup. Cada uno esconde dos influencias. En vuestro turno declaráis una jugada, diciendo ser un personaje; los demás pueden creeros… o desafiar el farol. El último en pie se queda con la corte. Mirad vuestras cartas.';

/** Piezas SIN nombres: se pregeneran como clips. El resto (diario con nombres)
 *  va por síntesis en vivo, donde la pequeña latencia no delata nada. */
export function allCoupStaticPieces(): string[] {
  return [COUP_INTRO];
}

/** Última línea del diario (la que el narrador locuta cuando cambia el estado). */
export function lastLogLine(game: CoupState): string {
  const l = game.log[game.log.length - 1];
  return l ? l.txt.replace(/^[^\p{L}\d]+/u, '').trim() : '';
}
