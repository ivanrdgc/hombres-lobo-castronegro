// Corpus de «El Camaleón»: lobby (▶️), ayuda por apartados y voz del narrador.
// La palabra secreta NUNCA se dice en voz alta (el tema sí es público).

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
      'En tu carta privada, la app te dice tu papel: o bien te resalta la palabra SECRETA (eres del grupo), o bien te avisa de que eres el CAMALEÓN y no la conoces.',
      'Míralo a solas y confirma. El Camaleón ve la rejilla igual que los demás: por eso puede fingir.',
    ],
  },
  {
    heading: '🗣️ Las pistas',
    items: [
      'Por turnos (empezando por quien indique la app), cada jugador dice EN VOZ ALTA una sola palabra relacionada con la secreta.',
      'El equilibrio es el juego: si tu pista es demasiado obvia, el Camaleón deducirá la palabra; si es demasiado vaga o rara, sospecharán que el Camaleón eres tú.',
      'El Camaleón improvisa una palabra que encaje sin saber cuál es la secreta: escuchar bien las anteriores es su única baza.',
    ],
  },
  {
    heading: '👉 La votación',
    items: [
      'Tras las pistas se debate y luego TODOS señalan a la vez, en secreto, a quien creen el Camaleón. La app destapa el recuento.',
      'Si un jugador reúne más votos que nadie, queda señalado. Si hay EMPATE en cabeza, la mesa no se aclara y el Camaleón escapa (gana).',
    ],
  },
  {
    heading: '🎯 Si pillan al Camaleón',
    items: [
      'Aún tiene una salida: debe señalar en la rejilla cuál cree que era la palabra secreta.',
      'Si ACIERTA, escapa por la puerta grande y gana igualmente. Si falla, el grupo se lleva la ronda.',
    ],
  },
  {
    heading: '🏆 Puntos (varias rondas)',
    items: [
      'Camaleón sin ser pillado: +2 para él. Pillado pero adivina la palabra: +1 para él.',
      'Camaleón pillado y falla: +1 para cada jugador del grupo. Jugad las rondas que queráis; el tema no se repite hasta agotarse.',
    ],
  },
];

// ——— Voz (ligera) ———

export const CH_INTRO =
  'El Camaleón acecha entre las palabras. Mirad vuestra carta: unos sabéis la palabra secreta; uno de vosotros, no. Que nadie enseñe su pantalla.';

export function roundLine(topic: string, starter: string): string {
  return `Tema de esta ronda: ${topic}. Da la primera pista ${starter}; una palabra cada uno, con astucia.`;
}
export const VOTE_LINE = 'Se acabaron las pistas. Debatid y luego señalad todos a la vez, en secreto, a quien creáis el Camaleón.';
export function outcomeLine(winner: 'chameleon' | 'group', chameleon: string, caught: boolean, guessedRight: boolean): string {
  if (winner === 'group') return `El Camaleón era ${chameleon}, lo habéis cazado y no supo la palabra. Gana el grupo.`;
  if (caught && guessedRight) return `Cazasteis a ${chameleon}… pero adivinó la palabra y escapa. Gana el Camaleón.`;
  return `Nadie lo vio venir: ${chameleon} era el Camaleón y se escurre sin castigo. Gana el Camaleón.`;
}

export function allChameleonStaticPieces(): string[] {
  return [CH_INTRO, VOTE_LINE];
}
