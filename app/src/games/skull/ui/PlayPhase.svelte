<script lang="ts">
  // Turno: el jugador activo coloca otro disco o abre una apuesta.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { inHand, totalPlaced } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SkullState } from '../types';

  const { game, my }: { game: SkullState; my: PlayerDoc } = $props();
  const myTurn = $derived(game.turn === my.id);
  const hand = $derived(inHand(game, my.id));
  const max = $derived(totalPlaced(game));
  let bid = $state(1);
  $effect(() => { if (bid > max) bid = max; if (bid < 1) bid = 1; });
  const turnName = $derived(game.names[game.turn] || '¿?');
</script>

{#if myTurn}
  <div class="actionpanel"><h3>🎬 Tu turno</h3>
    <p class="hint">Coloca otro disco sobre tu pila, o apuesta cuántas flores levantarás sin topar una calavera.</p>
    {#if hand.flowers > 0 || hand.skulls > 0}
      <div class="btnrow">
        <button class="ghost" data-a="sk-place-flower" disabled={hand.flowers <= 0} onclick={() => guard(() => A.placeDisc('flower'))}>🌸 Poner flor</button>
        <button class="ghost" data-a="sk-place-skull" disabled={hand.skulls <= 0} onclick={() => guard(() => A.placeDisc('skull'))}>💀 Poner calavera</button>
      </div>
    {:else}
      <p class="small-note">No te quedan discos en la mano: solo puedes apostar.</p>
    {/if}
    <div style="margin-top:10px">
      <p class="small-note" style="margin:0 0 4px">Apostar (hay {max} disco{max === 1 ? '' : 's'} en la mesa):</p>
      <div class="btnrow" style="flex-wrap:wrap">
        {#each Array.from({ length: max }, (_, i) => i + 1) as k (k)}
          <button class="small {bid === k ? 'primary' : 'ghost'}" data-a="sk-bid-num" data-p={String(k)} onclick={() => (bid = k)}>{k}</button>
        {/each}
      </div>
      <button class="primary block" style="margin-top:8px" data-a="sk-bid-open" disabled={max < 1} onclick={() => guard(() => A.openBid(bid))}>🗣️ Apostar {bid}</button>
    </div>
  </div>
{:else}
  <div class="narration">🎬 Turno de <b>{turnName}</b>: coloca un disco o abre la apuesta…</div>
{/if}
