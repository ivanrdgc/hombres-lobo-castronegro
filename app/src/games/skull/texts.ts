// Corpus de «Skull»: intro del lobby (▶️), «cómo se juega» y voz del narrador.
// Las pilas OCULTAS no se dicen jamás; la voz relata lo público (apuestas,
// pujas, qué se levanta y el desenlace), que es lo que va al diario.
import { cleanForSpeech } from '../../core/util/speech';
import type { SkullState } from './types';

export const INTRO_LOBBY: string[] = [
  'Skull es puro farol. Cada uno tiene tres flores y una calavera. Por turnos vais poniendo discos boca abajo en vuestra pila… y en algún momento alguien apuesta cuántas flores es capaz de levantar seguidas, sin toparse una calavera.',
  'Los demás suben la apuesta o pasan. Quien puja más alto tiene que levantar: primero TODOS sus discos, y luego los de arriba de las pilas ajenas. Si solo salen flores, gana el reto; si sale una calavera, pierde un disco. Dos retos ganados y te llevas la partida. La app custodia las pilas: nadie ve lo que pusiste.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 De qué va',
    items: [
      'Cada jugador tiene 4 discos: 3 FLORES 🌸 y 1 CALAVERA 💀. Es un juego de farol y de leer a los demás.',
      'Gana quien consiga DOS retos (o quede como último con discos). Un reto se gana apostando cuántas flores levantarás seguidas… y consiguiéndolo sin destapar una calavera.',
      'La app custodia las pilas boca abajo: solo tú sabes qué discos has puesto y en qué orden.',
    ],
  },
  {
    heading: '🌸 La colocación',
    items: [
      'Cada ronda empieza con todos colocando UN disco boca abajo a la vez (flor o calavera, tú eliges). Es tu «disco de salida».',
      'Luego, por turnos, en el tuyo puedes colocar OTRO disco sobre tu pila… o abrir una apuesta (ver abajo). Si ya no te quedan discos en la mano, tendrás que apostar.',
      'Al cerrar la ronda cada uno RECOGE TODA su pila y vuelve a tener sus discos: lo único que se pierde es el disco descartado por fallar un reto.',
    ],
  },
  {
    heading: '🗣️ La apuesta y las pujas',
    items: [
      'Abrir una apuesta es declarar un número: levantaré tantas flores seguidas sin topar una calavera. Ese número no puede pasar del total de discos que hay en la mesa.',
      'A partir de ahí, por turnos, los demás SUBEN la apuesta (un número mayor) o PASAN. Cuando todos menos uno pasan, ese se la juega: le toca levantar.',
      'Pasar es DEFINITIVO: quien pasa ya no vuelve a pujar en esa ronda. Y si alguien apuesta el total de discos de la mesa, no hay más pujas posibles: se revela directamente.',
    ],
  },
  {
    heading: '🎲 El revelado',
    items: [
      'Quien ganó la puja levanta discos de uno en uno, empezando OBLIGATORIAMENTE por toda su propia pila (de arriba abajo). Luego elige de qué pilas ajenas seguir levantando (el de arriba de cada una).',
      'Si levanta tantas FLORES como apostó, gana el reto (una marca). Si topa una CALAVERA antes de llegar, falla y pierde un disco al azar (¡puede ser su calavera o una flor!) y todos ven cuál fue.',
      'La ronda acaba ahí: se recogen todas las pilas. Empieza la siguiente quien ganó el reto; si falló, empieza el que perdió el disco (o el siguiente jugador si se quedó sin discos).',
    ],
  },
  {
    heading: '🏆 Ganar y perder discos',
    items: [
      'Quien pierde todos sus discos queda eliminado. Si solo queda uno en pie, gana.',
      'El primero en ganar DOS retos se lleva la partida. La app anuncia cada jugada en voz alta (nunca tus discos ocultos) y guarda el marcador.',
    ],
  },
];

// ——— Voz del narrador ———

export const SK_INTRO =
  'Skull. Tres flores y una calavera cada uno. Colocad discos boca abajo y, cuando os atreváis, apostad cuántas flores levantaréis sin topar una calavera. El que puje más alto se la juega. Dos retos ganados y la partida es tuya.';

export function bidLine(name: string, n: number): string {
  return `${name} apuesta ${n} flor${n === 1 ? '' : 'es'}.`;
}
export function endLine(name: string): string {
  return `${name} gana la partida.`;
}

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

export function allSkullStaticPieces(): string[] {
  return [SK_INTRO, ...helpPieces()];
}

export function lastLogLine(game: SkullState): string {
  const l = game.log[game.log.length - 1];
  return l ? l.txt.replace(/^[^\p{L}\d]+/u, '').trim() : '';
}
