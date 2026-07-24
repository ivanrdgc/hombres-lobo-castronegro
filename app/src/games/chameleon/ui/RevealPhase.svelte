<script lang="ts">
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ChameleonState } from '../types';
  import MyCard from './MyCard.svelte';

  const { game, my }: { game: ChameleonState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const pend = $derived(game.playerIds.filter((pid) => !game.seen[pid]).map((pid) => game.names[pid] || pid));
</script>

<!-- B29: el tema y la rejilla los pinta la tarjeta de arriba; aquí solo va lo
     que hay que HACER ahora, en una tarjeta. La banda de narración repetía el
     tema palabra por palabra dos dedos más abajo.
     B34 · una sola puerta: el REPARTO es la única fase con botón propio a la
     carta (ahí la instrucción ES la pantalla). En cuanto confirmas, la única
     puerta vuelve a ser la pastilla 🎴 de abajo: nada de un segundo «ver mi
     carta» colgando de cada fase. -->
{#if inGame && !game.seen[my.id]}
  {#if app.ui.revealOpen}
    <!-- La carta se tapa sola (postura de mesa): la palabra secreta no se queda
         fija en pantalla mientras la mesa espera al último en confirmar. -->
    <MyCard {game} pid={my.id} onhide={() => (app.ui.revealOpen = false)} />
    <button class="primary block" data-a="ch-seen" onclick={() => guard(async () => { await A.confirmSeen(); app.ui.revealOpen = false; })}>✅ Lo tengo, tapadla</button>
  {:else}
    <div class="card"><h3 style="margin-bottom:2px">🎴 Ya está repartido</h3>
      <p class="small-note" style="margin:0">🍽️ A todos les sale esta misma pantalla, así que tocar no delata. Mira tu carta a solas: se tapa sola a los pocos segundos y luego la tienes toda la ronda en la pastilla «🎴 Mi carta» de abajo.</p>
      <button class="primary block" data-a="ch-reveal" onclick={() => (app.ui.revealOpen = true)}>👁 Ver mi carta a solas</button></div>
  {/if}
{:else if pend.length}
  <!-- Ni pantalla muda ni callejón sin salida: quién falta, por nombre, y qué
       puedo ir haciendo mientras. -->
  <div class="card"><h3 style="margin-bottom:2px">⏳ Esperando a {pend.join(', ')}</h3>
    <p class="small-note" style="margin:0">{inGame ? 'Ve estudiando la rejilla: cuanto mejor te la sepas, mejor pista darás. Tu carta sigue a un toque, en la pastilla «🎴 Mi carta» de abajo.' : '👀 Miras de espectador: la mesa está viendo su carta.'}</p></div>
{:else}
  <div class="card"><h3 style="margin-bottom:2px">🗣️ Todos habéis visto vuestra carta</h3>
    <p class="small-note" style="margin:0">Empieza <b>{game.names[game.playerIds[game.starterIdx]] || '¿?'}</b> y seguís en el orden de la mesa. El botón lo puede pulsar cualquiera.</p>
    <button class="primary block" data-a="ch-begin" onclick={() => guard(A.beginClues)}>🗣️ Empezar las pistas</button></div>
{/if}
