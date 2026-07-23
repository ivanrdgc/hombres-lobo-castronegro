<script lang="ts">
  // Parrilla de selección para Secret Hitler (una elección; excluye a
  // muertos y a quien se indique). Marca cargos con badges.
  import { toggleSel, selIds } from '../../../shell/selection';

  const { players, selKey, exclude = [], presidentId = null, chancellorId = null }: {
    players: { id: string; name?: string; alive?: boolean }[];
    selKey: string;
    exclude?: string[];
    presidentId?: string | null;
    chancellorId?: string | null;
  } = $props();

  const sel = $derived(selIds(selKey));
</script>

<div class="players">
  {#each players as p (p.id)}
    {@const dead = p.alive === false}
    {@const can = !dead && !exclude.includes(p.id)}
    <div
      class="player {dead ? 'dead' : ''} {can ? 'selectable' : 'dim'} {sel.includes(p.id) ? 'selected' : ''}"
      data-a={can ? 'sh-sel' : undefined}
      data-p={p.id}
      data-selkey={can ? selKey : undefined}
      role={can ? 'button' : undefined}
      tabindex={can ? 0 : undefined}
      onclick={() => { if (can) toggleSel(selKey, p.id, 1); }}
      onkeydown={(e) => { if (can && e.key === 'Enter') toggleSel(selKey, p.id, 1); }}
    >
      <span class="pname">{p.name}</span>
      {#if p.id === presidentId}<span class="badge">🪙 P</span>{/if}
      {#if p.id === chancellorId}<span class="badge">🎩 C</span>{/if}
      {#if dead}<span>💀</span>{/if}
      {#if sel.includes(p.id)}<span>✔️</span>{/if}
    </div>
  {/each}
</div>
