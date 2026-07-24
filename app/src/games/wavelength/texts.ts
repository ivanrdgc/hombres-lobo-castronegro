// Corpus de «Wavelength»: intro del lobby (▶️), «cómo se juega» y voz del
// narrador. El OBJETIVO del dial nunca se dice hasta el resultado; la voz solo
// anuncia el espectro (público), quién es el Psíquico y la puntuación.
import { cleanForSpeech } from '../../core/util/speech';
import { spectrumById } from './spectrums';
import type { WavelengthState } from './types';

export const INTRO_LOBBY: string[] = [
  'Wavelength va de SINTONÍA. Cada ronda hay un espectro entre dos ideas opuestas (por ejemplo «frío» y «caliente») y un objetivo SECRETO en algún punto de ese espectro. El Psíquico de turno ve el objetivo y suelta una pista —una idea que caiga justo ahí—.',
  'El resto del equipo debate y coloca el marcador donde cree que apuntaba. Se puntúa por lo cerca que quedéis: cuanto mejor os leáis, más puntos. El Psíquico rota cada ronda. No hay respuestas correctas, solo lo bien que os entendáis.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 De qué va',
    items: [
      'Es un juego de SINTONÍA, cooperativo. Cada ronda, la app muestra un espectro entre dos ideas opuestas y esconde un OBJETIVO (un punto del dial) que solo ve el Psíquico de turno.',
      'El Psíquico da una pista para que el equipo adivine dónde está el objetivo; cuanto más cerca lo coloquéis, más puntos. Se juega a mejorar vuestra marca ronda a ronda; el Psíquico rota.',
      'La app custodia el objetivo (nadie más lo ve hasta el final), lleva el marcador y puntúa la cercanía.',
    ],
  },
  {
    heading: '📡 El espectro y el objetivo',
    items: [
      'La ronda arranca con un espectro público, del tipo «Frío ↔ Caliente» o «Inútil ↔ Útil». En su móvil, solo el Psíquico ve la DIANA: una franja del dial que vale 4 puntos en el centro, 3 y 2 según te alejas.',
      'El objetivo es subjetivo: no hay una respuesta oficial. La gracia es que el Psíquico y su equipo piensen parecido.',
    ],
  },
  {
    heading: '💬 La pista del Psíquico',
    items: [
      'El Psíquico dice EN VOZ ALTA una sola idea que, para él, caiga justo en el objetivo. Si la diana está muy hacia «Caliente», podría decir «el café recién hecho»; si está en el medio, algo templado.',
      'Cuando la haya dicho, pulsa «💬 Ya he dado la pista». Ojo: ni una palabra más sobre dónde está; a partir de ahí, calla y deja debatir.',
    ],
  },
  {
    heading: '🎚️ La marca del equipo',
    items: [
      'El resto debate en voz alta e interpreta la pista: ¿más a la izquierda o a la derecha? Cuando os pongáis de acuerdo, UNA persona arrastra el marcador del dial y pulsa «✅ Fijar la marca».',
      'El Psíquico no toca el dial ni opina sobre la posición: su trabajo ya está hecho.',
    ],
  },
  {
    heading: '🏆 Puntos (varias rondas)',
    items: [
      'Al fijar la marca, la app revela el objetivo y da puntos por cercanía: 4 en el centro de la diana, 3 cerca, 2 rozando, 0 fuera. Los suma el Psíquico de la ronda (fue quien os sintonizó) y también el total del equipo.',
      'Luego rota el Psíquico y cambia el espectro. Jugad las rondas que queráis: se guarda el marcador.',
    ],
  },
];

// ——— Voz del narrador (piezas sin nombres → clips) ———

export const WL_INTRO =
  'Wavelength. Cada ronda, un espectro entre dos ideas opuestas y un objetivo secreto que solo ve el Psíquico. Él os dará una pista; vosotros colocaréis el marcador donde creáis. Cuanto más en sintonía, más puntos.';

export const GUESS_LINE = 'El Psíquico ha hablado. Debatid y colocad el marcador donde creáis que apuntaba.';

export function roundLine(spectrum: string, psychic: string): string {
  return `Nuevo espectro: ${spectrum}. El Psíquico de esta ronda es ${psychic}: mira el objetivo y da tu pista.`;
}

export function resultLine(target: number, marker: number, points: number, psychic: string): string {
  const q = points === 4 ? 'justo en el centro' : points === 3 ? 'muy cerca' : points === 2 ? 'rozando la diana' : 'fuera de la diana';
  return `El objetivo estaba en ${target} y marcasteis ${marker}: ${q}. ${points} puntos para ${psychic}.`;
}

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

export function allWavelengthStaticPieces(): string[] {
  return [WL_INTRO, GUESS_LINE, ...helpPieces()];
}

export function lastLogLine(game: WavelengthState): string {
  const l = game.log[game.log.length - 1];
  return l ? l.txt.replace(/^[^\p{L}\d]+/u, '').trim() : '';
}

void spectrumById;
