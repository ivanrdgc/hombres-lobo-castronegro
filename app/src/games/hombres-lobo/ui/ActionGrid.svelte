<script lang="ts">
  // LA lista única de una acción: el pueblo entero, como en PlayersGrid, pero
  // donde los objetivos válidos se tocan para elegirlos y el resto (muertos,
  // excluidos) se ve atenuado con sus insignias. Sustituye al dúo «lista de
  // selección + parrilla del pueblo debajo»: elegir cuesta UN toque y la
  // pantalla no repite a los jugadores.
  import { app, me } from '../../../core/sync/store.svelte';
  import { toggleSel, selIds } from '../../../shell/selection';
  import type { PlayerDoc } from '../../../core/sync/schema';

  const {
    players,
    selKey,
    max = 1,
    canPick = () => true,
    showAlguacil = null,
  }: {
    players: PlayerDoc[];
    selKey: string;
    max?: number;
    /** Elegible además de estar vivo (p. ej. «solo la manada», «no a ti mismo»). */
    canPick?: (p: PlayerDoc) => boolean;
    showAlguacil?: string | null;
  } = $props();

  const sel = $derived(selIds(selKey));
  const narratorId = $derived(app.group?.masterId ?? null);
  const pickable = (p: PlayerDoc) => !!p.alive && canPick(p);
</script>

<div class="players">
  {#each players as p (p.id)}
    {@const can = pickable(p)}
    <div
      class="player {p.alive === false ? 'dead' : ''} {can ? 'selectable' : 'dim'} {sel.includes(p.id) ? 'selected' : ''}"
      data-a={can ? 'sel' : undefined}
      data-p={p.id}
      data-selkey={can ? selKey : undefined}
      onclick={() => { if (can) toggleSel(selKey, p.id, max); }}
      role={can ? 'button' : undefined}
      tabindex={can ? 0 : undefined}
      onkeydown={(e) => { if (can && e.key === 'Enter') toggleSel(selKey, p.id, max); }}
    >
      <span class="pname">{p.name}</span>
      {#if p.id === narratorId}<span class="badge">🔊</span>{/if}
      {#if showAlguacil === p.id}<span class="badge">⭐</span>{/if}
      {#if p.revealedTonto}<span class="badge">🤪</span>{/if}
      {#if p.id === me()?.id}<span class="badge you">Tú</span>{/if}
      {#if p.alive === false}<span>💀</span>{/if}
      {#if sel.includes(p.id)}<span>✔️</span>{/if}
    </div>
  {/each}
</div>
