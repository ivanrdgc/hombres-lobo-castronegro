// Corpus de «Wavelength»: intro del lobby (▶️), «cómo se juega» y voz del
// narrador. El OBJETIVO del dial nunca se dice hasta el resultado; la voz solo
// anuncia el espectro (público), quién es el Psíquico y la puntuación.
import { cleanForSpeech } from '../../core/util/speech';
import { spectrumSpeech } from './spectrums';

export const INTRO_LOBBY: string[] = [
  'Wavelength va de SINTONÍA. Cada ronda hay un espectro entre dos ideas opuestas (por ejemplo «frío» y «caliente») y un objetivo SECRETO en algún punto de ese espectro. El Psíquico de turno ve el objetivo y suelta una pista —una idea que caiga justo ahí—.',
  'El resto del equipo debate y coloca el marcador donde cree que apuntaba. Se puntúa por lo cerca que quedéis: cuanto mejor os leáis, más puntos. El Psíquico rota cada ronda. No hay respuestas correctas, solo lo bien que os entendáis.',
  'Es una adaptación libre del juego de mesa: aquí jugáis TODOS en el mismo equipo, sin dos bandos ni la apuesta de «izquierda o derecha» del equipo rival. Un solo marcador y un solo total.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 De qué va',
    items: [
      'Es un juego de SINTONÍA, cooperativo. Cada ronda, la app muestra un espectro entre dos ideas opuestas y esconde un OBJETIVO (un punto del dial) que solo ve el Psíquico de turno.',
      'El Psíquico da una pista para que el equipo adivine dónde está el objetivo; cuanto más cerca lo coloquéis, más puntos. Se juega a mejorar vuestra marca ronda a ronda; el Psíquico rota.',
      'La app custodia el objetivo (nadie más lo ve hasta el final), puntúa la cercanía y lleva la cuenta de los puntos.',
      'Es una adaptación libre del juego de mesa: aquí sois un solo equipo, sin bando rival ni apuesta de «izquierda o derecha».',
    ],
  },
  {
    heading: '📡 El espectro y el objetivo',
    items: [
      'La ronda arranca con un espectro público, del tipo «Frío ↔ Caliente» o «Inútil ↔ Útil». En su móvil, solo el Psíquico ve la DIANA: una franja del dial que vale 4 puntos en el centro, 3 y 2 según te alejas. La lleva tapada: se pinta mientras mantiene pulsado el botón de apuntar, para que no se le vea desde el otro lado de la mesa.',
      'El dial va de 0 (el extremo izquierdo del espectro) a 100 (el derecho); 50 es justo el centro. Cuando la app dice «el objetivo estaba en 82», habla de esa escala.',
      'El objetivo es subjetivo: no hay una respuesta oficial. La gracia es que el Psíquico y su equipo piensen parecido.',
    ],
  },
  {
    heading: '💬 La pista del Psíquico',
    items: [
      'El Psíquico dice EN VOZ ALTA una sola idea que, para él, caiga justo en el objetivo. Si la diana está muy hacia «Caliente», podría decir «el café recién hecho»; si está en el medio, algo templado.',
      'Cuando la haya dicho, pulsa «💬 Ya he dado la pista». Puede escribirla antes en su móvil: así queda a la vista de todos durante el debate (nadie tendrá que preguntar «¿qué había dicho?», que él no puede repetirla).',
      'Ojo: ni una palabra más sobre dónde está; a partir de ahí, calla y deja debatir. Si el espectro que le ha tocado no le inspira nada, puede pulsar «🔀 Cambiar espectro» antes de dar la pista: no gasta la ronda.',
    ],
  },
  {
    heading: '🎚️ La marca del equipo',
    items: [
      'El resto debate en voz alta e interpreta la pista: ¿más a la izquierda o a la derecha? La marca es COMPARTIDA: la mueve cualquiera con el dedo y se ve igual en todos los móviles del equipo.',
      'Cuando os pongáis de acuerdo, uno pulsa «✅ Fijar la marca» y confirma; se fija la posición que veis todos, así que un toque despistado ya no cierra la ronda.',
      'El Psíquico no toca el dial ni opina sobre la posición: su trabajo ya está hecho.',
    ],
  },
  {
    heading: '🏆 Puntos (varias rondas)',
    items: [
      'Al fijar la marca, la app revela el objetivo y da puntos por cercanía: 4 en el centro de la diana, 3 cerca, 2 rozando, 0 fuera. Los suma el Psíquico de la ronda (fue quien os sintonizó) y también el total del equipo.',
      'La cuenta por persona NO es una competición: cada uno solo suma en las rondas en que le tocó ser Psíquico, por eso al lado aparecen cuántas ha jugado. Lo que importa es el total del equipo.',
      'Luego rota el Psíquico y cambia el espectro. La ronda siguiente la lanza cualquiera con «🔁 Otra ronda».',
    ],
  },
  {
    heading: '🏁 Cómo se acaba',
    items: [
      'Al empezar elegís meta: una vuelta a la mesa (una ronda por jugador), dos vueltas, hasta 20 puntos de equipo… o ninguna, y jugáis lo que os apetezca.',
      'Cuando se cumple, la ronda termina con «🏁 Ver el resumen final»: el total del equipo, la media por ronda y lo que aportó cada uno. Desde ahí, otra partida o volver al lobby.',
      'En el menú ⋯ hay dos salidas: «⏭️ Saltar ronda» (la puede pulsar cualquiera; anula la ronda, no puntúa y pasa el turno) y «🏳️ Terminar», que cierra la partida para TODOS y borra los puntos. Si alguien deja la partida, también se cierra: el Psíquico tiene que poder rotar entre los presentes.',
    ],
  },
];

// ——— Voz del narrador (piezas sin nombres → clips) ———

export const WL_INTRO =
  'Wavelength. Cada ronda, un espectro entre dos ideas opuestas y un objetivo secreto que solo ve el Psíquico. Él os dará una pista; vosotros colocaréis el marcador donde creáis, en un dial que va de 0 a 100. Cuanto más en sintonía, más puntos.';

export const GUESS_LINE = 'El Psíquico ha hablado. Debatid y colocad el marcador donde creáis que apuntaba.';

/** La línea de ronda se compone con los DOS extremos del espectro: leer el ↔
 *  («Frío frente a Caliente») queda raro en pares tipo «No es arte ↔ Es arte». */
export function roundLine(spectrumId: string, psychic: string): string {
  return `Nuevo espectro: ${spectrumSpeech(spectrumId)}. El Psíquico de esta ronda es ${psychic}: mira el objetivo y da tu pista.`;
}

export function resultLine(target: number, marker: number, points: number, psychic: string): string {
  const q = points === 4 ? 'justo en el centro' : points === 3 ? 'muy cerca' : points === 2 ? 'rozando la diana' : 'fuera de la diana';
  return `El objetivo estaba en ${target} y marcasteis ${marker}: ${q}. ${points} puntos para ${psychic}.`;
}

export function finalLine(teamScore: number, rounds: number): string {
  return `Fin de la partida. Habéis sumado ${teamScore} puntos de equipo en ${rounds} ${rounds === 1 ? 'ronda' : 'rondas'}. Mirad el resumen en la pantalla.`;
}

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

export function allWavelengthStaticPieces(): string[] {
  return [WL_INTRO, GUESS_LINE, ...helpPieces()];
}
