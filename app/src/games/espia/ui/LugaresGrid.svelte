<script lang="ts">
  // Parrilla pública de localizaciones (la «carta de referencia» del juego
  // físico). En modo selectable sirve para que el espía señale su apuesta.
  import { LOCATIONS } from '../locations';

  const { selectable = false, selected = null, onPick, reveal = null }: {
    selectable?: boolean;
    selected?: string | null;
    onPick?: (id: string) => void;
    /** Al final de la ronda: localización real, destacada. */
    reveal?: string | null;
  } = $props();
</script>

<div class="chips">
  {#each LOCATIONS as l (l.id)}
    {#if selectable}
      <button class="chip rolechip {selected === l.id ? 'sel' : ''}" data-a="espia-lugar" data-p={l.id}
        onclick={() => onPick?.(l.id)}>{l.emoji} {l.name}</button>
    {:else}
      <span class="chip {reveal === l.id ? 'sel' : ''}" data-p={l.id}>{l.emoji} {l.name}</span>
    {/if}
  {/each}
</div>

<style>
  .chip.sel {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 22%, transparent);
    font-weight: 700;
  }
</style>
