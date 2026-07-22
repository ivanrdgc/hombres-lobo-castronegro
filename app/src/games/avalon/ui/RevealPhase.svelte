<script lang="ts">
  // Reparto: cada cual despliega su carta (rol + lo que sabe), la memoriza y
  // confirma; cuando todos han confirmado, cualquiera abre la primera misión.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';
  import RoleCard from './RoleCard.svelte';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const inGame = $derived(game.playerIds.includes(my.id));
  const pend = $derived(game.playerIds.filter((pid) => !game.seen[pid]).map((pid) => game.names[pid] || pid));
  const allSeen = $derived(pend.length === 0);
</script>

<div class="narration">🏰 Ávalon: he repartido las lealtades en secreto. Mirad vuestra carta, memorizad lo que sabéis… y que ni una mirada delate a Merlín.</div>

{#if inGame && !game.seen[my.id]}
  {#if app.ui.revealOpen}
    <RoleCard {game} pid={my.id} />
    <button class="primary block" data-a="av-seen"
      onclick={() => guard(async () => { await A.confirmSeen(); app.ui.revealOpen = false; })}>✅ Lo he memorizado</button>
  {:else}
    <div class="card"><p class="small-note">🎴 Tu carta está lista. Despliégala cuando nadie mire tu pantalla, memorízala… y confirma.</p>
      <button class="primary block" data-a="av-reveal" onclick={() => (app.ui.revealOpen = true)}>👁 Ver mi carta</button></div>
  {/if}
{:else if !allSeen}
  <div class="waitlist">Esperando a que confirmen: {pend.join(', ')}</div>
{:else}
  <div class="card"><h3>🗺️ Todos listos</h3>
    <p class="small-note">Que comience la primera misión.</p>
    <button class="primary block" data-a="av-begin" onclick={() => guard(A.beginQuests)}>⚔️ Empezar las misiones</button></div>
{/if}
