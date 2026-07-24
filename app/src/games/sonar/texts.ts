// Corpus de «Captain Sonar»: intro del lobby (▶️), «cómo se juega» y voz.
// Las posiciones y estelas jamás se dicen; la voz relata lo PÚBLICO (rumbos
// anunciados, torpedos, dron, emersiones y el desenlace) leyendo el diario.
import { cleanForSpeech } from '../../core/util/speech';
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
      'Dos tripulaciones (🔴 y 🔵), cada una con un submarino en un mapa de 8×8 con islas. Tu posición y tu estela son SECRETAS: solo tu equipo las ve en sus móviles.',
      'Lo mejor es sentarse en dos corros separados, cada tripulación con sus móviles. La voz puede sonar en un narrador, en un altavoz por equipo o en todos los móviles (se elige al empezar).',
      'Gana quien deje al rival sin casco: cada submarino aguanta 3 puntos de daño. La vida ❤️ y la energía ⚡ de ambos son públicas.',
    ],
  },
  {
    heading: '🧭 Navegar (y ser escuchado)',
    items: [
      'En el turno de tu submarino, CUALQUIERA de la tripulación maneja el móvil: decidid juntos y pulsad UNA acción.',
      'NAVEGAR mueve una casilla (Norte, Sur, Este u Oeste) y carga +1 ⚡. El rumbo se anuncia a toda la mesa: el rival lo apunta y te va acorralando.',
      'No puedes pisar islas, salirte del mapa ni cruzar tu propia ESTELA (las casillas por las que ya pasaste). Si te encajonas, tendrás que emerger.',
    ],
  },
  {
    heading: '💥 Sistemas (gastan energía)',
    items: [
      '🚀 TORPEDO (3 ⚡): eliges una casilla a distancia 4 o menos. Impacto directo: 2 de daño; casillas pegadas: 1 (¡cuidado, tu propio submarino también sufre la onda!). El disparo y su resultado se anuncian.',
      '🛰️ DRON (2 ⚡): la app canta EN ALTO el cuadrante real donde está el rival (Noroeste, Noreste, Suroeste o Sureste).',
      '🤫 SILENCIO (3 ⚡): te mueves una casilla SIN anunciar el rumbo. Ideal para despistar tras un dron enemigo.',
      '⏫ EMERGER (gratis, siempre legal): borras tu estela para volver a maniobrar… a cambio de cantar el cuadrante donde estás.',
    ],
  },
  {
    heading: '🗺️ Triangular al rival',
    items: [
      'Apunta sus anuncios: la tira de rumbos del rival (⬆️⬇️⬅️➡️) sale en tu pantalla. Prueba a seguir su ruta desde varios orígenes posibles: las islas y los bordes descartan caminos.',
      'El dron y las emersiones te dan anclas («está en el Noreste»); los torpedos fallidos también informan. Cuando su posición encaje… ¡torpedo!',
    ],
  },
  {
    heading: '🏆 Ganar',
    items: [
      'Hunde al rival (déjalo a 0 ❤️) y toda tu tripulación puntúa. Si te hundes con tu propio torpedo, la victoria es suya.',
      'Al terminar, la app revela las posiciones finales de los dos submarinos.',
    ],
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
