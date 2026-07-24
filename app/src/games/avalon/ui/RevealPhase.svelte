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

<!-- La cabecera ya dice a qué jugáis: aquí solo el ritual del reparto. -->
<div class="narration">🃏 Las lealtades ya están repartidas. Que cada uno mire la suya a solas, memorice lo que sabe… y que ni una mirada delate a Merlín.</div>

{#if inGame && !game.seen[my.id]}
  {#if app.ui.revealOpen}
    <!-- Se abre porque el jugador la ha pedido, pero se vuelve a ocultar sola:
         en el reparto los móviles acaban boca arriba encima de la mesa mientras
         se espera al último, y la carta no puede quedarse encendida. -->
    <RoleCard {game} pid={my.id} startOpen={true} />
    <button class="primary block" data-a="av-seen"
      onclick={() => guard(async () => { await A.confirmSeen(); app.ui.revealOpen = false; })}>✅ Lo he memorizado</button>
  {:else}
    <div class="card">
      <button class="primary block" data-a="av-reveal" onclick={() => (app.ui.revealOpen = true)}>👁 Ver mi carta</button>
      <p class="small-note" style="margin-bottom:0">Solo la ves tú y se oculta sola a los pocos segundos. Memorízala: en Ávalon no se reparte otra vez (aunque siempre puedes volver a mirarla en 🎴).</p></div>
  {/if}
{:else if !allSeen}
  <div class="waitlist">Esperando a que confirmen: {pend.join(', ')}</div>
{:else}
  <div class="card"><h3>🗺️ Todos han memorizado su carta</h3>
    <button class="primary block" data-a="av-begin" onclick={() => guard(A.beginQuests)}>⚔️ Empezar la misión 1</button></div>
{/if}
