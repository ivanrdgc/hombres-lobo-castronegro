// Corpus de «Ávalon»: textos del lobby (lectura local ▶️), la ayuda y la voz
// del narrador. Las piezas SIN nombres son estáticas → se pregeneran como clips
// (allAvalonStaticPieces); las que llevan nombres se sintetizan en runtime (su
// latencia no delata nada: son anuncios públicos de día).
import { cleanForSpeech } from '../../core/util/speech';
import { MIN_PLAYERS, MAX_PLAYERS, evilCountFor, teamSizes } from './roles';
import type { Team } from './roles';

/** Una fila de la tabla oficial en una frase (misma fuente que el motor: si
 *  cambia `roles.ts`, la ayuda y la chuleta cambian con él). */
export function sizesLine(n: number): string {
  const evil = evilCountFor(n);
  return `${n} jugadores: equipos de ${teamSizes(n).join('-')} en las misiones 1 a 5, con ${evil} malvados y ${n - evil} leales.`;
}

const ALL_SIZES: string[] = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, i) => sizesLine(MIN_PLAYERS + i),
);

export const INTRO_LOBBY: string[] = [
  'Ávalon: el reino de Arturo se juega su destino en cinco misiones. Entre vosotros hay leales… y esbirros de Mordred infiltrados que solo quieren que las misiones fracasen.',
  'Cada misión la propone un líder y la vota toda la mesa; si se aprueba, el equipo parte y, en secreto, cada miembro decide si tiene éxito o la sabotea. El Bien gana con tres éxitos; el Mal, con tres sabotajes… o desenmascarando a Merlín al final.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 De qué va',
    items: [
      'Sois caballeros de la corte del rey Arturo… pero entre vosotros se han infiltrado esbirros de Mordred. A lo largo de la partida se emprenden cinco MISIONES: los leales quieren que salgan bien; los infiltrados, sabotearlas sin que se note.',
      'Gana el BIEN si tres misiones tienen ÉXITO (pero aún tendrá que sobrevivir al Asesino, ver más abajo). Gana el MAL si tres misiones FRACASAN… o si cinco propuestas de equipo seguidas se rechazan (el reino cae en el caos).',
      'La app reparte las lealtades y lleva todas las cuentas en secreto: nadie hace de máster, nadie cierra los ojos y nadie toca cartas ajenas.',
    ],
  },
  {
    // A2: la tabla oficial completa. Una mesa nueva necesita verla para planificar
    // (y para cazar incoherencias), no solo el «la app te dice cuántos» de la fase 1.
    heading: '🔢 Los números de la mesa',
    items: [
      'La app aplica sola la tabla oficial, pero conviene tenerla a mano. Cuántos van a cada misión y cómo se reparten los bandos:',
      ...ALL_SIZES,
      'Regla especial: a partir de 7 jugadores, la CUARTA misión necesita DOS sabotajes para fracasar (con uno solo se salva). Es el respiro del Bien.',
      'Y el reloj de arena del Mal: cinco propuestas de equipo rechazadas seguidas en la misma misión y gana el Mal sin sabotear nada.',
    ],
  },
  {
    heading: '🌙 El reparto: lo que sabe cada uno',
    items: [
      'Al empezar, cada jugador mira su carta en su móvil (a solas) y confirma. Ahí la app le enseña SU información secreta, calculada según los roles en juego:',
      '😈 Los malvados (Esbirros, Asesino, Morgana, Mordred) se ven ENTRE SÍ… salvo Oberón, que juega solo: no ve a los suyos ni ellos a él (pero Merlín SÍ lo ve).',
      '🧙 Merlín sabe QUIÉNES son malvados, aunque no qué papel tiene cada uno, y con una trampa: NO ve a Mordred (si está en juego). Debe guiar al Bien sin delatar que lo sabe todo.',
      '🛡️ Percival ve a Merlín y a Morgana como dos candidatos, SIN saber quién es el verdadero Merlín: su misión es adivinarlo y protegerlo.',
      '🤴 Los Leales Servidores no saben nada: deducen por las propuestas, los votos y los sabotajes.',
    ],
  },
  {
    heading: '🧭 Fase 1 · El líder propone equipo',
    items: [
      'Cada misión la organiza un LÍDER (el cargo rota por la mesa en cada propuesta). En su móvil elige quiénes irán a la misión; la app le dice cuántos según el número de jugadores y la misión.',
      'El líder puede incluirse a sí mismo. Elegir bien el equipo es medio juego: un solo infiltrado dentro basta para hundir casi cualquier misión.',
      'Los demás ven en su pantalla a quién ha propuesto y se preparan para votar.',
    ],
  },
  {
    heading: '🗳️ Fase 2 · Todos votan el equipo',
    items: [
      'TODA la mesa (vayan o no en la misión) vota en secreto: 👍 aprobar o 👎 rechazar ESE equipo. Nadie ve los votos ajenos hasta que han votado todos.',
      'La app los destapa A LA VEZ, y son públicos (como en el juego de mesa): se ve quién aprobó y quién rechazó — información valiosísima para deducir. Tras leerlo, cualquiera pulsa «⚔️ A la misión» si se aprobó, o «↪️ Siguiente propuesta» si se rechazó.',
      'Si hay mayoría de aprobación, el equipo parte a la misión. Si hay empate o mayoría de rechazo, el liderazgo pasa al siguiente jugador y se vuelve a proponer.',
      '⚠️ Cuidado: si se rechazan CINCO propuestas seguidas en la misma misión, el reino cae en el caos y gana el Mal. No bloqueéis eternamente.',
    ],
  },
  {
    heading: '⚔️ Fase 3 · La misión (en secreto)',
    items: [
      'Solo los miembros del equipo aprobado actúan: cada uno juega en secreto una carta de ÉXITO o FRACASO en su móvil.',
      'Los del BIEN solo pueden jugar Éxito (la app no les deja sabotear). Los del MAL pueden elegir: cumplir para no levantar sospechas… o sabotear.',
      'La app baraja las cartas y solo anuncia CUÁNTOS sabotajes hubo, nunca quién: un solo Fracaso hunde la misión. Excepción oficial: la CUARTA misión, con 7 o más jugadores, necesita DOS sabotajes para fracasar.',
    ],
  },
  {
    heading: '🗡️ El final y el Asesino',
    items: [
      'Cuando un bando llega a tres misiones a su favor se resuelve la partida… pero el Bien aún no canta victoria.',
      'Si el BIEN completa tres misiones, el Asesino tiene una última bala: señala a quien crea que es Merlín. Si ACIERTA, el Mal roba la victoria; si falla, gana el Bien.',
      'Por eso Merlín debe guiar sin cantarse demasiado, y Percival debe protegerlo desviando las sospechas del Asesino.',
    ],
  },
  {
    heading: '🎭 Los roles',
    items: [
      'Abajo tienes cada rol como una ficha: tócala para ver en detalle qué sabe, qué bando es y cómo sacarle partido.',
      '🎚️ En el lobby podéis activar roles opcionales (Percival, Morgana, Mordred, Oberón) para dar más chicha; Merlín y el Asesino están siempre.',
      // A4: los tres opcionales del Mal compiten por las MISMAS plazas (dealRoles
      // los mete en este orden y descarta los que no caben), y a 5-6 solo entra uno.
      '⚠️ Ojo con los tres opcionales del MAL: comparten las plazas de malvado con el Asesino, que siempre ocupa una. Con 5 o 6 jugadores (2 malvados) solo entra UNO; con 7 a 9 (3 malvados) entran dos; con 10 caben los tres.',
      'Si activas más de los que caben, la app se queda con los primeros por este orden —Morgana, luego Mordred, luego Oberón— y te avisa en «Empezar partida» de cuáles se han quedado fuera.',
    ],
  },
];

