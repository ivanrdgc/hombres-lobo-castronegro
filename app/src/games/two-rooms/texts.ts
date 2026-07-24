// Corpus de «Two Rooms and a Boom»: intro del lobby (▶️), «cómo se juega» por
// apartados y la voz del narrador. Los bandos y roles OCULTOS no se dicen jamás
// hasta el final; el narrador relata lo público (rondas, reloj, intercambios de
// rehenes y el desenlace), que es lo que va al diario.
import { cleanForSpeech } from '../../core/util/speech';
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
    heading: '🎴 El reparto',
    items: [
      'Al empezar, toca «👁 Ver mi carta y mi sala» y mírala A SOLAS: tu bando (azul o rojo), tu rol (Presidente, Bombardero o carta normal) y tu sala (1 o 2). Pulsa «✅ Lo tengo».',
      'Cuando todos confirman, id cada uno a vuestra sala y que cualquiera pulse «▶️ Empezar la ronda 1»: arranca el reloj.',
    ],
  },
  {
    heading: '🚪 Las dos salas',
    items: [
      'La app os reparte en dos salas (Sala 1 y Sala 2), a la par y mezclando bandos: colocaos físicamente en dos espacios separados.',
      'Quién está en cada sala es público (se ve en el tablero de pantalla). Lo secreto es tu carta: tu bando y si eres Presidente, Bombardero o carta normal.',
    ],
  },
  {
    heading: '🗣️ Las rondas (contrarreloj)',
    items: [
      'Se juegan tres rondas cada vez más cortas (3, 2 y 1 minuto). El temporizador corre en la pantalla de TODOS los móviles; la voz suena según el modo elegido al empezar (un narrador, uno por sala o todos los móviles).',
      'Durante la ronda, dentro de tu sala, hablas y puedes ENSEÑAR tu carta a quien quieras, en privado y cara a cara (eso es cosa vuestra, no de la app).',
      'El objetivo de hablar es averiguar quién es de fiar: los azules quieren localizar al Presidente para protegerlo; los rojos, colar al Bombardero donde esté el Presidente.',
    ],
  },
  {
    heading: '🔄 El voto de rehén',
    items: [
      'Al agotarse el reloj, cada sala vota en su móvil a quién manda de rehén: tocas a alguien de TU sala y pulsas «🗳️ Votar». Puedes votarte a ti mismo (ofrecerte de rehén). El voto es secreto: en pantalla solo se ve cuántos han votado.',
      'Cuando toda la sala ha votado, la app anuncia a su más votado (si hay empate en cabeza, decide el orden de la mesa). Decididas las DOS salas, los dos rehenes se intercambian de sala y empieza la siguiente ronda.',
      'Así, ronda a ronda, la gente (y con ella el Presidente y el Bombardero, sin que se sepa) va cambiando de sala. En la última ronda es cuando de verdad importa dónde acaba cada uno.',
    ],
  },
  {
    heading: '💥 El desenlace',
    items: [
      'Tras el intercambio de la última ronda, la app comprueba dónde acabaron el Presidente y el Bombardero y destapa todas las cartas.',
      'Misma sala → ¡BOOM!, gana el rojo. Salas distintas → gana el azul. Se guarda el marcador; jugad las partidas que queráis.',
    ],
  },
  {
    heading: '🚪 Bajas a mitad de partida',
    items: [
      'Si alguien se marcha (o la mesa lo saca), la partida SIGUE: sus votos se anulan y, si ya era el rehén elegido, su sala vuelve a decidir. Durante el reparto, una baja re-reparte bandos, roles y salas.',
      'Eso sí: si quien abandona es el PRESIDENTE o el BOMBARDERO, su bando se rinde y el otro gana en el acto. Y si quedáis menos de 6, la partida se disuelve sin ganador.',
    ],
  },
];

// ——— Voz del narrador ———

export const TWOROOMS_INTRO =
  'Two Rooms and a Boom. Dos salas, dos bandos secretos. Entre los azules, un Presidente; entre los rojos, un Bombardero. Mirad vuestra carta y la sala que os toca, y colocaos en dos espacios separados.';

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

/** Pieza fija (sin nombres) que se pregenera como clip; el resto del relato son
 *  líneas del diario con nombres → síntesis en vivo. */
export function allTwoRoomsStaticPieces(): string[] {
  return [TWOROOMS_INTRO, ...helpPieces()];
}

export function lastLogLine(game: TwoRoomsState): string {
  const l = game.log[game.log.length - 1];
  return l ? l.txt.replace(/^[^\p{L}\d]+/u, '').trim() : '';
}
