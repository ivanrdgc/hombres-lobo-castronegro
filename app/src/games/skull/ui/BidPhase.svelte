<script lang="ts">
  // Puja: los demás suben la apuesta o pasan; el apostador espera.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { totalPlaced } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SkullState } from '../types';

  const { game, my }: { game: SkullState; my: PlayerDoc } = $props();
  const myTurn = $derived(game.turn === my.id);
  const iAmBidder = $derived(game.bid?.by === my.id);
  const max = $derived(totalPlaced(game));
  const nm = (pid: string) => game.names[pid] || '¿?';
  let bid = $state(0);
  $effect(() => { const min = (game.bid?.n ?? 0) + 1; if (bid < min) bid = min; if (bid > max) bid = max; });
</script>

<div class="narration">🗣️ Apuesta actual: <b>{game.bid?.n ?? 0}</b> de {nm(game.bid?.by || '')}. Turno de puja: <b>{nm(game.turn)}</b>.</div>

{#if myTurn && !iAmBidder}
  <div class="actionpanel"><h3>📈 ¿Subes o pasas?</h3>
    {#if (game.bid?.n ?? 0) < max}
      <div class="btnrow" style="flex-wrap:wrap">
        {#each Array.from({ length: max - (game.bid?.n ?? 0) }, (_, i) => (game.bid?.n ?? 0) + 1 + i) as k (k)}
          <button class="small {bid === k ? 'primary' : 'ghost'}" data-a="sk-raise-num" data-p={String(k)} onclick={() => (bid = k)}>{k}</button>
        {/each}
      </div>
      <button class="primary block" style="margin-top:8px" data-a="sk-raise" onclick={() => guard(() => A.raiseBid(bid))}>📈 Subir a {bid}</button>
    {/if}
    <button class="ghost block" style="margin-top:6px" data-a="sk-pass" onclick={() => guard(A.passBid)}>🤐 Pasar</button>
  </div>
{:else if iAmBidder}
  <div class="card"><p class="hint">Tu apuesta ({game.bid?.n}) está sobre la mesa. Esperando a que suban o pasen…</p></div>
{:else}
  <div class="card"><p class="hint">👀 Esperando la decisión de {nm(game.turn)}…</p></div>
{/if}
