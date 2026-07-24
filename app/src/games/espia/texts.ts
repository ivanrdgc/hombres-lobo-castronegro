// Textos de El Espía: introducción del lobby, «cómo se juega» y el guion del
// narrador (piezas estáticas pregenerables + líneas dinámicas con nombres).
import { cleanForSpeech } from '../../core/util/speech';
import type { EspiaOutcome, EspiaState } from './types';
import { locationById } from './locations';

// ——— Lobby ———

export const INTRO_LOBBY = [
  'Todos sabéis dónde estáis… menos uno. Cada ronda, la mesa entera recibe la misma localización y un papel en ella; el espía solo recibe una cosa: la certeza de que no tiene ni idea.',
  'A base de preguntas y respuestas, los agentes deben cazar al impostor sin regalar el lugar, y el espía debe deducirlo mientras finge saberlo. Ocho minutos de interrogatorio, faroles y miradas de reojo.',
];

export interface HelpSection {
  title: string;
  body: string[];
}

export const HOW_TO: HelpSection[] = [
  {
    title: '🎴 El reparto',
    body: [
      'Cada ronda, todos reciben en su móvil la MISMA localización con un papel distinto (médico de a bordo, crupier, becario…). Uno recibe en su lugar la carta de ESPÍA: no sabe dónde está.',
      'Mira tu carta a solas y confirma; cuando todos han confirmado, cualquiera pone el reloj en marcha.',
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
      'Una vez por ronda, cada jugador puede parar el reloj y acusar a alguien de ser el espía. Votan los demás (el acusador ya cuenta como «sí»; el acusado no vota): si hay unanimidad, la carta se revela y la ronda TERMINA, sea espía o no. Si alguien discrepa, el reloj sigue.',
      'El espía puede, en cualquier momento (nunca durante una votación), revelarse e intentar adivinar la localización. Acierte o falle, la ronda termina.',
    ],
  },
  {
    title: '⏰ Si el tiempo se agota',
    body: [
      'Nadie habla más del caso. Empezando por quien repartió y en orden de mesa, cada jugador acusa (o pasa) y se vota igual. El primer voto unánime cierra la ronda; si nadie es condenado, el espía se marcha de rositas.',
    ],
  },
  {
    title: '🏆 Puntos (varias rondas)',
    body: [
      'El espía: +2 si nadie es condenado · +4 si condenáis a un inocente · +4 si adivina el lugar.',
      'Los agentes, cuando ganan: +1 cada uno, y +1 extra a quien inició la acusación acertada.',
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

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.title, ...s.body])]
    .map(cleanForSpeech).filter(Boolean);
}

/** Todas las piezas estáticas del guion (para pregenerar clips y su test). */
export function allEspiaStaticPieces(): string[] {
  return [ESPIA_INTRO, ...RONDA_START, LISTOS_PROMPT, ...RELOJ_START, WARN_HALF, WARN_MIN, WARN_10S, TIMEUP_LINE, VOTE_HINT, ...helpPieces()];
}

// ——— Líneas dinámicas (síntesis en vivo, con precalentamiento) ———

/** La voz no lleva emojis ni abreviaturas: limpieza compartida (B20). */
export function cleanSpeech(t: string): string {
  return cleanForSpeech(t);
}

export function startAskLine(name: string): string {
  return `Empieza preguntando ${name}. Y recordad: quien responde, pregunta después.`;
}

export function voteLine(accuser: string, accused: string): string {
  return `¡Alto! ${accuser} detiene el reloj y acusa a ${accused} de ser el espía.`;
}

export function voteFailLine(accused: string): string {
  return `No hay acuerdo: ${accused} sigue en la mesa y el reloj vuelve a correr.`;
}

export function turnLine(name: string): string {
  return `${name}, señala a tu sospechoso… o pasa.`;
}

export function outcomeSpeech(o: EspiaOutcome, s: EspiaState): string {
  return cleanSpeech(o.txt) + (rankingSpeech(s) ? ' ' + rankingSpeech(s) : '');
}

/** Cabeza del marcador para el cierre de ronda (vacío en la primera). */
function rankingSpeech(s: EspiaState): string {
  const entries = Object.entries(s.scores).filter(([, v]) => v > 0);
  if (s.round < 2 || !entries.length) return '';
  const top = entries.sort((a, b) => b[1] - a[1])[0];
  const name = s.names[top[0]] || '¿?';
  return `Tras ${s.round} rondas, encabeza el marcador ${name} con ${top[1]} punto${top[1] === 1 ? '' : 's'}.`;
}

/** Texto para leer en voz alta la carta propia (lectura local, fuera del reloj). */
export function cardSpeech(s: EspiaState, pid: string): string[] {
  if (pid === s.spyId) {
    return ['Eres el espía.', 'No conoces el lugar. Escucha, deduce y responde con vaguedades convincentes. Cuando creas saberlo, puedes revelarte y adivinar.'];
  }
  const loc = locationById(s.locationId);
  return [`Estás en: ${loc ? loc.name : s.locationId}.`, `Tu papel: ${s.roles[pid] || 'agente'}.`, 'Responde como quien conoce el lugar, sin nombrarlo jamás.'];
}
