// Corpus de «Secret Hitler»: lobby (▶️), ayuda y voz del narrador. Las
// piezas sin nombres son estáticas → clips (allSecretHitlerStaticPieces).
import { cleanForSpeech } from '../../core/util/speech';
import type { PowerType } from './roles';

export const INTRO_LOBBY: string[] = [
  'Secret Hitler: la República tambalea. Entre vosotros hay liberales que quieren salvarla, fascistas que quieren derribarla… y un Hitler oculto que los fascistas conocen, pero que se hace pasar por uno más.',
  'Cada ronda, un Presidente y un Canciller promulgan un decreto en secreto. Los liberales ganan con cinco decretos liberales o ejecutando a Hitler; los fascistas, con seis decretos fascistas… o colando a Hitler de Canciller cuando ya mandan.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 De qué va',
    items: [
      'La República de Castronegro se tambalea. Sois mayoría LIBERALES, pero entre vosotros hay FASCISTAS infiltrados y un HITLER oculto que finge ser uno más. Ronda a ronda se van promulgando decretos —liberales o fascistas— y cada bando empuja hacia los suyos.',
      'Ganan los LIBERALES si se promulgan 5 decretos liberales, o si ejecutan a Hitler. Ganan los FASCISTAS si se promulgan 6 decretos fascistas, o si consiguen que Hitler salga elegido Canciller una vez que ya hay 3 decretos fascistas en la mesa.',
      'La app es el máster secreto: custodia el mazo de decretos, baraja, reparte las cartas que cada gobierno ve en privado y aplica los poderes. Nadie manosea cartas ni lleva cuentas a mano.',
    ],
  },
  {
    heading: '🌙 El reparto: lo que sabe cada uno',
    items: [
      'Al empezar, cada jugador mira su carta a solas y confirma. La app le muestra su bando y su información secreta:',
      '🐷 Los FASCISTAS se reconocen entre sí y saben quién es Hitler: su trabajo es protegerlo y colar decretos fascistas sin cantarse.',
      '💀 HITLER: con 5 o 6 jugadores conoce a su fascista de confianza; con 7 o más juega A CIEGAS, sin saber quiénes son los suyos, fingiendo ser el liberal más ejemplar.',
      '🕊️ Los LIBERALES no saben nada de nadie: son mayoría, pero van a oscuras y solo pueden deducir por los votos y los decretos.',
      'Cuántos hay de cada uno: con 5 o 6 jugadores, 1 fascista más Hitler; con 7 u 8, 2 fascistas más Hitler; con 9 o 10, 3 fascistas más Hitler. Todos los demás son liberales.',
    ],
  },
  {
    heading: '🏛️ Fase 1 · Gobierno: nominar y votar',
    items: [
      'Cada ronda hay un PRESIDENTE (el cargo rota por la mesa). En su móvil nomina a un CANCILLER. La app aplica los límites de mandato: no se puede repetir de Canciller al último Presidente ni al último Canciller electos (con solo 5 vivos, únicamente al último Canciller).',
      'TODA la mesa vota el gobierno propuesto: 👍 Ja o 👎 Nein, en secreto; la app los destapa a la vez CON NOMBRES. Si hay mayoría de Ja, ese Presidente y Canciller gobiernan; si hay empate o mayoría de Nein, el gobierno cae y la presidencia pasa al siguiente.',
      'Los votos son PÚBLICOS: quién votó Ja y quién Nein queda escrito en el tablero y en la crónica de la partida. Es la prueba principal para deducir, así que revisadla antes de dar el siguiente Ja.',
      '⚠️ Si caen TRES gobiernos seguidos, el país entra en caos: se promulga a ciegas el decreto de arriba del mazo (sin activar su poder), se reinicia la cuenta y se BORRAN los límites de mandato, así que el próximo gobierno puede repetir cargos. No bloqueéis sin fin.',
      '⚠️ A partir de 3 decretos fascistas, elegir a Hitler de Canciller hace GANAR a los fascistas en el acto: no votéis gobiernos a ciegas cuando el marcador fascista aprieta.',
    ],
  },
  {
    heading: '📜 Fase 2 · Legislar (en secreto)',
    items: [
      'Con el gobierno aprobado, la app da al PRESIDENTE tres decretos que solo ve él: descarta uno y pasa los otros dos al Canciller.',
      'El CANCILLER ve esos dos (tampoco los ve nadie más): promulga uno y descarta el otro. Solo el decreto PROMULGADO es público; los descartes quedan en secreto.',
      'El mazo tiene 17 decretos y viene MUY cargado: 11 fascistas y solo 6 liberales. Que a un Presidente honesto le lleguen tres fascistas es de lo más normal: por sí solo no prueba nada.',
      'Ahí está la miga: un fascista puede jurar que «solo le llegaron decretos fascistas»… y quizá mienta. El mazo se rebaraja con los descartes en cuanto quedan menos de 3 cartas, así que la cuenta de lo que queda se reinicia a menudo.',
      'Con 5 decretos fascistas se desbloquea el VETO: el Canciller puede proponer descartar la agenda entera y, si el Presidente acepta, no se promulga nada (cuenta como gobierno caído hacia el caos). Si el Presidente lo rechaza, el Canciller queda OBLIGADO a promulgar: no puede re-vetar.',
    ],
  },
  {
    heading: '⚡ Fase 3 · Poderes presidenciales',
    items: [
      'Algunos decretos FASCISTAS otorgan un poder al Presidente en cuanto se promulgan. Cuáles y cuándo depende del número de jugadores (la app lo aplica sola):',
      '🔮 Mirar: el Presidente ve en secreto los tres próximos decretos del mazo.',
      '🔎 Investigar: el Presidente descubre (solo para él) la afiliación de un jugador — ojo, Hitler aparece como «fascista», no como Hitler.',
      '🗳️ Elección especial: el Presidente elige a dedo quién será el próximo Presidente (por una vez).',
      '💀 Ejecutar: el Presidente mata a un jugador. Si resulta ser Hitler, ¡ganan los liberales al instante! El ejecutado queda fuera y ya no vota.',
      'La tabla exacta. Con 5 o 6 jugadores: el tercer decreto fascista permite 🔮 mirar los tres próximos decretos; el cuarto y el quinto, 💀 ejecutar a alguien.',
      'Con 7 u 8 jugadores: el segundo permite 🔎 investigar una lealtad; el tercero, 🗳️ convocar una elección especial; el cuarto y el quinto, 💀 ejecutar.',
      'Con 9 o 10 jugadores: el primero y el segundo permiten 🔎 investigar; el tercero, 🗳️ convocar una elección especial; el cuarto y el quinto, 💀 ejecutar.',
    ],
  },
  {
    heading: '🎭 Los roles',
    items: [
      'Abajo tienes las tres cartas (Liberal, Fascista, Hitler): tócalas para ver en detalle qué sabe y qué busca cada una.',
      'El reparto de fascistas lo fija el número de jugadores (de 5 a 10): la app pone siempre 1 Hitler y el resto de fascistas y liberales según la tabla oficial.',
    ],
  },
];

