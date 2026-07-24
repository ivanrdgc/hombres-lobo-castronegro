// Corpus de «Shadow Hunters»: intro del lobby (▶️), «cómo se juega» y voz.
// Las identidades se callan hasta que alguien se revela o muere; la voz relata
// lo público (ataques, dados, pistas entregadas y el desenlace) vía diario.
import { cleanForSpeech } from '../../core/util/speech';
import type { ShadowHState } from './types';

export const INTRO_LOBBY: string[] = [
  'Shadow Hunters: una noche eterna con tres bandos ocultos. Los Cazadores quieren exterminar a las Sombras; las Sombras, acabar con los Cazadores; y los neutrales van a la suya. Nadie sabe quién es quién.',
  'En tu turno eliges UNA acción: dar una pista secreta, atacar con los dados de la app, descansar… o revelar tu identidad para usar tu poder. Deduce, disimula y golpea cuando toque.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 De qué va',
    items: [
      'Cada jugador recibe un personaje SECRETO de una de tres facciones: 🏹 Cazadores, 🌑 Sombras o 🧭 neutrales (con objetivo propio). Solo tú ves el tuyo, en tu móvil (botón 🎴).',
      'Ganan los Cazadores si mueren TODAS las Sombras; ganan las Sombras si mueren TODOS los Cazadores. Los neutrales ganan aparte si cumplen su objetivo (la app lo comprueba sola).',
      'Todos empiezan con 10 puntos de vida. Quien llega a 0 queda eliminado y su personaje se destapa para todos.',
    ],
  },
  {
    heading: '🎲 Tu turno: una acción',
    items: [
      'Cuando la pantalla diga que te toca, eliges UNA acción en tu móvil: 🔮 PISTA, ⚔️ ATACAR, 💊 DESCANSAR o 🎭 REVELARTE.',
      '🔮 PISTA: eliges a alguien y la app le enseña EN SECRETO una carta del tipo «si eres Sombra, pierdes 1 punto de vida». La mesa solo ve el resultado (pierde vida, se cura o nada)… y de ahí se deduce mucho.',
      '⚔️ ATACAR: eliges víctima y la app tira dos dados; el daño es su DIFERENCIA (si empatan, fallas). No hace falta saber quién es: se puede atacar a ciegas… o por sospecha.',
      '💊 DESCANSAR: recuperas 1 punto de vida.',
    ],
  },
  {
    heading: '🎭 Revelarte y tu poder',
    items: [
      'Una vez por partida puedes REVELARTE en tu turno: tu identidad pasa a ser pública y usas el poder de tu personaje en el acto (curarte, dañar, robar vida…). Cada personaje tiene el suyo: míralo en 🎴.',
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
