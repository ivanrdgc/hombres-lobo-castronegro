<script lang="ts">
  // Lista de selección de jugadores (port de pickList() de la v1): una única
  // selección viva con clave de contexto (ui.sel) y máximo de elegidos.
  import type { PlayerDoc } from '../../../core/sync/schema';
  import { toggleSel, selIds } from '../../../shell/selection';

  const {
    players,
    exclude = [],
    onlyAlive = true,
    max = 1,
    selKey,
  }: {
    players: PlayerDoc[];
    exclude?: string[];
    onlyAlive?: boolean;
    max?: number;
    selKey: string;
  } = $props();

  const sel = $derived(selIds(selKey));
  const shown = $derived(players.filter((p) => (!onlyAlive || p.alive) && !exclude.includes(p.id)));
</script>

<div class="players">
  {#each shown as p (p.id)}
    <div
      class="player selectable {sel.includes(p.id) ? 'selected' : ''}"
      data-a="sel"
      data-p={p.id}
      data-max={max}
      data-selkey={selKey}
      onclick={() => toggleSel(selKey, p.id, max)}
      role="button"
      tabindex="0"
      onkeydown={(e) => { if (e.key === 'Enter') toggleSel(selKey, p.id, max); }}
    >
      <span class="pname">{p.name}</span>
      {#if sel.includes(p.id)}<span>✔️</span>{/if}
    </div>
  {/each}
</div>
