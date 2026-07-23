// Estado de una partida de «El Camaleón». Vive ENTERO en el doc de su partida
// (matches/<mid>), con `chameleon: true` como discriminante. La app hace de
// máster oculto: reparte la palabra secreta a todos MENOS al Camaleón y cuenta
// el voto en secreto.

export type Phase =
  | 'reveal' // cada cual mira su carta (la palabra secreta, o que es el Camaleón)
  | 'clue' // por turnos, cada uno dice UNA palabra en voz alta
  | 'vote' // todos señalan en secreto a quien creen el Camaleón
  | 'guess' // si pillan al Camaleón, este intenta adivinar la palabra
  | 'end';

export interface ChameleonState {
  chameleon: true;
  phase: Phase;
  startedAt: number;
  seed: number;
  round: number;
  playerIds: string[];
  names: Record<string, string>;
  /** Tema y rejilla 4×4 de la ronda (PÚBLICOS). */
  topicId: string;
  grid: string[];
  /** Índice (0..15) de la palabra SECRETA (la conocen todos menos el Camaleón). */
  secret: number;
  /** Quién es el Camaleón (SECRETO hasta el final). */
  chameleonId: string;
  seen: Record<string, boolean>;
  /** Quién da la primera pista (índice en playerIds). */
  starterIdx: number;
  /** Voto secreto: votante → señalado. Se destapa al completarse. */
  votes: Record<string, string>;
  /** Señalado por mayoría (null = empate → el Camaleón escapa). */
  accusedId: string | null;
  caught: boolean;
  /** Casilla que adivinó el Camaleón (si lo pillaron). */
  guess: number | null;
  guessedRight: boolean;
  winner: 'chameleon' | 'group' | null;
  scores: Record<string, number>;
  usedTopics: string[];
  paused?: { by: string; name?: string; at: number } | null;
  repeatNonce?: number;
  log: { txt: string }[];
}
