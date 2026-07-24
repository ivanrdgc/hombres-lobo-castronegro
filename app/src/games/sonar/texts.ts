// Corpus de «Captain Sonar»: intro del lobby (▶️), «cómo se juega» y voz.
// Las posiciones y estelas jamás se dicen; la voz relata lo PÚBLICO (rumbos
// anunciados, torpedos, dron, emersiones y el desenlace) leyendo el diario.
import { cleanForSpeech } from '../../core/util/speech';
import {
  COST_DRONE, COST_SILENCE, COST_TORPEDO, MAX_ENERGY, SILENCE_MAX_STEPS, TORPEDO_RANGE,
} from './engine';
import type { SonarState } from './types';

export const INTRO_LOBBY: string[] = [
  'Captain Sonar: dos submarinos se cazan a ciegas en el mismo mapa. Cada tripulación ve SOLO su submarino; cada rumbo («¡Norte!») se anuncia en voz alta… y el rival lo va apuntando para triangularte.',
  'Por turnos: navega (cargas energía), lanza un torpedo, suelta el dron, maniobra en silencio o emerge. Acorrala al enemigo con sus propios anuncios y húndelo antes de que te hunda.',
];

export interface HelpSection { heading: string; items: string[] }

export const HOW_TO: HelpSection[] = [
  {
    heading: '🎯 De qué va',
    items: [
      'Dos tripulaciones, la Roja 🔴 y la Azul 🔵, cada una con un submarino en un mapa de 8×8 con islas. Tu posición y tu estela son SECRETAS: solo tu equipo las ve en sus móviles.',
      'Se juega de 2 a 10 personas, pero el juego brilla de 4 a 6: dos tripulaciones que puedan deliberar. Con 2 es un duelo de dos solitarios.',
      'Lo mejor es sentarse en dos corros separados, cada tripulación con sus móviles. La voz puede sonar en un narrador, en un altavoz por equipo o en todos los móviles (se elige al empezar).',
      'Se juega POR TURNOS ALTERNOS y con UNA sola acción por turno: hacéis vuestra jugada y el turno pasa al otro submarino. (El Captain Sonar de mesa es en tiempo real; esta adaptación, no: aquí nadie corre.)',
      'Gana quien deje al rival sin casco: cada submarino aguanta 3 puntos de daño. La vida ❤️ y la energía ⚡ de ambos son públicas.',
    ],
  },
  {
    heading: '🧭 Navegar (y ser escuchado)',
    items: [
      'En el turno de tu submarino, CUALQUIERA de la tripulación maneja el móvil: decidid juntos y pulsad UNA acción.',
      'NAVEGAR mueve una casilla (Norte, Sur, Este u Oeste) y carga +1 de energía ⚡. El rumbo se anuncia a toda la mesa: el rival lo apunta y te va acorralando.',
      'Navegar es la ÚNICA forma de cargar: los sistemas solo gastan. El depósito tiene tope de 6 de energía ⚡ (lo que sobre se pierde).',
      'No puedes pisar islas, salirte del mapa ni cruzar tu propia ESTELA (las casillas por las que ya pasaste). Si te encajonas, tendrás que emerger.',
    ],
  },
  {
    heading: '💥 Sistemas (gastan energía)',
    items: [
      '🚀 TORPEDO (cuesta 3 de energía ⚡): eliges una casilla a 4 casillas o menos contando en línea recta (las diagonales cuentan 2: una de lado y otra de frente).',
      'Impacto directo en esa casilla: 2 de daño. En las 8 casillas que la rodean, diagonales incluidas: 1 de daño… y eso vale también para TU submarino si disparas demasiado cerca. El disparo y su resultado se anuncian.',
      '🛰️ DRON (cuesta 2 de energía ⚡): la app canta EN ALTO el cuadrante real donde está el rival. Un cuadrante es un cuarto del mapa, de 4×4 casillas: Noroeste, Noreste, Suroeste o Sureste.',
      '🤫 SILENCIO (cuesta 3 de energía ⚡): te mueves 1 o 2 casillas en línea recta SIN anunciar el rumbo (las dos cuentan como estela). No carga energía, pero es lo único que rompe la triangulación del rival.',
      '⏫ EMERGER (gratis, siempre legal): borras tu estela para volver a maniobrar… a cambio de cantar el cuadrante donde estás.',
    ],
  },
  {
    heading: '🗺️ Triangular al rival',
    items: [
      'Cada submarino empieza en las 3 columnas de su lado: el Rojo en la A, la B o la C; el Azul en la F, la G o la H. Es el dato que lo hace abordable: los puntos de partida posibles pasan de 56 a poco más de 20.',
      'Apunta sus anuncios: la tira de rumbos del rival (⬆️⬇️⬅️➡️) sale numerada en tu pantalla. Prueba a seguir su ruta desde varios orígenes posibles: las islas y los bordes descartan caminos.',
      'Debajo tienes el CUADERNO DE SONAR: un mapa en blanco donde cada toque marca la casilla como descartada ❌ y, al segundo toque, como candidata ⭕ (el tercero la limpia). Es privado de tu móvil y no se sincroniza: es vuestro papel y boli.',
      'El dron y las emersiones te dan anclas («está en el Noreste»); los torpedos fallidos también informan. Cuando su posición encaje… ¡torpedo!',
    ],
  },
  {
    heading: '🏆 Ganar y puntuar',
    items: [
      'Hunde al rival (déjalo a 0 de vida ❤️) y toda tu tripulación puntúa: +1 punto para CADA tripulante. El marcador se acumula partida tras partida.',
      'No hay empate: si un mismo torpedo hunde a los dos submarinos a la vez, gana el que NO disparó. Si te hundes con tu propio torpedo, la victoria es suya.',
      'Al terminar, la app revela las posiciones finales de los dos submarinos. «Otra partida» mantiene las MISMAS tripulaciones (nadie cambia de corro) y solo recoloca los submarinos.',
    ],
  },
];

