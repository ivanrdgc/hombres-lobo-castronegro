// Textos de El Espía: introducción del lobby, «cómo se juega» y el guion del
// narrador (piezas estáticas pregenerables + líneas dinámicas con nombres).
import { cleanForSpeech } from '../../core/util/speech';
import type { EspiaOutcome, EspiaState } from './types';
import { locationById } from './locations';

// ——— Lobby ———

export const INTRO_LOBBY = [
  'Todos sabéis dónde estáis… menos uno. Cada ronda, la mesa entera recibe la misma localización y un papel en ella; el espía solo recibe una cosa: la certeza de que no tiene ni idea.',
  'A base de preguntas y respuestas, los agentes deben cazar al impostor sin regalar el lugar, y el espía debe deducirlo mientras finge saberlo. De 3 a 8 jugadores y rondas de 5, 8 o 10 minutos —lo elegís al empezar— de interrogatorio, faroles y miradas de reojo.',
];

export interface HelpSection {
  title: string;
  body: string[];
}

export const HOW_TO: HelpSection[] = [
  {
    title: '🎴 El reparto',
    body: [
      'De 3 a 8 jugadores, en rondas de 5, 8 o 10 minutos (la mesa elige la duración al empezar; la oficial son 8 minutos). Se juegan las rondas que queráis: el marcador es acumulado.',
      'Cada ronda, todos reciben en su móvil la MISMA localización con un papel distinto (médico de a bordo, crupier, becario…). Uno recibe en su lugar la carta de ESPÍA: no sabe dónde está.',
      'Mira tu carta a solas y confirma; cuando todos han confirmado, cualquiera pone el reloj en marcha. Durante la ronda, el botón flotante 🎴 de la esquina vuelve a enseñarte tu carta y la chuleta de reglas.',
      'La lista completa de localizaciones es pública: consultadla cuando queráis. El espía la necesita para adivinar; los agentes, para no pasarse de listos con las respuestas.',
    ],
  },
  {
    title: '❓ Las preguntas',
    body: [
      'Quien reparte hace la primera pregunta, llamando a alguien por su nombre: «Bea, ¿se te ocurriría venir aquí con niños?». Se responde como se quiera; el interrogado pregunta después a quien quiera.',
      'Prohibido devolver la pregunta a quien te la acaba de hacer. Las respuestas no deben nombrar el lugar, pero tampoco ser tan vagas que te delaten como espía.',
    ],
  },
  {
    title: '🛑 Parar el reloj',
    body: [
      'Una vez por ronda, cada jugador puede parar el reloj y acusar a alguien de ser el espía. Votan los demás (el acusador ya cuenta como «sí»; el acusado no vota): si hay unanimidad, la carta se revela y la ronda TERMINA, sea espía o no. Si alguien discrepa, el reloj sigue y la acusación queda gastada igual.',
      'El acusador puede retirar su acusación si la votación se atasca (alguien no vota): el reloj vuelve a correr, pero su acusación sigue gastada.',
      'El espía puede revelarse e intentar adivinar la localización en cualquier momento de la ronda, también después de que se agote el tiempo; solo se le bloquea mientras hay una votación abierta. Acierte o falle, la ronda termina.',
    ],
  },
  {
    title: '⏰ Si el tiempo se agota',
    body: [
      'Nadie habla más del caso. Empezando por quien repartió y en orden de mesa, cada jugador acusa (o pasa) y se vota igual. En esta tanda acusan todos, incluso quienes ya habían gastado su acusación durante el reloj.',
      'El primer voto unánime cierra la ronda; si nadie es condenado, el espía se marcha de rositas. Si alguien se despista, cualquier otro jugador puede saltar su turno.',
    ],
  },
  {
    title: '🏆 Puntos (varias rondas)',
    body: [
      'El espía: +2 si nadie es condenado · +4 si condenáis a un inocente · +4 si adivina el lugar.',
      'Los agentes, cuando ganan: +1 cada uno, y +1 extra a quien inició la acusación acertada. También ganan +1 si el espía deja la ronda a medias.',
      'Si la mesa se queda con menos de 3 jugadores, la ronda se anula: nadie puntúa. Entre rondas se puede sumar gente nueva y quien quiera puede retirarse.',
      'El reparto rota cada ronda y el lugar no se repite hasta agotar el mazo. Jugad las rondas que queráis: el marcador manda.',
    ],
  },
];

// ——— Guion del narrador (piezas estáticas: se pregeneran como clips) ———

export const ESPIA_INTRO = 'Bienvenidos, agentes. Todos vais a saber dónde ocurre la misión de hoy… todos menos uno: entre vosotros se esconde un espía. Demostrad que conocéis el lugar sin nombrarlo, y desconfiad de las respuestas que patinan.';

export const RONDA_START: string[] = [
  'Nuevas identidades sobre la mesa. Miradlas en secreto y memorizad vuestro papel.',
  'El destino cambia de escenario. Cada cual a su carta, y ojos solo en la propia.',
  'Se reparten papeles nuevos. Leed el vuestro con disimulo: las paredes escuchan.',
];

