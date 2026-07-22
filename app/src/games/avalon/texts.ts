// Corpus de «Ávalon»: textos del lobby (lectura local ▶️), la ayuda y la voz
// del narrador. Las piezas SIN nombres son estáticas → se pregeneran como clips
// (allAvalonStaticPieces); las que llevan nombres se sintetizan en runtime (su
// latencia no delata nada: son anuncios públicos de día).
import type { Team } from './roles';

export const INTRO_LOBBY: string[] = [
  'Ávalon: el reino de Arturo se juega su destino en cinco misiones. Entre vosotros hay leales… y esbirros de Mordred infiltrados que solo quieren que las misiones fracasen.',
  'Cada misión la propone un líder y la vota toda la mesa; si se aprueba, el equipo parte y, en secreto, cada miembro decide si tiene éxito o la sabotea. El Bien gana con tres éxitos; el Mal, con tres sabotajes… o desenmascarando a Merlín al final.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 Objetivo',
    items: [
      'El BIEN (leales de Arturo) gana si tres misiones tienen ÉXITO.',
      'El MAL (esbirros de Mordred) gana si tres misiones FRACASAN… o si, tras perder, su Asesino acierta quién es Merlín.',
    ],
  },
  {
    heading: '🌙 Lo que sabe cada uno',
    items: [
      'La app reparte las lealtades en secreto y le muestra a cada jugador lo que le corresponde: los malvados se reconocen entre sí (salvo Oberón), Merlín ve a los malvados (salvo Mordred) y Percival ve a Merlín y a Morgana sin saber cuál es cuál.',
      'Nadie tiene que cerrar los ojos ni pasar cartas: cada móvil enseña solo lo justo.',
    ],
  },
  {
    heading: '🧭 Cada misión',
    items: [
      'El líder de turno propone quiénes van a la misión (el tamaño lo marca la app).',
      'TODA la mesa vota la propuesta en secreto; se destapan a la vez. Si hay más rechazos o empate, el liderazgo pasa al siguiente y se vuelve a proponer. Cinco rechazos seguidos: gana el Mal.',
      'Si se aprueba, cada miembro del equipo juega en secreto Éxito o Fracaso. El Bien solo puede jugar Éxito; el Mal puede sabotear. Un solo sabotaje hace fracasar la misión (la cuarta, con 7+ jugadores, necesita dos).',
    ],
  },
  {
    heading: '🗡️ El final',
    items: [
      'Si el Bien completa tres misiones, el Asesino tiene una última bala: señala a quien crea Merlín. Si acierta, ¡gana el Mal!',
      'Por eso Merlín debe guiar al Bien sin cantar demasiado, y Percival protegerlo.',
    ],
  },
];

// ——— Voz del narrador ———

export const AV_INTRO =
  'Bienvenidos a Ávalon. He repartido las lealtades en secreto: mirad vuestra carta, memorizad lo que sabéis y confirmad. Que ni una mirada delate a Merlín.';

export const LISTOS = 'Todos conocéis vuestra lealtad. Que comience la primera misión.';

export const ASSASSIN_LINE =
  'El Bien ha completado tres misiones… pero aún no ha ganado. Asesino, ha llegado tu momento: señala a quien creas que es Merlín. Si aciertas, el Mal se lo lleva todo.';

/** Anuncio de misión con el nombre del líder (runtime). */
export function missionLine(quest: number, leaderName: string, teamN: number): string {
  return `Misión ${quest}. Lidera ${leaderName}: debe proponer un equipo de ${teamN}.`;
}
export function reproposeLine(leaderName: string, track: number): string {
  return `Propuesta rechazada. Van ${track} de cinco. Ahora propone ${leaderName}.`;
}
export function voteResultLine(approved: boolean, forN: number, againstN: number): string {
  return approved
    ? `Propuesta aprobada, ${forN} contra ${againstN}. El equipo parte a la misión.`
    : `Propuesta rechazada, ${forN} a favor y ${againstN} en contra.`;
}
export function questResultLine(quest: number, success: boolean, fails: number): string {
  if (success) return `La misión ${quest} ha sido un éxito. El Bien se acerca a la gloria.`;
  return fails === 1
    ? `La misión ${quest} ha FRACASADO: una mano traidora la ha saboteado.`
    : `La misión ${quest} ha FRACASADO: ${fails} traidores la han saboteado.`;
}
export function endLine(winner: Team, reason: string): string {
  const head = winner === 'good' ? 'El Bien triunfa en Ávalon.' : 'El Mal se adueña de Ávalon.';
  return `${head} ${reason}`;
}

/** Todas las piezas ESTÁTICAS (sin nombres) para pregenerar clips en la F6. */
export function allAvalonStaticPieces(): string[] {
  return [AV_INTRO, LISTOS, ASSASSIN_LINE];
}
