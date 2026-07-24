// Mapa de «Captain Sonar» (adaptación por turnos): rejilla 8×8 con islas fijas
// y simétricas (rotación 180º → las dos mitades son igual de justas). Columnas
// A-H y filas 1-8: la casilla «E5» es x=4, y=4.
export const W = 8;
export const H = 8;

export interface Cell { x: number; y: number }

export const COLS = 'ABCDEFGH';
export const cellName = (c: Cell): string => COLS[c.x] + (c.y + 1);

/** Islas en parejas rotadas 180º: (x,y) ↔ (7−x, 7−y). */
export const ISLANDS: Cell[] = [
  { x: 2, y: 1 }, { x: 5, y: 6 },
  { x: 2, y: 2 }, { x: 5, y: 5 },
  { x: 1, y: 5 }, { x: 6, y: 2 },
  { x: 4, y: 3 }, { x: 3, y: 4 },
];

export const inBounds = (c: Cell): boolean => c.x >= 0 && c.x < W && c.y >= 0 && c.y < H;
export const isIsland = (c: Cell): boolean => ISLANDS.some((i) => i.x === c.x && i.y === c.y);
export const sameCell = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;

export type Dir = 'N' | 'S' | 'E' | 'W';
export const DIRS: Record<Dir, Cell> = { N: { x: 0, y: -1 }, S: { x: 0, y: 1 }, E: { x: 1, y: 0 }, W: { x: -1, y: 0 } };
export const DIR_LABEL: Record<Dir, string> = { N: 'Norte', S: 'Sur', E: 'Este', W: 'Oeste' };
export const DIR_ARROW: Record<Dir, string> = { N: '⬆️', S: '⬇️', E: '➡️', W: '⬅️' };

export const stepTo = (c: Cell, d: Dir): Cell => ({ x: c.x + DIRS[d].x, y: c.y + DIRS[d].y });
export const manhattan = (a: Cell, b: Cell): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const chebyshev = (a: Cell, b: Cell): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** Cuadrante (mitades de 4×4): lo que se anuncia al emerger o con el dron. */
export function quadrantOf(c: Cell): string {
  if (c.y < H / 2) return c.x < W / 2 ? 'Noroeste' : 'Noreste';
  return c.x < W / 2 ? 'Suroeste' : 'Sureste';
}
