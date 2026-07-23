// Corpus de «Two Rooms and a Boom»: intro del lobby (▶️), «cómo se juega» por
// apartados y la voz del narrador. Los bandos y roles OCULTOS no se dicen jamás
// hasta el final; el narrador relata lo público (rondas, reloj, intercambios de
// rehenes y el desenlace), que es lo que va al diario.
import type { TwoRoomsState } from './types';

// ——— Lobby ———

export const INTRO_LOBBY: string[] = [
  'Two Rooms and a Boom: os dividís en dos salas y en dos bandos secretos, el azul y el rojo. Entre los azules se esconde el Presidente; entre los rojos, el Bombardero. Durante unas rondas contrarreloj habláis, os enseñáis cartas en privado y, al final de cada ronda, cada sala manda un rehén a la otra.',
  'Cuando acaba la última ronda se destapa todo: si el Bombardero terminó en la MISMA sala que el Presidente, ¡BOOM!, gana el equipo rojo. Si quedaron separados, el Presidente sobrevive y gana el azul. El equipo azul quiere mantenerlos lejos; el rojo, juntarlos. Partidas rápidas y muy negociadas.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 De qué va',
    items: [
      'Dos bandos secretos casi a la par: AZUL y ROJO. Un jugador azul es el PRESIDENTE; uno rojo es el BOMBARDERO. Nadie sabe de qué bando es cada cual ni quién tiene esos roles: lo lleva la app en secreto.',
      'Gana el ROJO si, al final, el Bombardero está en la misma sala que el Presidente (la bomba se lo lleva). Gana el AZUL si acaban en salas distintas. Todo el bando gana o pierde junto.',
      'La app reparte bandos, roles y salas, lleva el reloj de cada ronda y, al final, destapa quién era quién y quién gana.',
    ],
  },
  {
    heading: '🚪 Las dos salas',
    items: [
      'Al empezar, la app os reparte en dos salas (Sala 1 y Sala 2), a la par y mezclando bandos. Cada uno ve en su móvil en qué sala está: colocaos físicamente en dos espacios separados.',
      'Quién está en cada sala es público (se ve en pantalla). Lo secreto es tu carta: tu bando y si eres Presidente, Bombardero o carta normal.',
    ],
  },
  {
    heading: '🗣️ Las rondas (contrarreloj)',
    items: [
      'Se juegan tres rondas cada vez más cortas (3, 2 y 1 minuto). Durante la ronda, dentro de tu sala, hablas y puedes ENSEÑAR tu carta a quien quieras, en privado, cara a cara (eso es cosa vuestra, no de la app).',
      'El objetivo de hablar es averiguar quién es de fiar: los azules quieren localizar al Presidente para protegerlo; los rojos, colar al Bombardero donde esté el Presidente.',
    ],
  },
  {
    heading: '🔄 El rehén',
    items: [
      'Al acabar el tiempo de cada ronda, cada sala decide POR VOTACIÓN a quién manda de rehén a la otra sala. El más votado de cada sala cambia de sala.',
      'Así, ronda a ronda, la gente (y con ella el Presidente y el Bombardero, sin que se sepa) va cambiando de sala. En la última ronda es cuando de verdad importa dónde acaba cada uno.',
    ],
  },
  {
    heading: '💥 El desenlace',
    items: [
      'Tras el intercambio de la última ronda, la app comprueba dónde acabaron el Presidente y el Bombardero y destapa todas las cartas.',
      'Mismos cuartos → ¡BOOM!, gana el rojo. Cuartos distintos → gana el azul. Se guarda el marcador; jugad las partidas que queráis.',
    ],
  },
];

// ——— Voz del narrador ———

export const TWOROOMS_INTRO =
  'Two Rooms and a Boom. Dos salas, dos bandos secretos. Entre los azules, un Presidente; entre los rojos, un Bombardero. Mirad vuestra carta y la sala que os toca, y colocaos en dos espacios separados.';

/** Pieza fija (sin nombres) que se pregenera como clip; el resto del relato son
 *  líneas del diario con nombres → síntesis en vivo. */
export function allTwoRoomsStaticPieces(): string[] {
  return [TWOROOMS_INTRO];
}

export function lastLogLine(game: TwoRoomsState): string {
  const l = game.log[game.log.length - 1];
  return l ? l.txt.replace(/^[^\p{L}\d]+/u, '').trim() : '';
}
