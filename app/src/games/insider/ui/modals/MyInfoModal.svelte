<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu papel (y la palabra si la conoces),
  // los datos de la ronda y la chuleta de papeles y puntos. Accesible en
  // cualquier fase, sin salir de la pantalla en la que estás decidiendo.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { insiderGame } from '../../actions';
  import MyCard from '../MyCard.svelte';
  import RoundFacts from '../RoundFacts.svelte';
  import RolesRef from '../RolesRef.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? insiderGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tu carta</h3>
  {#if inGame}
    <!-- `mini`: aquí la carta se consulta a media partida, así que se abre a
         propósito y se auto-oculta (sin esto quedaba desplegada indefinidamente
         a la vista del vecino). -->
    <MyCard {game} pid={my.id} mini={true} />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
  {/if}
  <RoundFacts {game} meId={my.id} showTime={game.phase === 'reveal'} />
  <RolesRef open={true} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
