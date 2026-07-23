<script lang="ts">
  // Fase de pistas (verbal): la app solo marca el orden de turno y ofrece pasar
  // a la votación cuando todos hayan dicho su palabra.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ChameleonState } from '../types';
  import MyCard from './MyCard.svelte';

  const { game, my }: { game: ChameleonState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  // Orden de turno empezando por el starter.
  const order = $derived([...game.playerIds.slice(game.starterIdx), ...game.playerIds.slice(0, game.starterIdx)]);
  const nm = (pid: string) => game.names[pid] || '¿?';
</script>

<div class="narration">🗣️ Por turnos, cada uno dice UNA palabra relacionada con la secreta. Ni muy obvia ni muy vaga.</div>

<div class="card">
  <h3>🔁 Orden de las pistas</h3>
  <p class="small-note">{order.map(nm).join(' → ')}</p>
  {#if inGame}
    <button class="primary block" data-a="ch-start-vote" onclick={() => guard(A.startVote)}>👉 Todos han dado su pista · a votar</button>
  {:else}
    <p class="small-note">Cuando terminéis las pistas, cualquiera pasa a la votación.</p>
  {/if}
</div>
{#if inGame}<MyCard {game} pid={my.id} mini={true} />{/if}
