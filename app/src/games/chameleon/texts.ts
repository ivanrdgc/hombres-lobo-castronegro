// Corpus de «El Camaleón»: lobby (▶️), ayuda por apartados y voz del narrador.
// La palabra secreta NUNCA se dice en voz alta (el tema sí es público).
import { cleanForSpeech } from '../../core/util/speech';

export const INTRO_LOBBY: string[] = [
  'El Camaleón: todos veis la misma rejilla de 16 palabras y sabéis cuál es la SECRETA… menos uno, el Camaleón, que solo ve la rejilla y tiene que fingir.',
  'Por turnos, cada uno dice una palabra relacionada con la secreta: ni tan obvia que el Camaleón la adivine, ni tan vaga que parezcáis vosotros el impostor. Luego se vota. Rondas de un par de minutos.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🦎 De qué va',
    items: [
      'Hay un CAMALEÓN infiltrado. Todos los demás conocen una palabra secreta; el Camaleón no, y debe pasar desapercibido pillándola al vuelo por lo que digan los demás.',
      'Gana el GRUPO si desenmascara al Camaleón y este NO logra adivinar la palabra. Gana el CAMALEÓN si no lo pillan… o si, pillado, acierta la palabra secreta.',
      'La app hace de máster: reparte la rejilla, marca la palabra secreta a todos menos al Camaleón, y cuenta el voto en secreto. Nadie toca cartas.',
    ],
  },
  {
    heading: '🗺️ El reparto',
    items: [
      'Cada ronda, la app muestra a TODOS la misma rejilla de 16 palabras sobre un tema (la playa, el cine…). La rejilla es pública: está siempre a la vista.',
      'Tu carta privada te dice tu papel: o te escribe la palabra SECRETA (eres del grupo), o te avisa de que eres el CAMALEÓN y no la conoces. En la rejilla pública no se marca nada: la palabra solo aparece en tu carta.',
      'Míralo a solas y confirma. Puedes volver a mirar tu carta cuando quieras con el botón redondo de la esquina, el de la carta, o con el botón de ver mi carta que hay bajo cada fase.',
      'El Camaleón ve la rejilla igual que los demás: por eso puede fingir.',
    ],
  },
  {
    heading: '🗣️ Las pistas',
    items: [
      'Por turnos, cada jugador dice EN VOZ ALTA una sola palabra relacionada con la secreta. La app marca de quién es el turno y quién va después.',
      'Cuando acabas de decir la tuya, alguien lo confirma en el móvil y el turno pasa al siguiente. Si se salta un turno por error, el botón de atrás lo devuelve.',
      'El equilibrio es el juego: si tu pista es demasiado obvia, el Camaleón deducirá la palabra; si es demasiado vaga o rara, sospecharán que el Camaleón eres tú.',
      'El Camaleón improvisa una palabra que encaje sin saber cuál es la secreta: escuchar bien las anteriores es su única baza.',
    ],
  },
  {
    heading: '👉 La votación',
    items: [
      'Cuando ha hablado toda la mesa, cualquiera pulsa el botón de votar. Antes de señalar se comentan las pistas en voz alta: ese debate es media partida.',
      'Luego TODOS señalan a la vez, en secreto, a quien creen el Camaleón (a uno mismo no se puede). La app destapa el recuento: quién votó a quién.',
      'Si un jugador reúne más votos que nadie, queda señalado. Si hay EMPATE en cabeza, la mesa no se aclara y el Camaleón escapa: gana 2 puntos.',
      'Y ojo con el final más habitual: si el señalado NO es el Camaleón, la ronda acaba ahí mismo. El Camaleón gana 2 puntos sin tener que adivinar nada.',
    ],
  },
  {
    heading: '🎯 Si pillan al Camaleón',
    items: [
      'Solo si el señalado ES el Camaleón hay última bala: debe señalar en la rejilla cuál cree que era la palabra secreta.',
      'Si ACIERTA, escapa por la puerta grande y gana igualmente. Si falla, el grupo se lleva la ronda.',
    ],
  },
  {
    heading: '🏆 Puntos (varias rondas)',
    items: [
      'Si el Camaleón no cae, se lleva 2 puntos. Si lo pilláis pero acierta la palabra, se lleva 1 punto.',
      'Si lo pilláis y falla, gana el grupo: 1 punto para cada jugador que no era el Camaleón.',
      'Jugad las rondas que queráis. Cada ronda hay tema nuevo y Camaleón nuevo: nunca repite el de la ronda anterior.',
    ],
  },
];

// ——— Voz (ligera) ———

export const CH_INTRO =
  'El Camaleón acecha entre las palabras. Mirad vuestra carta: unos sabéis la palabra secreta; uno de vosotros, no. Que nadie enseñe su pantalla.';

/** Rondas 2 en adelante: sin esto, el reparto era mudo y nadie sabía si mirar. */
export const NEW_ROUND_LINE =
  'Nueva ronda: tema nuevo y Camaleón nuevo. Mirad otra vez vuestra carta, que la palabra secreta ha cambiado.';

export function roundLine(topic: string, starter: string): string {
  return `Tema de esta ronda: ${topic}. Empieza ${starter}, dando la primera pista; luego seguís por orden, una palabra cada uno.`;
}
export const VOTE_LINE = 'Se acabaron las pistas. Comentad lo que habéis oído y luego señalad todos a la vez, en secreto, a quien creáis el Camaleón.';
/** El momento más dramático de la partida: la mesa acaba de cazar a alguien. */
export function caughtLine(chameleon: string): string {
  return `¡${chameleon} era el Camaleón! Pero aún puede escapar: que señale en la rejilla la palabra secreta.`;
}
export function outcomeLine(winner: 'chameleon' | 'group', chameleon: string, caught: boolean, guessedRight: boolean): string {
  if (winner === 'group') return `El Camaleón era ${chameleon}, lo habéis cazado y no supo la palabra. Gana el grupo.`;
  if (caught && guessedRight) return `Cazasteis a ${chameleon}… pero adivinó la palabra y escapa. Gana el Camaleón.`;
  return `Nadie lo vio venir: ${chameleon} era el Camaleón y se escurre sin castigo. Gana el Camaleón.`;
}

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

export function allChameleonStaticPieces(): string[] {
  return [CH_INTRO, NEW_ROUND_LINE, VOTE_LINE, ...helpPieces()];
}