// ——— Voz ———

export const SH_INTRO =
  'Bienvenidos a Secret Hitler. He repartido los bandos en secreto: mirad vuestra carta y memorizad quién sois. Fascistas, reconoceos; liberales, desconfiad. Que empiece la República… o su caída.';

export const LISTOS = 'Todos conocéis vuestro bando. Que empiece la primera legislatura.';

export function presidentLine(president: string): string {
  return `Preside ${president}. Debe nominar un Canciller y que la mesa lo vote.`;
}
export function nominationLine(president: string, chancellor: string): string {
  return `${president} propone a ${chancellor} como Canciller. Votad todos: Ja o Nein.`;
}
export function electionResultLine(passed: boolean, ja: number, nein: number): string {
  return passed
    ? `Gobierno aprobado, ${ja} contra ${nein}. Pasan a legislar en secreto.`
    : `Gobierno rechazado, ${ja} a favor y ${nein} en contra. La presidencia cambia de manos.`;
}
/** «1 liberal» / «2 liberales»: la voz no puede decir «Van 1 liberales». */
const decretos = (n: number, kind: 'liberal' | 'fascist'): string =>
  `${n} ${kind === 'liberal' ? (n === 1 ? 'liberal' : 'liberales') : (n === 1 ? 'fascista' : 'fascistas')}`;

export function enactedLine(policy: 'liberal' | 'fascist', lib: number, fas: number): string {
  return policy === 'liberal'
    ? `Se promulga un decreto liberal. Van ${decretos(lib, 'liberal')} y ${decretos(fas, 'fascist')}.`
    : `Se promulga un decreto fascista. Van ${decretos(fas, 'fascist')} y ${decretos(lib, 'liberal')}. La sombra crece.`;
}
export const CHAOS_LINE = 'Tres gobiernos caídos: el país se hunde en el caos y se promulga a ciegas el decreto de arriba, sin poder presidencial y sin límites de mandato.';
// La ronda legislativa era muda: sin esto nadie sabe que le toca mirar el móvil.
export const LEG_PRESIDENT_LINE = 'Presidente: mira tu móvil. Estudia los tres decretos y descarta uno en secreto.';
export const LEG_CHANCELLOR_LINE = 'Canciller: mira tu móvil. Promulga uno de los dos decretos que te han pasado y descarta el otro.';
export const VETO_DECISION_LINE = 'El Canciller propone vetar la agenda entera. Presidente: decide en tu móvil si aceptas el veto.';
export function executedLine(name: string): string {
  // Sin concordancia de género: no sabemos si el nombre es de él o de ella.
  return `Ejecutan a ${name}: ya no vota ni puede gobernar.`;
}
export function powerLine(type: PowerType, president: string): string {
  switch (type) {
    case 'peek': return `${president} atisba en secreto los tres próximos decretos.`;
    case 'investigate': return `${president} investiga la lealtad de alguien de la mesa.`;
    case 'special': return `${president} convoca una elección especial y elige al próximo Presidente.`;
    case 'execution': return `${president} empuña el poder de la ejecución: alguien va a caer.`;
  }
}
export function endLine(winner: 'liberal' | 'fascist', reason: string): string {
  return `${winner === 'liberal' ? 'La República resiste.' : 'Cae la República.'} ${reason}`;
}

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

export function allSecretHitlerStaticPieces(): string[] {
  return [SH_INTRO, LISTOS, CHAOS_LINE, LEG_PRESIDENT_LINE, LEG_CHANCELLOR_LINE, VETO_DECISION_LINE, ...helpPieces()];
}
