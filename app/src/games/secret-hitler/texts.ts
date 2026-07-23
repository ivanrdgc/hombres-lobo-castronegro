// Corpus de «Secret Hitler»: lobby (▶️), ayuda y voz del narrador. Las
// piezas sin nombres son estáticas → clips (allSecretHitlerStaticPieces).
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
      '💀 HITLER: con 5-6 jugadores conoce a su fascista de confianza; con 7 o más juega A CIEGAS, sin saber quiénes son los suyos, fingiendo ser el liberal más ejemplar.',
      '🕊️ Los LIBERALES no saben nada de nadie: son mayoría, pero van a oscuras y solo pueden deducir por los votos y los decretos.',
    ],
  },
  {
    heading: '🏛️ Fase 1 · Gobierno: nominar y votar',
    items: [
      'Cada ronda hay un PRESIDENTE (el cargo rota por la mesa). En su móvil nomina a un CANCILLER. La app aplica los límites de mandato: no se puede repetir de Canciller al último Presidente ni al último Canciller electos (con solo 5 vivos, únicamente al último Canciller).',
      'TODA la mesa vota el gobierno propuesto: 👍 Ja o 👎 Nein, en secreto; la app los destapa a la vez. Si hay mayoría de Ja, ese Presidente y Canciller gobiernan; si hay empate o mayoría de Nein, el gobierno cae y la presidencia pasa al siguiente.',
      '⚠️ Si caen TRES gobiernos seguidos, el país entra en caos: se promulga a ciegas el decreto de arriba del mazo (sin poderes) y se reinicia la cuenta. No bloqueéis sin fin.',
      '⚠️ A partir de 3 decretos fascistas, elegir a Hitler de Canciller hace GANAR a los fascistas en el acto: no votéis gobiernos a ciegas cuando el marcador fascista aprieta.',
    ],
  },
  {
    heading: '📜 Fase 2 · Legislar (en secreto)',
    items: [
      'Con el gobierno aprobado, la app da al PRESIDENTE tres decretos que solo ve él: descarta uno y pasa los otros dos al Canciller.',
      'El CANCILLER ve esos dos (tampoco los ve nadie más): promulga uno y descarta el otro. Solo el decreto PROMULGADO es público; los descartes quedan en secreto.',
      'Ahí está la miga: un fascista puede jurar que «solo le llegaron decretos fascistas»… y quizá mienta. El mazo se rebaraja solo cuando se agota.',
      'Con 5 decretos fascistas se desbloquea el VETO: el Canciller puede proponer descartar la agenda entera y, si el Presidente acepta, no se promulga nada (cuenta como gobierno caído hacia el caos).',
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
export function enactedLine(policy: 'liberal' | 'fascist', lib: number, fas: number): string {
  return policy === 'liberal'
    ? `Se promulga un decreto liberal. Van ${lib} liberales y ${fas} fascistas.`
    : `Se promulga un decreto fascista. Van ${fas} fascistas y ${lib} liberales. La sombra crece.`;
}
export const CHAOS_LINE = 'Tres gobiernos caídos: el país se hunde en el caos y se promulga a ciegas el decreto de arriba.';
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

export function allSecretHitlerStaticPieces(): string[] {
  return [SH_INTRO, LISTOS, CHAOS_LINE];
}
