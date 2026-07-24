// Corpus de «Shadow Hunters»: intro del lobby (▶️), «cómo se juega» y voz.
// Las identidades se callan hasta que alguien se revela o muere; la voz relata
// lo público (ataques, dados, pistas entregadas y el desenlace) vía diario.
import { cleanForSpeech } from '../../core/util/speech';
import type { ShadowHState } from './types';

// Dos líneas y ninguna más: el lobby las PINTA y el ▶️ las LEE, así que lo que
// se oye y lo que se ve dicen lo mismo. El nombre del juego no se repite aquí
// (ya está en la cabecera de la pantalla).
export const INTRO_LOBBY: string[] = [
  'Una noche eterna con tres bandos ocultos: los 🏹 Cazadores quieren exterminar a las 🌑 Sombras; las Sombras, acabar con los Cazadores; y los 🧭 neutrales van a lo suyo. Nadie sabe quién es quién.',
  'En tu turno eliges UNA acción: dar una pista secreta, atacar con los dados, descansar… o revelarte y usar tu poder. Se juega hablando: deduce, disimula y golpea cuando toque.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 De qué va',
    items: [
      'Cada jugador recibe un personaje SECRETO de una de tres facciones: 🏹 Cazadores, 🌑 Sombras o 🧭 neutrales (con objetivo propio). Solo tú ves el tuyo.',
      'Se juega con el móvil PLANO sobre la mesa, hablando y acusando. Por eso todas las pantallas son iguales mientras nadie las toca: tu personaje solo sale cuando lo pides con el botón del ojo, y se vuelve a tapar solo a los pocos segundos.',
      'El reparto es PÚBLICO y solo depende de cuántos seáis: con 4 o 5 jugadores hay 2 Cazadores y 2 Sombras; con 6 también 2 y 2; con 7 u 8, 3 y 3. Los neutrales son ninguno con 4, uno con 5 y con 7, y dos con 6 y con 8. Lo secreto es quién es quién, no cuántos hay de cada bando.',
      'Los ocho personajes son: 🏹 Cazadores (Georg, Franklin y Fuka), 🌑 Sombras (Vampiro, Licántropo y Valquiria) y 🧭 neutrales (Allie y Bob). Cada uno con su poder; en el botón 🎴 tienes la ficha de todos.',
      'Ganan los Cazadores si mueren TODAS las Sombras; ganan las Sombras si mueren TODOS los Cazadores. Los neutrales ganan aparte si cumplen su objetivo (la app lo comprueba sola).',
      'Todos empiezan con 8 puntos de vida. Quien llega a 0 queda eliminado y su personaje se destapa para todos.',
    ],
  },
  {
    heading: '🎲 Tu turno: una acción',
    items: [
      'Cuando la pantalla diga que te toca, eliges UNA acción en tu móvil: 🔮 PISTA, ⚔️ ATACAR, 💊 DESCANSAR o 🎭 REVELARTE.',
      '🔮 PISTA: eliges a alguien y la app le enseña EN SECRETO una carta del tipo «si eres Sombra, pierdes 1 punto de vida». La mesa solo ve el resultado (pierde vida, se cura o nada)… y de ahí se deduce mucho.',
      'El aviso de que hay una carta de pista sin leer sale en TODAS las pantallas, para que su sola presencia no delate a quién le ha tocado: abrirla solo pueden quien la da y quien la recibe, y el texto se tapa solo.',
      'El mazo de pistas son 8 cartas conocidas por todos (las tienes en el botón 🎴): cuatro quitan 1 punto de vida y cuatro lo curan, según el bando del que la recibe. Ojo: una pista también MATA si te deja a 0.',
      '⚔️ ATACAR: eliges víctima y la app tira un dado de 6 y otro de 4; el daño es su DIFERENCIA, de 0 a 5, y 1 de cada 6 tiradas falla. No hace falta saber quién es: se puede atacar a ciegas… o por sospecha.',
      '💊 DESCANSAR: recuperas 1 punto de vida. Es la jugada discreta: no delata nada de ti.',
      'Al terminar tu acción, el turno pasa al siguiente jugador VIVO en el orden de la mesa.',
    ],
  },
  {
    heading: '🎭 Revelarte y tu poder',
    items: [
      'Una vez por partida puedes REVELARTE en tu turno: tu identidad pasa a ser pública y usas el poder de tu personaje en el acto (curarte, dañar, robar vida…). Al elegir esa acción tienes ahí mismo el botón para repasar tu personaje y su poder antes de confirmar.',
      'Desde que te revelas, tu carta ya no se esconde: se queda escrita en tu pantalla y en el tablero de todos, porque a partir de ahí es información pública.',
      'Revelarte da miedo y poder a la vez: tu bando sabrá quién eres… y el rival también. Elige el momento.',
    ],
  },
  {
    heading: '🧠 Deducir sin destaparse',
    items: [
      'Las pistas son la clave: si tras una pista alguien pierde vida «si no eres Cazador», ya sabes que NO es Cazador. Anuncia, miente o calla lo que viste: la carta de pista solo la leéis quien la dio y quien la recibió.',
      'Habla, acusa y alía: el juego es conversación. Pero recuerda que los neutrales mienten con más soltura: no les importa quién gane.',
    ],
  },
  {
    heading: '🏆 Ganar',
    items: [
      'La partida acaba al caer la última Sombra o el último Cazador. La app anuncia el bando ganador y destapa a todos.',
      'Neutrales: 🧸 Allie gana si está VIVA al terminar; 💰 Bob gana si dio ÉL algún golpe de gracia. Pueden ganar a la vez que un bando.',
    ],
  },
];

// ——— Voz del narrador ———

export const SH_INTRO =
  'Shadow Hunters. Tres bandos ocultos: Cazadores, Sombras y neutrales. En tu turno: pista secreta, ataque con dados, descanso… o revélate y usa tu poder. Que caiga el bando contrario.';

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

export function allShadowHStaticPieces(): string[] {
  return [SH_INTRO, ...helpPieces()];
}

export function lastLogLine(game: ShadowHState): string {
  const l = game.log[game.log.length - 1];
  return l ? l.txt.replace(/^[^\p{L}\d]+/u, '').trim() : '';
}
