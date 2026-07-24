// Corpus de «Good Cop Bad Cop»: intro del lobby (▶️), «cómo se juega» y voz.
// Las cartas de integridad OCULTAS no se dicen jamás; la voz relata lo público
// (investigaciones, armas, disparos y el desenlace), que va al diario.
import { cleanForSpeech } from '../../core/util/speech';
import { bandCountsLine } from './engine';
import type { GoodCopState } from './types';

/**
 * La chuleta del juego (fila «emoji · nombre · efecto»), compartida por el
 * desplegable 📖 del panel de acción y el modal 🎴: una sola redacción para las
 * dos, que antes se contradecían.
 */
export function refRows(n: number): { emoji: string; name: string; desc: string }[] {
  return [
    // El reparto NO es secreto: en la mesa real se cuentan las cartas.
    { emoji: '🧮', name: 'El reparto (público)', desc: `${bandCountsLine(n)}. Cada uno lleva SIEMPRE 2 cartas de su bando y 1 del contrario: ver dos 🦹 de alguien lo delata; una sola no prueba nada.` },
    { emoji: '👮', name: 'Honestos', desc: 'Ganan si cae el 👑 Jefe (el líder corrupto). Su líder es el 🕵️ Agente: protegedlo sin destaparlo.' },
    { emoji: '🦹', name: 'Corruptos', desc: 'Ganan si cae el 🕵️ Agente (el líder honesto). Su líder es el 👑 Jefe: que no lo encuentren.' },
    { emoji: '🔍', name: 'Investigar', desc: 'Miras EN SECRETO una carta boca abajo de otro. La mesa ve a quién y QUÉ carta miras, nunca el resultado. Puede salirte su 🕵️ o su 👑.' },
    { emoji: '🔫', name: 'Armarse → 🎯 Apuntar → 💥 Disparar', desc: 'Una acción por turno: matar cuesta TRES turnos tuyos. El arma y la diana son públicas; disparar gasta la bala, elimina al blanco y destapa sus 3 cartas.' },
    { emoji: '🏆', name: 'Fin', desc: 'En cuanto cae un líder, la partida acaba y pierde su bando entero. Quien es eliminado se queda mirando, con sus cartas boca arriba.' },
  ];
}

