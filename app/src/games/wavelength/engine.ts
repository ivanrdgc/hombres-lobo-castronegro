// Motor puro de «Wavelength»: elección de espectro y objetivo, rotación del
// Psíquico y puntuación por cercanía. Sin navegador ni Firebase (testeable).
import { SPECTRUMS, spectrumById } from './spectrums';
import type { Goal, WavelengthState } from './types';

// Con 2 el «equipo» sería una sola persona debatiendo consigo misma (y todos
// los textos hablan en plural): hacen falta 3 para que haya sintonía que medir.
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;

// La diana ocupa el centro ±15: banda central (±4) vale 4, la media (±9) 3 y la
// exterior (±15) 2; fuera, 0. El objetivo evita los extremos para que quepa.
export const BANDS: { max: number; points: number }[] = [
  { max: 4, points: 4 },
  { max: 9, points: 3 },
  { max: 15, points: 2 },
];
export const MAX_POINTS = 4;

export interface Player { id: string; name?: string; order?: number }

export function playersOf(game: WavelengthState): Player[] {
  return (game.playerIds || []).map((id, i) => ({ id, name: game.names?.[id] || id, order: i }));
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** El Psíquico de la ronda (pid). */
export function psychicId(game: WavelengthState): string {
  return game.playerIds[game.psychicIdx % game.playerIds.length];
}

export function isPsychic(game: WavelengthState, pid: string): boolean {
  return psychicId(game) === pid;
}

export interface DealResult {
  spectrumId: string;
  target: number;
}

/** Reparte una ronda: espectro no repetido (hasta agotarse) y objetivo 10..90. */
export function dealRound(usedSpectrums: string[], seed: number): DealResult {
  const rnd = mulberry32(seed);
  let pool = SPECTRUMS.filter((s) => !usedSpectrums.includes(s.id));
  if (!pool.length) {
    const last = usedSpectrums[usedSpectrums.length - 1];
    pool = SPECTRUMS.filter((s) => s.id !== last); // agotados: se rebaraja (sin repetir el último)
  }
  const spectrumId = pool[Math.floor(rnd() * pool.length)].id;
  const target = 10 + Math.floor(rnd() * 81); // 10..90 (la diana cabe sin salirse)
  return { spectrumId, target };
}

/** Puntos por cercanía entre el objetivo y la marca del equipo. */
export function scoreFor(target: number, marker: number): number {
  const d = Math.abs(target - marker);
  for (const b of BANDS) if (d <= b.max) return b.points;
  return 0;
}

export function scoreLabel(points: number): string {
  if (points === 4) return '🎯 ¡En el centro! (4)';
  if (points === 3) return '👏 Muy cerca (3)';
  if (points === 2) return '🙂 Rozando (2)';
  return '😬 Fuera de la diana (0)';
}

/** Metas que ofrece la pantalla de empezar (`n` de rondas se calcula con la
 *  mesa: una «vuelta» es una ronda por jugador, para que todos sean Psíquico). */
export function goalOptions(players: number): (Goal | null)[] {
  return [
    { kind: 'rounds', n: players, label: `Una vuelta a la mesa (${players} rondas)` },
    { kind: 'rounds', n: players * 2, label: `Dos vueltas (${players * 2} rondas)` },
    { kind: 'points', n: 20, label: 'Hasta 20 puntos de equipo' },
    null,
  ];
}

/** ¿Se ha cumplido la meta? (sin meta, nunca: la mesa termina cuando quiera). */
export function goalMet(game: WavelengthState): boolean {
  const g = game.goal;
  if (!g) return false;
  return g.kind === 'rounds' ? game.round >= g.n : game.teamScore >= g.n;
}

/** Media de puntos por ronda puntuada (0 si aún no hay ninguna). */
export function average(total: number, rounds: number): string {
  return rounds > 0 ? (total / rounds).toFixed(1).replace('.', ',') : '—';
}

/** Etiqueta del extremo hacia el que apunta el objetivo (pista para el diario). */
export function targetHint(game: WavelengthState): string {
  const s = spectrumById(game.spectrumId);
  if (!s) return '';
  if (game.target < 40) return s.left;
  if (game.target > 60) return s.right;
  return 'el centro';
}