export const LISTOS_PROMPT = 'Todos conocéis ya vuestra identidad. Cuando queráis, poned el reloj en marcha.';

export const RELOJ_START: string[] = [
  'El reloj está en marcha. Preguntad con astucia y responded con oficio.',
  'Comienza el interrogatorio. Cada respuesta es una pista… o una trampa.',
  'Arranca la ronda. Sonreíd mucho y no os fieis de nadie.',
];

export const WARN_HALF = 'Media ronda consumida, agentes. El espía sigue entre vosotros.';
export const WARN_MIN = 'Queda un minuto. Última oportunidad para las preguntas incómodas.';
export const WARN_10S = 'Diez segundos.';

export const TIMEUP_LINE = '¡Se acabó el tiempo! Nadie hable más del caso. Llega la hora de las acusaciones, por turnos y empezando por quien preguntó primero.';

export const VOTE_HINT = 'Votad todos: cualquier discrepancia devuelve el reloj a la mesa.';
/** Tras el tiempo ya no hay reloj que devolver: solo turnos. */
export const VOTE_HINT_TU = 'Votad todos: cualquier discrepancia tumba la acusación y el turno pasa al siguiente.';

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.title, ...s.body])]
    .map(cleanForSpeech).filter(Boolean);
}

/** Todas las piezas estáticas del guion (para pregenerar clips y su test). */
export function allEspiaStaticPieces(): string[] {
  return [ESPIA_INTRO, ...RONDA_START, LISTOS_PROMPT, ...RELOJ_START, WARN_HALF, WARN_MIN, WARN_10S, TIMEUP_LINE, VOTE_HINT, VOTE_HINT_TU, ...helpPieces()];
}

// ——— Líneas dinámicas (síntesis en vivo, con precalentamiento) ———

/** La voz no lleva emojis ni abreviaturas: limpieza compartida (B20). */
export function cleanSpeech(t: string): string {
  return cleanForSpeech(t);
}

export function startAskLine(name: string): string {
  return `Empieza preguntando ${name}. Y recordad: quien responde, pregunta después.`;
}

// Tras el tiempo el reloj ya no existe: las líneas de votación no pueden
// hablar de detenerlo ni de devolverlo a la mesa (V1).
export function voteLine(accuser: string, accused: string, fromTimeup = false): string {
  return fromTimeup
    ? `En su turno, ${accuser} acusa a ${accused} de ser el espía.`
    : `¡Alto! ${accuser} detiene el reloj y acusa a ${accused} de ser el espía.`;
}

export function voteFailLine(accused: string, fromTimeup = false): string {
  return fromTimeup
    ? `No hay acuerdo: ${accused} sigue en la mesa y el turno pasa al siguiente.`
    : `No hay acuerdo: ${accused} sigue en la mesa y el reloj vuelve a correr.`;
}

export function turnLine(name: string): string {
  return `${name}, señala a tu sospechoso… o pasa.`;
}

export function outcomeSpeech(o: EspiaOutcome, s: EspiaState): string {
  return cleanSpeech(o.txt) + (rankingSpeech(s) ? ' ' + rankingSpeech(s) : '');
}

/** Cabeza del marcador para el cierre de ronda (vacío en la primera).
 *  Los empates se dicen como empates: cantar un líder único cuando hay tres a
 *  la misma puntuación es mentirle a la mesa (R5). */
function rankingSpeech(s: EspiaState): string {
  const entries = Object.entries(s.scores).filter(([, v]) => v > 0);
  if (s.round < 2 || !entries.length) return '';
  const best = Math.max(...entries.map(([, v]) => v));
  const leaders = entries.filter(([, v]) => v === best).map(([pid]) => s.names[pid] || '¿?');
  const pts = `${best} punto${best === 1 ? '' : 's'}`;
  if (leaders.length === 1) return `Tras ${s.round} rondas, encabeza el marcador ${leaders[0]} con ${pts}.`;
  const list = `${leaders.slice(0, -1).join(', ')} y ${leaders[leaders.length - 1]}`;
  return `Tras ${s.round} rondas, empatan en cabeza ${list}, con ${pts} cada uno.`;
}

/** Texto para leer en voz alta la carta propia (lectura local, fuera del reloj). */
export function cardSpeech(s: EspiaState, pid: string): string[] {
  if (pid === s.spyId) {
    return ['Eres el espía.', 'No conoces el lugar. Escucha, deduce y responde con vaguedades convincentes. Cuando creas saberlo, puedes revelarte y adivinar.'];
  }
  const loc = locationById(s.locationId);
  return [`Estás en: ${loc ? loc.name : s.locationId}.`, `Tu papel: ${s.roles[pid] || 'agente'}.`, 'Responde como quien conoce el lugar, sin nombrarlo jamás.'];
}
