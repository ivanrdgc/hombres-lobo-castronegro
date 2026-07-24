<script lang="ts">
  // La hoja de la pastilla «🎴 Mi carta / y las reglas» (B19/B21) y, en un juego
  // de mesa, la ÚNICA puerta a tu carta una vez repartida (B34): qué eres y la
  // palabra si la conoces, los datos de la ronda y las reglas. Accesible en
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
  <h3 style="margin:0 0 4px">🎴 Mi carta</h3>
  {#if inGame}
    <!-- `mini`: aquí la carta se consulta a media partida, así que se abre a
         propósito y se auto-oculta (sin esto quedaba desplegada indefinidamente
         a la vista del vecino). Abrir la hoja no es «ver la carta»: la carta
         pide su propio gesto. -->
    <MyCard {game} pid={my.id} mini={true} />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia. Abajo, los datos de la ronda y las reglas.</p>
  {/if}
  <RoundFacts {game} meId={my.id} showTime={game.phase === 'reveal'} />
  <!-- `fixed`: esta hoja YA es la referencia; plegarla dentro de sí misma era un
       botón de más (y un tercer sitio desde el que enseñarla). -->
  <RolesRef fixed={true} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