export const INTRO_LOBBY: string[] = [
  'Una comisaría podrida. Cada uno esconde 3 cartas de integridad y su MAYORÍA dice tu bando: 👮 honestos contra 🦹 corruptos. Entre los honestos se esconde el 🕵️ AGENTE; entre los corruptos, el 👑 JEFE.',
  'En tu turno haces UNA cosa: investigar una carta ajena en secreto, armarte, apuntar o disparar. En cuanto cae un líder, su bando pierde: habla, acusa… y no te equivoques de diana.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 De qué va',
    items: [
      'De 4 a 8 jugadores. Cada uno tiene 3 cartas de integridad boca abajo (👮 honestas o 🦹 corruptas). Tu BANDO es la mayoría de tus tres cartas; nadie más lo sabe.',
      'Entre los honestos hay un 🕵️ AGENTE y entre los corruptos un 👑 JEFE: los líderes. Ganan los honestos si cae el Jefe; ganan los corruptos si cae el Agente.',
      'El móvil se queda PLANO en la mesa y solo lo coges en tu turno: todas las pantallas son iguales y lo tuyo (cartas y lo que hayas visto) aparece únicamente al tocar el botón 🎴… y se tapa solo a los pocos segundos.',
    ],
  },
  {
    heading: '🧮 Los números (nada de esto es secreto)',
    items: [
      'Los bandos van casi a la par, y cuántos hay de cada uno se sabe desde el minuto uno: con 4 jugadores, 2 honestos y 2 corruptos; con 5, 3 y 2; con 6, 3 y 3; con 7, 4 y 3; con 8, 4 y 4.',
      'El reparto es SIEMPRE 2 cartas de tu bando y 1 del contrario. Por eso ver dos 🦹 de alguien lo delata al 100 %, y una sola carta no prueba nada: todos tenemos una del bando rival.',
      'Estos números están siempre en pantalla: en el tablero y en la chuleta del botón 🎴. No hay que memorizar nada.',
    ],
  },
  {
    heading: '🔍 Tu turno: una acción',
    items: [
      'En tu turno eliges UNA acción en tu móvil: INVESTIGAR (miras a solas una carta boca abajo de otro), ARMARTE (coges una pistola), APUNTAR (eliges blanco) o DISPARAR (al que tienes apuntado).',
      'Hay un orden obligatorio: para apuntar tienes que ir armado, y para disparar tienes que tener a alguien apuntado. Es decir: armarte, apuntar y disparar son TRES turnos tuyos, y la mesa ve venir los dos primeros. Ese retraso es el ritmo del juego.',
      'Investigar es tu radar: todos ven a quién investigas y qué carta suya miras, pero el resultado se abre solo en TU 🎴 —y queda ahí guardado hasta el final—. Armarte y apuntar son públicos: la mesa ve el arma y la diana, y eso ya es presión.',
    ],
  },
  {
    heading: '💥 Disparar',
    items: [
      'Disparar gasta la bala (tendrás que volver a armarte) y elimina al blanco: sus 3 cartas se destapan para todos. La app te pide confirmación antes de apretar el gatillo.',
      'Si el caído era un LÍDER, la partida acaba ahí mismo: pierde su bando. Ojo: si le disparas a TU propio líder, le regalas la partida al rival.',
      'Si tu objetivo cae antes de que dispares, pierdes la mira pero conservas el arma: apuntar a otro te cuesta un turno, no dos.',
      'Quien es eliminado deja de jugar turnos, pero sigue en la mesa mirando y hablando: sus cartas se quedan boca arriba a la vista de todos.',
    ],
  },
  {
    heading: '🗣️ El juego sucio (y limpio)',
    items: [
      'Todo lo demás es conversación: presume de honesto, acusa, promete protección… y miente lo justo. Los corruptos quieren cazar al Agente sin destapar a su Jefe; los honestos, al revés.',
      'Consejo: apuntar a alguien es también una pregunta («¿alguien lo defiende?»). Mirad quién se pone nervioso.',
    ],
  },
  {
    heading: '🏆 Ganar',
    items: [
      'La partida termina en cuanto cae un líder: pierde su bando entero (los eliminados incluidos). Todo el bando ganador puntúa.',
      'Al acabar se destapan todas las cartas y aparece el marcador. Con «🔁 Otra partida» se reparte de nuevo con los mismos jugadores y el marcador se conserva; con «🏁 Terminar» volvéis al lobby.',
      'La voz canta cada acción pública y de quién es el turno, nunca las cartas ni lo investigado. Si alguien no responde, cualquiera puede saltar su turno desde la pantalla de espera.',
    ],
  },
  {
    heading: '📎 Esta versión',
    items: [
      'Es una adaptación simplificada del juego de mesa: solo cartas de integridad, pistolas y disparos. No hay cartas de equipo ni roles especiales, así que no busques «equipar» ni poderes: todo se decide investigando, hablando y disparando.',
    ],
  },
];

// ——— Voz del narrador ———

export const GC_INTRO =
  'Good Cop Bad Cop. Tres cartas de integridad cada uno: su mayoría es vuestro bando. Entre los honestos, un Agente; entre los corruptos, un Jefe. Investigad, armaos… y que no caiga vuestro líder.';

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

export function allGoodCopStaticPieces(): string[] {
  return [GC_INTRO, ...helpPieces()];
}

export function lastLogLine(game: GoodCopState): string {
  const l = game.log[game.log.length - 1];
  return l ? l.txt.replace(/^[^\p{L}\d]+/u, '').trim() : '';
}
