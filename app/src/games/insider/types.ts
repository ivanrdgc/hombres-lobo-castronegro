// Estado de una partida de «Insider». Vive ENTERO en el doc de su partida
// (matches/<mid>), con `insider: true` como discriminante. La app hace de máster
// oculto: conoce la palabra, designa al Insider en secreto, cronometra y cuenta
// la caza del Insider.

export type Phase =
  | 'reveal' // cada cual mira su carta (el Maestro y el Insider ven la palabra)
  | 'question' // preguntas de sí/no contrarreloj; el Maestro responde de viva voz
  | 'vote' // adivinada la palabra, se caza al Insider (voto secreto)
  | 'end';

export type Role = 'master' | 'insider' | 'common';

export interface InsiderState {
  insider: true;
  phase: Phase;
  startedAt: number;
  seed: number;
  round: number;
  playerIds: string[];
  names: Record<string, string>;
  /** Palabra a adivinar (SECRETA: solo Maestro e Insider la ven). */
  word: string;
  /** El Maestro es PÚBLICO (responde en voz alta); el Insider, secreto. */
  masterId: string;
  insiderId: string;
  seen: Record<string, boolean>;
  /** Quién pregunta primero (índice en playerIds). */
  starterIdx: number;
  durationMs: number;
  /** Fin del reloj de preguntas (epoch); null salvo en 'question'. */
  deadline: number | null;
  /** Momento en que el Maestro marcó «adivinada» (para la crónica). */
  guessedAt: number | null;
  /** Caza del Insider: votante → señalado (secreto). Votan TODOS (también el
   *  Maestro); no vale señalarse a uno mismo ni al Maestro (es público). */
  votes: Record<string, string>;
  accusedId: string | null;
  /** 'group' = Insider cazado · 'insider' = escapó · 'timeout' = no adivinaron (todos pierden). */
  outcome: 'group' | 'insider' | 'timeout' | null;
  scores: Record<string, number>;
  usedWords: string[];
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
