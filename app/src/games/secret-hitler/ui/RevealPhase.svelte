<script lang="ts">
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { presidentId } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SHState } from '../types';
  import RoleCard from './RoleCard.svelte';

  const { game, my }: { game: SHState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const pend = $derived(game.playerIds.filter((pid) => !game.seen[pid]).map((pid) => game.names[pid] || pid));
</script>

<div class="narration">🏛️ Bandos repartidos en secreto. Mirad vuestra carta: fascistas, reconoceos; liberales, a oscuras. Que nadie enseñe su pantalla.</div>

{#if inGame && !game.seen[my.id]}
  {#if app.ui.revealOpen}
    <RoleCard {game} pid={my.id} />
    <button class="primary block" data-a="sh-seen" onclick={() => guard(async () => { await A.confirmSeen(); app.ui.revealOpen = false; })}>✅ Lo he memorizado</button>
  {:else}
    <div class="card"><p class="small-note">🎴 Tu carta está lista. Despliégala sin que nadie mire, memorízala… y confirma.</p>
      <button class="primary block" data-a="sh-reveal" onclick={() => (app.ui.revealOpen = true)}>👁 Ver mi carta</button></div>
  {/if}
{:else if pend.length}
  <div class="waitlist">Esperando a que confirmen: {pend.join(', ')}</div>
{:else}
  <div class="card"><h3>🏛️ Todos listos</h3>
    <p class="small-note">Preside <b>{game.names[presidentId(game)] || '¿?'}</b>: empieza la primera legislatura.</p>
    <button class="primary block" data-a="sh-begin" onclick={() => guard(A.beginGame)}>🏛️ Empezar</button></div>
{/if}
