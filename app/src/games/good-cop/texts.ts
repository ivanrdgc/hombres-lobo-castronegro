// Corpus de «Good Cop Bad Cop»: intro del lobby (▶️), «cómo se juega» y voz.
// Las cartas de integridad OCULTAS no se dicen jamás; la voz relata lo público
// (investigaciones, armas, disparos y el desenlace), que va al diario.
import { cleanForSpeech } from '../../core/util/speech';
import type { GoodCopState } from './types';

export const INTRO_LOBBY: string[] = [
  'Good Cop Bad Cop: una comisaría podrida. Cada uno esconde 3 cartas de integridad, y tu bando es su MAYORÍA: policías honestos contra corruptos. Un honesto es el AGENTE (líder) y un corrupto es el JEFE (líder).',
  'Por turnos: investigas cartas ajenas en secreto, te armas, apuntas… y disparas. Si cae un líder, su bando pierde en el acto. Deduce quién es quién, alía con los tuyos y no te equivoques de diana.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 De qué va',
    items: [
      'Cada jugador tiene 3 cartas de integridad boca abajo (👮 honestas o 🦹 corruptas). Tu BANDO es la mayoría de tus tres cartas; nadie más lo sabe.',
      'Entre los honestos hay un 🕵️ AGENTE y entre los corruptos un 👑 JEFE: los líderes. Ganan los honestos si cae el Jefe; ganan los corruptos si cae el Agente.',
      'La app custodia las cartas: solo tú ves las tuyas (y lo que investigues). Las de un caído se destapan para todos.',
    ],
  },
  {
    heading: '🔍 Tu turno: una acción',
    items: [
      'En tu turno eliges UNA acción en tu móvil: INVESTIGAR (miras en secreto una carta boca abajo de otro), ARMARTE (coges una pistola), APUNTAR (eliges blanco, hay que estar armado) o DISPARAR (al que tienes apuntado).',
      'Investigar es tu radar: lo que ves solo lo ves tú. Armarte y apuntar son públicos: la mesa ve el arma y la diana, y eso ya es presión.',
    ],
  },
  {
    heading: '💥 Disparar',
    items: [
      'Disparar gasta la bala (tendrás que volver a armarte) y elimina al blanco: sus 3 cartas se destapan para todos.',
      'Si el caído era un LÍDER, la partida acaba ahí mismo: pierde su bando. Si no, la partida sigue… y todos han aprendido algo.',
    ],
  },
  {
    heading: '🗣️ El juego sucio (y limpio)',
    items: [
      'Todo lo demás es conversación: presume de honesto, acusa, promete protección… y miente lo justo. Los corruptos quieren cazar al Agente sin destapar a su Jefe; los honestos, al revés.',
      'Consejo: apuntar a alguien es también una pregunta («¿alguien lo defiende?»). Mirad quién se pone nervioso.',
    ],
  },
  {
    heading: '🏆 Ganar',
    items: [
      'La partida termina en cuanto cae un líder: pierde su bando entero (los eliminados incluidos). Todo el bando ganador puntúa.',
      'La app anuncia cada acción en voz alta (nunca las cartas ocultas) y guarda el marcador entre partidas.',
    ],
  },
];

// ——— Voz del narrador ———

export const GC_INTRO =
  'Good Cop Bad Cop. Tres cartas de integridad cada uno: su mayoría es vuestro bando. Entre los honestos, un Agente; entre los corruptos, un Jefe. Investigad, armaos… y que no caiga vuestro líder.';

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

export function allGoodCopStaticPieces(): string[] {
  return [GC_INTRO, ...helpPieces()];
}

export function lastLogLine(game: GoodCopState): string {
  const l = game.log[game.log.length - 1];
  return l ? l.txt.replace(/^[^\p{L}\d]+/u, '').trim() : '';
}
