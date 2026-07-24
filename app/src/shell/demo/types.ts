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
  | { kind: 'grid'; words: string[]; hl?: number }
  /** Dos (o más) pantallas a la vez: qué ve CADA persona en ese momento. */
  | {
    kind: 'screens';
    panes: {
      title: string;
      lines: string[];
      buttons?: { label: string; kind?: 'primary' | 'danger' | 'ghost' }[];
    }[];
  };

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
  /** Banner «¿quién actúa ahora?»: quién hace qué, y qué hacen los demás
   *  mientras tanto. Es lo que quita la confusión de «¿y yo qué hago?». */
  who?: { actor: string; others: string };
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

/** El banner de turno como frase legible (pantalla y voz usan la misma). */
export function whoLine(who: NonNullable<DemoStep['who']>): string {
  return `${who.actor}. Mientras, ${who.others}`;
}

/** Título + banner de turno + párrafos de cada paso, limpios: las piezas que
 *  lee el ▶️ del tutorial (se pregeneran como clips). */
export function demoSpeechPieces(demo: DemoScript): string[] {
  return demo.steps
    .flatMap((s) => [s.title, ...(s.who ? [whoLine(s.who)] : []), ...s.text])
    .map(cleanForSpeech).filter(Boolean);
}
