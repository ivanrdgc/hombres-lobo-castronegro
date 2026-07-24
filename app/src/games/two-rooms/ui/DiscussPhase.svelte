<script lang="ts">
  // Ronda en marcha: se habla dentro de la sala y se enseñan cartas en persona;
  // la app solo lleva el reloj. Cualquier dispositivo dispara el fin de la ronda
  // cuando llega a cero.
  //
  // En el cuerpo hay UNA sola acción, la del juego: 🤝 enseñar tu carta a
  // alguien. Consultar tu carta no vive aquí —eso es la pastilla 🎴 de abajo a
  // la derecha, la única puerta (B34)—, y el botón es idéntico en todos los
  // móviles, que es lo que pide la postura de mesa (B28).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { hostagesPerRoom } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { TwoRoomsState } from '../types';
  import ShowCard from './ShowCard.svelte';

  const { game, my }: { game: TwoRoomsState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const hostages = $derived(hostagesPerRoom(game));

  let showing = $state(false);

  $effect(() => {
    const t = setInterval(() => {
      if (game.phase === 'discuss' && !game.paused && game.deadline !== null && Date.now() >= game.deadline + 400) {
        void guard(A.timeUp);
      }
    }, 1000);
    return () => clearInterval(t);
  });
</script>

<!-- El reloj lo pinta GameScreen encima del tablero de salas, y la ronda va en
     la cabecera: aquí solo se dice QUÉ HACER ahora (B29). En qué sala estás lo
     dice el tablero, que lo marca con «aquí estás». -->
<div class="narration">🗣️ Hablad dentro de vuestra sala y enseñaos cartas cara a cara. Al acabar el tiempo, cada sala mandará {hostages === 1 ? 'un rehén' : `${hostages} rehenes`} a la otra: ve pensando a quién te conviene sacar… o retener.</div>

{#if inGame}
  <button class="primary block" data-a="tr-show-open" onclick={() => (showing = true)}>🤝 Enseñar mi carta a alguien</button>
  <!-- La referencia, aquí mismo: enseñar la carta es EL mecanismo del juego y
       no es evidente que se haga con la pantalla del móvil. -->
  <details class="trref">
    <summary data-a="tr-ref-discuss">📖 Cómo se enseña la carta</summary>
    <p class="small-note">Tu carta llena la pantalla, en grande, para ponerle el móvil delante a quien tú decidas. No se apaga sola: la guardas tú cuando hayáis acabado. Nadie está obligado a enseñar nada, y la app no arbitra: es un trato entre vosotros.</p>
    <p class="small-note">Se abre por el lado menos comprometido, «🎨 solo el color»: se ve tu bando y NO tu rol —la jugada de siempre del Presidente, que busca azules de confianza sin destaparse—. Con «🎴 Enseñar también el rol» destapas la carta entera.</p>
    <p class="small-note">¿Solo quieres refrescar quién eres? Eso es otra cosa: «🎴 Mi carta», la pastilla de abajo a la derecha. Ahí está tu carta y las reglas, y se guarda sola a los pocos segundos.</p>
  </details>
{/if}

{#if showing && inGame}<ShowCard {game} pid={my.id} onclose={() => (showing = false)} />{/if}

<style>
  .trref { margin: 4px 0 10px; border-top: 1px solid var(--line, #2a2f45); padding-top: 8px; }
  .trref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent, #d8a24a); }
</style>