// ——— Las 5 acciones: la referencia ———
// Una sola definición y UN SOLO NOMBRE (B34) para los dos sitios donde se
// consulta: la pastilla «📖 Reglas» y el desplegable plegado DENTRO del panel de
// turno (B25 · punto 4), para que nadie tenga que salir de la pantalla en la que
// está decidiendo. El rótulo también es el mismo en los dos: ACTIONS_TITLE.

/** Cómo se llama esta lista, se abra por donde se abra. */
export const ACTIONS_TITLE = '📖 Las 5 acciones, sus costes y sus reglas';

export interface ActionRef { emoji: string; name: string; note: string; desc: string }

export const ACTION_REF: ActionRef[] = [
  {
    emoji: '🧭',
    name: 'Navegar',
    note: `gratis · +1 ⚡ (tope ${MAX_ENERGY})`,
    desc: 'Una casilla al Norte, Sur, Este u Oeste. El rumbo SE CANTA a toda la mesa: el rival lo apunta. Es la ÚNICA forma de cargar energía. Prohibido: islas, bordes y vuestra propia estela.',
  },
  {
    emoji: '🚀',
    name: 'Torpedo',
    note: `${COST_TORPEDO} ⚡`,
    desc: `Casilla a ${TORPEDO_RANGE} o menos contando en línea recta (las diagonales cuentan 2). Directo: 2 de daño; las 8 casillas que la rodean, diagonales incluidas: 1… también a VUESTRO submarino si disparáis pegados.`,
  },
  {
    emoji: '🛰️',
    name: 'Dron',
    note: `${COST_DRONE} ⚡`,
    desc: 'La app canta EN ALTO el cuadrante real del rival: un cuarto del mapa de 4×4 (Noroeste, Noreste, Suroeste o Sureste). No os movéis.',
  },
  {
    emoji: '🤫',
    name: 'Silencio',
    note: `${COST_SILENCE} ⚡`,
    desc: `Os deslizáis 1 o ${SILENCE_MAX_STEPS} casillas en línea recta SIN cantar el rumbo (la mesa solo sabe que os movisteis): lo único que rompe su triangulación. No carga energía y las casillas atravesadas cuentan como estela.`,
  },
  {
    emoji: '⏫',
    name: 'Emerger',
    note: 'gratis · siempre legal',
    desc: 'Borra vuestra estela para volver a maniobrar… a cambio de cantar vuestro cuadrante. Es la salida cuando la estela os encierra: siempre se puede.',
  },
];

// ——— Voz del narrador ———

export const SONAR_INTRO =
  'Captain Sonar. Dos submarinos, posiciones secretas: cada rumbo se anuncia en voz alta y el rival lo apunta. Navegad para cargar energía; torpedo, dron, silencio o emerger. Que se hunda el suyo.';

/** Textos del lobby y la ayuda, limpios tal y como los lee el ▶️ local. */
function helpPieces(): string[] {
  return [...INTRO_LOBBY, ...HOW_TO.flatMap((s) => [s.heading, ...s.items])]
    .map(cleanForSpeech).filter(Boolean);
}

export function allSonarStaticPieces(): string[] {
  return [SONAR_INTRO, ...helpPieces()];
}

export function lastLogLine(game: SonarState): string {
  const l = game.log[game.log.length - 1];
  return l ? l.txt.replace(/^[^\p{L}\d]+/u, '').trim() : '';
}
