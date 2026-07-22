<script lang="ts">
  // Parrilla de selección de jugadores para Ávalon (una o varias, con clave de
  // contexto). Marca al líder con 🔊/⭐ opcionalmente vía badges externas.
  import { toggleSel, selIds } from '../../../shell/selection';

  const { players, selKey, max = 1, exclude = [], leaderId = null }: {
    players: { id: string; name?: string }[];
    selKey: string;
    max?: number;
    exclude?: string[];
    leaderId?: string | null;
  } = $props();

  const sel = $derived(selIds(selKey));
</script>

<div class="players">
  {#each players as p (p.id)}
    {@const can = !exclude.includes(p.id)}
    <div
      class="player {can ? 'selectable' : 'dim'} {sel.includes(p.id) ? 'selected' : ''}"
      data-a={can ? 'av-sel' : undefined}
      data-p={p.id}
      data-selkey={can ? selKey : undefined}
      role={can ? 'button' : undefined}
      tabindex={can ? 0 : undefined}
      onclick={() => { if (can) toggleSel(selKey, p.id, max); }}
      onkeydown={(e) => { if (can && e.key === 'Enter') toggleSel(selKey, p.id, max); }}
    >
      <span class="pname">{p.name}</span>
      {#if p.id === leaderId}<span class="badge">🧭</span>{/if}
      {#if sel.includes(p.id)}<span>✔️</span>{/if}
    </div>
  {/each}
</div>
