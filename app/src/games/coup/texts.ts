// Corpus de «Coup»: intro del lobby (▶️), «cómo se juega» por apartados y la voz
// del narrador. Las influencias OCULTAS no se dicen jamás; el narrador solo
// relata lo público (turnos, acciones declaradas, desafíos, bloqueos, cartas
// descubiertas y el ganador) — que es justo lo que va al diario.
import { cleanForSpeech } from '../../core/util/speech';
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
      'Cada jugador tiene 2 cartas de influencia SECRETAS y monedas. Perder una influencia es descubrir para siempre una de tus cartas; quien descubre las dos queda ELIMINADO. Gana el último que conserve alguna.',
      'La gracia: las mejores jugadas pertenecen a personajes, y para usarlas basta con DECIR que tienes ese personaje… lo tengas o no. Los demás deciden si tragarse el farol o desafiarte.',
      'La app custodia las cartas y la corte (el mazo), resuelve desafíos y bloqueos, mueve las monedas y va cantando cada jugada; tus cartas ocultas no las ve ni las dice nadie.',
    ],
  },
  {
    heading: '🎴 El reparto',
    items: [
      'Al empezar, toca «👁 Ver mis influencias», míralas A SOLAS y pulsa «✅ Lo tengo». Cuando todos confirman, cualquiera pulsa «▶️ Todos listos» y arranca el primer turno.',
      'Empiezas con 2 monedas. En el tablero, las influencias perdidas se ven boca arriba; de las ocultas solo se ve el dorso: todos saben CUÁNTAS te quedan, nunca cuáles son.',
    ],
  },
  {
    heading: '🎬 Tu turno',
    items: [
      'Cuando te toca, tu móvil te ofrece SOLO las jugadas que puedes pagar: eliges una (y su víctima, si la lleva) y la app la anuncia a toda la mesa.',
      'Con 10 monedas o más estás OBLIGADO a dar un Golpe de Estado: la app no te dejará otra cosa.',
      'Declarar no es resolver: salvo la Renta y el Golpe (inmediatos), la jugada queda EN EL AIRE mientras los demás reaccionan (ver «La ventana de reacción»).',
    ],
  },
  {
    heading: '🪙 Acciones que no piden personaje',
    items: [
      'Renta: +1 moneda. Nadie puede impedirla.',
      'Ayuda exterior: +2 monedas… pero CUALQUIERA puede bloquearla diciendo tener al Duque.',
      'Golpe de Estado: pagas 7, eliges víctima y pierde una influencia SÍ O SÍ: ni se desafía ni se bloquea.',
    ],
  },
  {
    heading: '🎭 Acciones de personaje',
    items: [
      '🎩 Duque — Impuestos: +3 monedas.',
      '🗡️ Asesino — Asesinar: pagas 3 y la víctima pierde una influencia (salvo que la salve la Condesa).',
      '⚓ Capitán — Robar: quitas 2 monedas a quien elijas.',
      '🎭 Embajador — Intercambiar: robas 2 cartas de la corte y eliges con cuáles te quedas (tantas como influencias ocultas te queden); el resto vuelve barajado.',
      'Declararlas es DECIR que tienes ese personaje. Si nadie te desafía, la jugada sale adelante aunque fuera mentira. El coste (asesinar, golpe) se paga al declarar y NO se devuelve.',
    ],
  },
  {
    heading: '❗ La ventana de reacción',
    items: [
      'Cuando alguien declara una jugada de personaje, a los demás les aparecen botones: «❗ Desafiar» o «👍 Paso». La jugada no avanza hasta que todos pasan… o alguien desafía.',
      'El desafío se resuelve al momento: si el desafiado TENÍA el personaje, lo enseña, lo devuelve a la corte y roba otra carta — y quien dudó pierde una influencia. Si NO lo tenía, el farol le cuesta una influencia y su jugada se cae.',
      'Regla fina (oficial): aunque el desafío fracase, la víctima del asesinato o del robo CONSERVA su opción de bloquear. Pero cuidado: desafiar un asesinato siendo la víctima es jugarse las dos cartas de una tacada si además falla tu bloqueo.',
    ],
  },
  {
    heading: '🛡️ Bloqueos',
    items: [
      'La víctima puede pulsar «🛡️ Bloquear»: el asesinato lo corta la Condesa; el robo, el Capitán o el Embajador; y la ayuda exterior la bloquea CUALQUIERA con el Duque.',
      'Bloquear es otra declaración —puede ser farol— y abre su propia ventana para desafiarlo. Si el bloqueo aguanta, la jugada original se anula; si el bloqueador mentía, pierde una influencia y la jugada se ejecuta.',
    ],
  },
  {
    heading: '💥 Perder influencia y ganar',
    items: [
      'Cuando te toca perder una influencia y aún tienes las dos, tu móvil te pide elegir CUÁL descubres; si solo te queda una, cae sola. Lo descubierto queda a la vista de todos: esa información es oro.',
      'El último jugador con influencia gana la partida. El marcador se guarda entre partidas: revancha con «🔁 Otra partida».',
    ],
  },
];

// ——— Voz del narrador ———

// El grueso de la voz son las líneas del diario (con nombres → síntesis en
// vivo). Esta pieza fija se pregenera como clip para arrancar la partida.
export const COUP_INTRO =
  'Coup. Cada uno esconde dos influencias. En vuestro turno declaráis una jugada, diciendo ser un personaje; los demás pueden creeros… o desafiar el farol. El último en pie se queda con la corte. Mirad vuestras cartas.';

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

/** Piezas SIN nombres: se pregeneran como clips. El resto (diario con nombres)
 *  va por síntesis en vivo, donde la pequeña latencia no delata nada. */
export function allCoupStaticPieces(): string[] {
  return [COUP_INTRO, ...helpPieces()];
}

/** Última línea del diario (la que el narrador locuta cuando cambia el estado). */
export function lastLogLine(game: CoupState): string {
  const l = game.log[game.log.length - 1];
  return l ? l.txt.replace(/^[^\p{L}\d]+/u, '').trim() : '';
}
