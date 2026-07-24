<script lang="ts">
  // Reparto: cada cual mira su carta (bando + rol) y su sala, y confirma. Cuando
  // todos han confirmado, cualquiera arranca la ronda 1.
  //
  // Es la ÚNICA fase con su propio botón «👁 Ver mi carta» (excepción de B34):
  // aquí mirar la carta es el contenido de la pantalla, no un atajo. En cuanto
  // arranca la ronda, la única puerta es la pastilla 🎴.
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

<!-- Lo que hay que hacer AHORA, arriba y sin repetirse: el título del juego lo
     lleva la cabecera y el tablero de abajo dice quién va a cada sala (B29). -->
<div class="narration">🎴 Mira tu carta a solas —tu bando, tu rol y en qué sala empiezas— y confirma. Que nadie más vea tu pantalla.</div>

{#if inGame && !game.seen[my.id]}
  {#if app.ui.revealOpen}
    <MyCard {game} pid={my.id} />
    <button class="primary block" data-a="tr-seen" onclick={() => guard(async () => { await A.confirmSeen(); app.ui.revealOpen = false; })}>✅ Lo tengo</button>
    <p class="small-note" style="text-align:center">Podrás volver a verla cuando quieras: «🎴 Mi carta», la pastilla de abajo a la derecha.</p>
  {:else}
    <button class="primary block" data-a="tr-reveal" onclick={() => (app.ui.revealOpen = true)}>👁 Ver mi carta y mi sala</button>
  {/if}
{:else if pend.length}
  <div class="waitlist">Esperando a que confirmen: {pend.join(', ')}</div>
{:else if inGame}
  <div class="card"><h3>🚪 Colocaos, cada uno en su sala</h3>
    <p class="small-note">Dos espacios separados, según el tablero de aquí abajo. Cuando estéis, cualquiera arranca la primera de las {game.totalRounds} rondas.</p>
    <button class="primary block" data-a="tr-begin" onclick={() => guard(A.beginRound)}>▶️ Empezar la ronda 1</button></div>
{:else}
  <!-- Un altavoz que no juega no tiene carta que confirmar: no puede quedarse
       mirando un «esperando» que ya no espera a nadie. -->
  <div class="waitlist">👀 Todos han confirmado su carta. Esperando a que arranquen la ronda 1.</div>
{/if}
