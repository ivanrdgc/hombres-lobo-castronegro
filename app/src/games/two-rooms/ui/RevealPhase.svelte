<script lang="ts">
  // Reparto: cada cual mira su carta (bando + rol) y su sala, y confirma. Cuando
  // todos han confirmado, cualquiera arranca la ronda 1.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { TwoRoomsState } from '../types';
  import MyCard from './MyCard.svelte';

  const { game, my }: { game: TwoRoomsState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const pend = $derived(game.playerIds.filter((pid) => !game.seen[pid]).map((pid) => game.names[pid] || pid));
</script>

<div class="narration">💣 Two Rooms. Mira tu carta y tu sala sin que nadie vea tu pantalla, y colócate en el espacio de tu sala.</div>

{#if inGame && !game.seen[my.id]}
  {#if app.ui.revealOpen}
    <MyCard {game} pid={my.id} />
    <p class="small-note" style="text-align:center">Podrás volver a verla cuando quieras con el botón 🎴 de abajo a la derecha.</p>
    <button class="primary block" data-a="tr-seen" onclick={() => guard(async () => { await A.confirmSeen(); app.ui.revealOpen = false; })}>✅ Lo tengo</button>
  {:else}
    <div class="card"><p class="small-note">🎴 Tu carta está lista. Mírala a solas y confirma.</p>
      <button class="primary block" data-a="tr-reveal" onclick={() => (app.ui.revealOpen = true)}>👁 Ver mi carta y mi sala</button></div>
  {/if}
{:else if pend.length}
  <div class="waitlist">Esperando a que confirmen: {pend.join(', ')}</div>
{:else if inGame}
  <div class="card"><h3>▶️ Todos listos</h3>
    <p class="small-note">Repartíos en dos espacios separados según el tablero de aquí abajo. Cuando cada cual esté en su sala, arrancad la primera ronda ({game.totalRounds} rondas en total).</p>
    <button class="primary block" data-a="tr-begin" onclick={() => guard(A.beginRound)}>▶️ Empezar la ronda 1</button></div>
{:else}
  <!-- Un altavoz que no juega no tiene carta que confirmar: no puede quedarse
       mirando un «esperando» que ya no espera a nadie. -->
  <div class="waitlist">👀 Todos han confirmado su carta. Esperando a que arranquen la ronda 1.</div>
{/if}
