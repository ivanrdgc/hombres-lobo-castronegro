<script lang="ts">
  // Rejilla 4×4 del tema. `secret` resalta la palabra secreta (solo en la carta
  // privada de quien la conoce, y al final). `selectable` la hace tocable (el
  // Camaleón, para adivinar). `guess` marca la casilla apostada.
  const { grid, secret = null, guess = null, selectable = false, onpick = null }: {
    grid: string[];
    secret?: number | null;
    guess?: number | null;
    selectable?: boolean;
    onpick?: ((i: number) => void) | null;
  } = $props();
</script>

<div class="chgrid">
  {#each grid as w, i (i)}
    <button
      class="cell {secret === i ? 'secret' : ''} {guess === i ? 'guess' : ''}"
      data-a="ch-cell" data-p={String(i)}
      disabled={!selectable}
      onclick={() => selectable && onpick && onpick(i)}
    >{w}</button>
  {/each}
</div>

<style>
  .chgrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 8px 0; }
  .cell {
    aspect-ratio: 1.5; display: flex; align-items: center; justify-content: center; text-align: center;
    padding: 2px; border-radius: 10px; border: 1px solid var(--border, #333);
    background: var(--surface, #1a1c28); color: var(--fg, #eee);
    font-size: 0.74rem; line-height: 1.05; font-weight: 600; word-break: break-word;
  }
  .cell:disabled { cursor: default; }
  .cell.secret { background: #143a24; border-color: #3aa564; color: #d6ffe6; box-shadow: 0 0 0 2px #3aa564 inset; }
  .cell.guess { outline: 3px solid #d8a24a; }
</style>
