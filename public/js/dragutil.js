// Geometría de la reordenación por arrastre en una rejilla de una o varias
// columnas. Función pura (sin DOM) para poder probarla: dada la posición de los
// bloques (rects, en orden de lectura) y la del cursor, devuelve el índice del
// bloque ANTES del cual insertar el arrastrado, o rects.length para el final.
export function seatInsertIndex(rects, x, y) {
  for (let i = 0; i < rects.length; i++) {
    const b = rects[i];
    const cx = b.left + b.width / 2;
    const cy = b.top + b.height / 2;
    const half = b.height / 2;
    if (y < cy - half) return i;   // el cursor está por encima de este bloque → insertar aquí
    if (y > cy + half) continue;   // el cursor está por debajo → seguir buscando
    // El cursor está a la altura de este bloque. Si comparte fila con otros
    // (varias columnas), la posición la decide la X; si va solo en su fila (una
    // sola columna), la decide la Y: mitad superior antes, mitad inferior después.
    const shared = rects.some((r, j) => j !== i && Math.abs(r.top - b.top) < half);
    if (shared ? x < cx : y < cy) return i;
  }
  return rects.length;
}
