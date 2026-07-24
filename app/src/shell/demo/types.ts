// Tutorial interactivo de un solo dispositivo: cada juego define un guion de
// pasos (DemoScript) y el DemoPlayer lo reproduce en un modal — texto + un
// «visual» que imita la pantalla real (carta, fichas, botones, rejilla…) y, a
// veces, una pregunta con opciones para que el usuario se moje. Todo es local:
// no toca Firestore ni exige más jugadores.
import { cleanForSpeech } from '../../core/util/speech';

export interface DemoChip {
  name: string;
  emoji?: string;
  /** Etiqueta pequeña bajo el nombre (p. ej. «Sala 1», «2 monedas»). */
  badge?: string;
  /** Resaltada (como una ficha seleccionada). */
  hl?: boolean;
  dim?: boolean;
}

export type DemoVisual =
  /** Una carta secreta, como la que enseña «👁 Ver mi carta». */
  | { kind: 'card'; emoji: string; title: string; lines?: string[] }
  /** Fichas de jugadores, como en los tableros. */
  | { kind: 'chips'; chips: DemoChip[]; caption?: string }
  /** Botones tal y como se verán (muestra inerte). */
  | { kind: 'buttons'; buttons: { label: string; kind?: 'primary' | 'danger' | 'ghost' }[]; caption?: string }
  /** Filas etiqueta → valor (marcadores, tablas). */
  | { kind: 'board'; rows: { label: string; value: string }[] }
  /** Líneas del diario de la partida. */
  | { kind: 'log'; lines: string[] }
  /** Rejilla de palabras (El Camaleón); hl marca la secreta. */
  | { kind: 'grid'; words: string[]; hl?: number };

export interface DemoChoice {
  label: string;
  /** Qué habría pasado / por qué (se muestra al tocar la opción). */
  reply: string;
  /** Elección acertada (✅); sin marcar, la respuesta enseña el matiz (💡). */
  good?: boolean;
}

export interface DemoStep {
  icon: string;
  title: string;
  text: string[];
  visual?: DemoVisual;
  ask?: { prompt: string; choices: DemoChoice[] };
}

export interface DemoScript {
  /** Id del juego (coincide con GameDefinition.id). */
  id: string;
  name: string;
  emoji: string;
  steps: DemoStep[];
}

/** Título + párrafos de cada paso, limpios: las piezas que lee el ▶️ del
 *  tutorial (se pregeneran como clips). */
export function demoSpeechPieces(demo: DemoScript): string[] {
  return demo.steps.flatMap((s) => [s.title, ...s.text]).map(cleanForSpeech).filter(Boolean);
}
