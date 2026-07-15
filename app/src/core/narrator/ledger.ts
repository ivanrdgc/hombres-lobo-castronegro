// Registro de hitos del narrador: el reemplazo con principios del Set «spoken»
// de la v1. Regla de oro: un hito se marca SOLO tras reproducirse entera la
// locución — así, una escena re-arrancada (pausa, interrupción, relevo)
// re-reproduce la frase cortada y salta lo ya dicho.

export class Ledger {
  private gameId: string | number | null = null;
  private done = new Set<string>();
  private counters = new Map<string, number>();

  /** Olvida todo al cambiar de partida (game.startedAt). */
  resetFor(gameId: string | number | null): void {
    if (gameId !== this.gameId) {
      this.gameId = gameId;
      this.forceReset();
    }
  }

  /** Olvida todo sin cambiar de partida (relevo de narrador: re-narrar). */
  forceReset(): void {
    this.done.clear();
    this.counters.clear();
  }

  has(key: string): boolean {
    return this.done.has(key);
  }

  mark(key: string): void {
    this.done.add(key);
  }

  count(key: string): number {
    return this.counters.get(key) || 0;
  }

  bump(key: string): number {
    const n = this.count(key) + 1;
    this.counters.set(key, n);
    return n;
  }

  /** Re-anunciar una escena: olvida sus hitos (p. ej. repetir sin última locución). */
  clearPrefix(prefix: string): void {
    for (const k of [...this.done]) if (k.startsWith(prefix)) this.done.delete(k);
  }
}
