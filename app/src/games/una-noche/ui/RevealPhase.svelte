<script lang="ts">
  // Reparto: cada jugador ve su carta INICIAL en secreto y confirma. Cuando
  // todos han confirmado, cualquiera comienza la noche.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GameState } from '../types';
  import RoleCard from './RoleCard.svelte';

  const { game, my }: { game: GameState; my: PlayerDoc } = $props();

  const myRole = $derived(game.originalRole[my.id]);
  const seen = $derived(!!(game.seen || {})[my.id]);
  const pending = $derived(game.playerIds.filter((pid) => !(game.seen || {})[pid]).map((pid) => game.names[pid]));
  const allSeen = $derived(pending.length === 0);
</script>

<div class="narration">🎴 Mira tu carta en secreto y memorízala. De noche alguien podría cambiártela…</div>

{#if myRole}
  {#if !seen}
    <RoleCard role={myRole} />
    <button class="primary block" data-a="una-seen" onclick={() => guard(A.confirmSeen)}>✅ Ya la he memorizado</button>
  {:else}
    <div class="card"><p class="hint">✅ Carta memorizada. {allSeen ? '¡Todos listos!' : 'Esperando a: ' + pending.join(', ')}</p></div>
    {#if allSeen}
      <button class="primary block" data-a="una-begin-night" onclick={() => guard(A.beginNight)}>🌙 Comenzar la noche</button>
    {/if}
  {/if}
{:else}
  <div class="card"><p class="hint">👀 No juegas esta partida: pon la voz o mira desde aquí.</p></div>
{/if}
