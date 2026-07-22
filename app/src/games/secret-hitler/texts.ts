// Corpus de «Secret Castronegro»: lobby (▶️), ayuda y voz del narrador. Las
// piezas sin nombres son estáticas → clips (allSecretHitlerStaticPieces).
import type { PowerType } from './roles';

export const INTRO_LOBBY: string[] = [
  'Secret Castronegro: la República tambalea. Entre vosotros hay liberales que quieren salvarla, fascistas que quieren derribarla… y un Hitler oculto que los fascistas conocen, pero que se hace pasar por uno más.',
  'Cada ronda, un Presidente y un Canciller promulgan un decreto en secreto. Los liberales ganan con cinco decretos liberales o ejecutando a Hitler; los fascistas, con seis decretos fascistas… o colando a Hitler de Canciller cuando ya mandan.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 Objetivo',
    items: [
      'LIBERALES: promulgar 5 decretos liberales, o ejecutar a Hitler.',
      'FASCISTAS: promulgar 6 decretos fascistas, o conseguir que Hitler sea elegido Canciller cuando ya haya 3 decretos fascistas en la mesa.',
    ],
  },
  {
    heading: '🌙 Lo que sabe cada uno',
    items: [
      'La app reparte los bandos en secreto. Los fascistas se reconocen entre sí y conocen a Hitler. Con 5-6 jugadores, Hitler también ve a su fascista; con 7 o más, Hitler NO sabe quiénes son (juega a ciegas).',
      'Los liberales no saben nada: son mayoría, pero van a oscuras.',
    ],
  },
  {
    heading: '🏛️ Cada ronda',
    items: [
      'El Presidente de turno nomina un Canciller. Toda la mesa vota Ja o Nein. Si sale mayoría de Nein (o empate), el gobierno cae y la presidencia pasa al siguiente. Tres gobiernos caídos seguidos: se promulga un decreto a ciegas (caos).',
      'Si el gobierno se aprueba, la app da 3 decretos al Presidente en secreto: descarta 1 y pasa 2 al Canciller, que descarta 1 y promulga el otro. Nadie ve las cartas descartadas: solo el decreto final.',
      'No se puede repetir de Canciller al último Presidente ni al último Canciller electos (con 5 vivos, solo al último Canciller).',
    ],
  },
  {
    heading: '⚡ Poderes y final',
    items: [
      'Algunos decretos fascistas dan al Presidente un poder: mirar los próximos decretos, investigar la lealtad de alguien, convocar una elección especial o EJECUTAR a un jugador.',
      'Con 5 decretos fascistas se desbloquea el VETO: Presidente y Canciller pueden descartar la agenda de común acuerdo.',
      '¡Ojo! A partir de 3 decretos fascistas, si Hitler llega a Canciller, ganan los fascistas: no elijáis a ciegas.',
    ],
  },
];

// ——— Voz ———

export const SH_INTRO =
  'Bienvenidos a Secret Castronegro. He repartido los bandos en secreto: mirad vuestra carta y memorizad quién sois. Fascistas, reconoceos; liberales, desconfiad. Que empiece la República… o su caída.';

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