// ——— Voz del narrador ———

export const AV_INTRO =
  'Bienvenidos a Ávalon. He repartido las lealtades en secreto: mirad vuestra carta, memorizad lo que sabéis y confirmad. Que ni una mirada delate a Merlín.';

export const LISTOS = 'Todos conocéis vuestra lealtad. Que comience la primera misión.';

// V3: sin estas dos, el altavoz callaba justo en las fases en las que la mesa
// está esperando a que alguien toque su móvil. Son estáticas (sin nombres) para
// que salgan de clip pregenerado, al instante.
export const VOTE_LINE =
  'El equipo está sobre la mesa. Votad todos en vuestro móvil: aprobar o rechazar. Nadie verá los votos hasta que hayáis votado todos.';

export const QUEST_LINE =
  'Los elegidos, mirad vuestro móvil: cada uno juega su carta en secreto, éxito o sabotaje. Los demás, esperad sin decir nada.';

export const ASSASSIN_LINE =
  'El Bien ha completado tres misiones… pero aún no ha ganado. Asesino, ha llegado tu momento: señala a quien creas que es Merlín. Si aciertas, el Mal se lo lleva todo.';

/** Anuncio de misión con el nombre del líder (runtime). */
export function missionLine(quest: number, leaderName: string, teamN: number): string {
  return `Misión ${quest}. Lidera ${leaderName}: debe proponer un equipo de ${teamN}.`;
}
export function reproposeLine(leaderName: string, track: number): string {
  return `Propuesta rechazada. Van ${track} de cinco. Ahora propone ${leaderName}.`;
}
export function voteResultLine(approved: boolean, forN: number, againstN: number): string {
  return approved
    ? `Propuesta aprobada, ${forN} contra ${againstN}. El equipo parte a la misión.`
    : `Propuesta rechazada, ${forN} a favor y ${againstN} en contra.`;
}
export function questResultLine(quest: number, success: boolean, fails: number): string {
  if (success) return `La misión ${quest} ha sido un éxito. El Bien se acerca a la gloria.`;
  return fails === 1
    ? `La misión ${quest} ha FRACASADO: una mano traidora la ha saboteado.`
    : `La misión ${quest} ha FRACASADO: ${fails} traidores la han saboteado.`;
}
export function endLine(winner: Team, reason: string): string {
  const head = winner === 'good' ? 'El Bien triunfa en Ávalon.' : 'El Mal se adueña de Ávalon.';
  return `${head} ${reason}`;
}

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

/** Todas las piezas ESTÁTICAS (sin nombres) para pregenerar clips en la F6. */
export function allAvalonStaticPieces(): string[] {
  return [AV_INTRO, LISTOS, VOTE_LINE, QUEST_LINE, ASSASSIN_LINE, ...helpPieces()];
}
