<script lang="ts">
  // Parrilla pública de localizaciones (la «carta de referencia» del juego
  // físico). Tres modos: consulta, selección (la apuesta del espía) y tachado
  // local (descartes propios: se ven en gris y tachados, solo en este móvil).
  import { LOCATIONS } from '../locations';

  const { selectable = false, selected = null, onPick, crossable = false, crossed = null }: {
    selectable?: boolean;
    selected?: string | null;
    onPick?: (id: string) => void;
    /** Cada toque tacha o destacha (el id llega por onPick). */
    crossable?: boolean;
    /** id → tachada por MÍ (marca local, nadie más la ve). */
    crossed?: Record<string, boolean> | null;
  } = $props();

  const isCrossed = (id: string) => !!crossed?.[id];
</script>

<div class="chips {crossable ? 'dense' : ''}">
  {#each LOCATIONS as l (l.id)}
    {#if selectable}
      <button class="chip rolechip {selected === l.id ? 'sel' : ''} {isCrossed(l.id) && selected !== l.id ? 'fallen' : ''}"
        data-a="espia-lugar" data-p={l.id} aria-pressed={selected === l.id}
        onclick={() => onPick?.(l.id)}>{selected === l.id ? '✅ ' : ''}{l.emoji} {l.name}</button>
    {:else if crossable}
      <button class="chip rolechip {isCrossed(l.id) ? 'fallen' : ''}"
        data-a="espia-lugar-tacha" data-p={l.id} aria-pressed={isCrossed(l.id)}
        onclick={() => onPick?.(l.id)}>{l.emoji} {l.name}</button>
    {:else}
      <span class="chip" data-p={l.id}>{l.emoji} {l.name}</span>
    {/if}
  {/each}
</div>

<style>
  .chip.sel {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 22%, transparent);
    font-weight: 700;
  }
  /* Objetivo de toque cómodo: 30 pastillas se pulsan con el pulgar, de pie. */
  button.rolechip { min-height: 44px; }
  /* Modo tachado: dos columnas, como la carta de referencia de la caja (la
     lista en una sola tira ocupaba media pantalla de scroll). */
  .chips.dense { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; }
  .chips.dense button.rolechip { justify-content: flex-start; text-align: left; padding: 8px 11px; line-height: 1.25; }
</style>
