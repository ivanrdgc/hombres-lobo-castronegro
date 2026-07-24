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
      'Tu carta se queda siempre a la vista en tu pantalla: no hay nada que destapar ni que abrir. El botón flotante de las reglas, abajo a la derecha, recuerda qué hace cada carta y cuántas copias trae el mazo de cada una.',
    ],
  },
  {
    heading: '🃏 Las cartas',
    items: [
      'Las 16 cartas del mazo, con cuántas copias hay de cada una: 5 Guardias, 2 Sacerdotes, 2 Barones, 2 Doncellas, 2 Príncipes, y una sola de Rey, Condesa y Princesa. Contar las que ya han salido es media partida: la app las va tachando por ti, salvo que la mesa elija el modo difícil, en el que solo dice cuántas cartas quedan por robar.',
      '💂 Guardia (1, cinco copias): señala a alguien y adivina su carta (no vale «Guardia»); si aciertas, queda fuera.',
      '⛪ Sacerdote (2, dos copias): miras en secreto la mano de otro. 🎩 Barón (3, dos copias): comparáis en duelo; el de carta menor cae y solo se destapa la suya.',
      '🛡️ Doncella (4, dos copias): quedas protegido hasta tu próximo turno (nadie puede elegirte). 🤴 Príncipe (5, dos copias): alguien (o tú) descarta su mano y roba otra.',
      '👑 Rey (6, una sola): intercambias tu mano con otro. 👸 Condesa (7, una sola): sin efecto, pero DEBES descartarla si tienes el Rey o el Príncipe. 💗 Princesa (8, una sola): si la descartas por lo que sea, quedas fuera.',
    ],
  },
  {
    heading: '🛡️ Objetivos y protección',
    items: [
      'Los efectos con objetivo no pueden señalar a un jugador PROTEGIDO por la Doncella. Si todos los demás están protegidos, la carta se juega sin efecto… salvo el Príncipe, que entonces te obliga a apuntarte a ti mismo.',
      'El Príncipe es el único que puede apuntarte a ti mismo. Y ojo con la Condesa: la app te obligará a descartarla si te toca con el Rey o el Príncipe en la mano.',
    ],
  },
  {
    heading: '🏆 Ganar',
    items: [
      'La ronda acaba cuando queda un solo jugador, o cuando se agota el mazo: entonces todos enseñan su carta y gana la más alta. Si dos empatan con la misma carta, gana quien tenga la mayor SUMA de descartes; si también empatan ahí, gana quien va antes en la mesa.',
      'Quien gana la ronda suma un favor y empieza la siguiente; los eliminados vuelven, porque quedar fuera es solo por esa ronda. La carta apartada boca abajo no se usa nunca… salvo que un Príncipe obligue a robar con el mazo ya vacío.',
      'El primero en alcanzar los favores necesarios (7 con 2 jugadores, 5 con 3, 4 con 4 y 3 con 5 o 6) gana la partida. La app anuncia cada jugada en voz alta (nunca tus cartas) y guarda el marcador.',
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
