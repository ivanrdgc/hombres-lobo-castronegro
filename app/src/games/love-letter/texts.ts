// Corpus de «Love Letter»: intro del lobby (▶️), «cómo se juega» y voz del
// narrador. Las manos OCULTAS no se dicen jamás; la voz relata lo público
// (quién juega qué carta, quién cae y el desenlace), que es lo que va al diario.
import { cleanForSpeech } from '../../core/util/speech';
import type { LoveLetterState } from './types';

export const INTRO_LOBBY: string[] = [
  'Love Letter: intriga de palacio con una sola carta en la mano. En tu turno robas otra, tienes dos, y juegas UNA aplicando su efecto: adivinar la carta de alguien con el Guardia, espiar con el Sacerdote, batirte con el Barón, protegerte con la Doncella, forzar descartes con el Príncipe, cambiar manos con el Rey…',
  'La carta más alta es la Princesa: si te la hacen descartar, fuera. Ganas la ronda si eres el último en pie o si tienes la carta más alta cuando se agota el mazo. Acumula favores y gana la partida. La app custodia el mazo y las manos: nadie ve tus cartas.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 De qué va',
    items: [
      'Cada jugador tiene 1 carta secreta en la mano. En tu turno robas una segunda, y juegas UNA de las dos, aplicando su efecto. Deducción rápida y pura.',
      'Ganas la RONDA si quedas como último en pie, o si tienes la carta más alta cuando se agota el mazo. Ganar una ronda da un FAVOR; el primero en juntar los favores necesarios (según cuántos seáis) gana la partida.',
      'La app hace de mesa: baraja, reparte, custodia las manos (solo ves la tuya) y resuelve cada efecto.',
    ],
  },
  {
    heading: '🎴 El reparto',
    items: [
      'Se baraja el mazo de 16 cartas, se aparta una boca abajo (y con 2 jugadores, 3 más boca arriba) y cada uno recibe una carta. Mírala sin que nadie la vea.',
      'En tu turno, la app te da la segunda carta: eliges cuál de las dos jugar (y su objetivo, si lo pide). La otra se queda en tu mano.',
    ],
  },
  {
    heading: '🃏 Las cartas',
    items: [
      '💂 Guardia (1): señala a alguien y adivina su carta (no vale «Guardia»); si aciertas, queda fuera.',
      '⛪ Sacerdote (2): miras en secreto la mano de otro. 🎩 Barón (3): comparáis en duelo; el de carta menor cae.',
      '🛡️ Doncella (4): quedas protegido hasta tu próximo turno (nadie puede elegirte). 🤴 Príncipe (5): alguien (o tú) descarta su mano y roba otra.',
      '👑 Rey (6): intercambias tu mano con otro. 👸 Condesa (7): sin efecto, pero DEBES descartarla si tienes el Rey o el Príncipe. 💗 Princesa (8): si la descartas por lo que sea, quedas fuera.',
    ],
  },
  {
    heading: '🛡️ Objetivos y protección',
    items: [
      'Los efectos con objetivo no pueden señalar a un jugador PROTEGIDO por la Doncella. Si todos los demás están protegidos, la carta se juega sin efecto.',
      'El Príncipe es el único que puede apuntarte a ti mismo. Y ojo con la Condesa: la app te obligará a descartarla si te toca con el Rey o el Príncipe en la mano.',
    ],
  },
  {
    heading: '🏆 Ganar',
    items: [
      'La ronda acaba cuando queda un solo jugador, o cuando se agota el mazo (entonces gana la carta más alta en mano). Quien gana la ronda suma un favor.',
      'El primero en alcanzar los favores necesarios (7 con 2 jugadores, 5 con 3, 4 con 4 o más) gana la partida. La app anuncia cada jugada en voz alta (nunca tus cartas) y guarda el marcador.',
    ],
  },
];

// ——— Voz del narrador ———

export const LL_INTRO =
  'Love Letter. Una carta en la mano; en tu turno robas otra y juegas una, con su efecto. Adivina, espía, bate en duelo o protégete… pero no descartes la Princesa. Gana la ronda quien quede en pie o tenga la carta más alta. Mirad vuestra carta.';

export function endLine(name: string): string {
  return `${name} gana la partida.`;
}

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

export function allLoveLetterStaticPieces(): string[] {
  return [LL_INTRO, ...helpPieces()];
}

export function lastLogLine(game: LoveLetterState): string {
  const l = game.log[game.log.length - 1];
  return l ? l.txt.replace(/^[^\p{L}\d]+/u, '').trim() : '';
}
