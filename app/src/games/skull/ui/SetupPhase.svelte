<script lang="ts">
  // Colocación de salida: cada jugador pone 1 disco boca abajo (a la vez).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { placedCount, inHand } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SkullState } from '../types';

  const { game, my }: { game: SkullState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const done = $derived(placedCount(game, my.id) >= 1);
  const hand = $derived(inHand(game, my.id));
  const pend = $derived(game.playerIds.filter((pid) => game.alive[pid] && placedCount(game, pid) < 1).map((pid) => game.names[pid] || pid));
</script>

<div class="narration">🌸💀 Colocad a la vez vuestro disco de salida, boca abajo. Nadie ve lo que pones.</div>

{#if inGame && !done}
  <div class="actionpanel"><h3>Tu disco de salida</h3>
    <div class="btnrow">
      <button class="primary" data-a="sk-place-flower" disabled={hand.flowers <= 0} onclick={() => guard(() => A.placeInitial('flower'))}>🌸 Poner una flor</button>
      <button class="danger" data-a="sk-place-skull" disabled={hand.skulls <= 0} onclick={() => guard(() => A.placeInitial('skull'))}>💀 Poner la calavera</button>
    </div>
  </div>
{:else if inGame}
  <div class="card"><p class="hint">✅ Disco colocado. Esperando: {pend.join(', ') || '—'}</p></div>
{:else}
  <div class="card"><p class="hint">👀 Colocando los discos de salida…</p></div>
{/if}
