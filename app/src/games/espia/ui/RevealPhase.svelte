<script lang="ts">
  // Reparto de El Espía: cada cual despliega su identidad bajo demanda, la
  // memoriza y confirma; cuando todos han confirmado, cualquiera pone el
  // reloj en marcha.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';
  import SpyCard from './SpyCard.svelte';

  const { game, my }: { game: EspiaState; my: PlayerDoc } = $props();

  const pend = $derived(game.playerIds.filter((pid) => !game.seen[pid]).map((pid) => game.names[pid] || pid));
  const allSeen = $derived(pend.length === 0);
</script>

<div class="narration">🕵️ Ronda {game.round}: identidades repartidas. Reparte y preguntará primero <b>{game.names[game.dealerId] || '¿?'}</b>.</div>
{#if !game.seen[my.id]}
  {#if app.ui.revealOpen}
    <SpyCard {game} pid={my.id} />
    <button class="primary block" data-a="espia-seen"
      onclick={() => guard(async () => { await A.confirmSeen(); app.ui.revealOpen = false; })}>✅ La he memorizado</button>
  {:else}
    <div class="card"><p class="small-note">🎴 Tu identidad está lista. Despliégala cuando nadie mire tu pantalla, memorízala… y confirma.</p>
      <button class="primary block" data-a="espia-reveal" onclick={() => (app.ui.revealOpen = true)}>👁 Ver mi identidad</button></div>
  {/if}
{:else if !allSeen}
  <div class="waitlist">Esperando a que confirmen: {pend.join(', ')}</div>
{:else}
  <div class="card"><h3>🕵️ Todos listos</h3>
    <p class="small-note">{Math.round(game.durationMs / 60000)} minutos de interrogatorio. Empieza preguntando <b>{game.names[game.dealerId] || '¿?'}</b>; el interrogado pregunta después.</p>
    <button class="primary block" data-a="espia-begin" onclick={() => guard(A.beginRound)}>⏱ Poner el reloj en marcha</button></div>
{/if}
