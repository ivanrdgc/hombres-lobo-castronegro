<script lang="ts">
  // Ronda en marcha: cuenta atrás, tu sala y tu carta a mano. Se habla y se
  // enseñan cartas en persona; la app solo lleva el reloj. Cualquier dispositivo
  // dispara el fin de la ronda cuando el reloj llega a cero.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { hostagesPerRoom } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { TwoRoomsState } from '../types';
  import MyCard from './MyCard.svelte';

  const { game, my }: { game: TwoRoomsState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const hostages = $derived(hostagesPerRoom(game));

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
<div class="narration">🗣️ Hablad dentro de vuestra sala y enseñad vuestra carta —con el móvil, cara a cara— a quien queráis. Al acabar el tiempo, cada sala mandará {hostages === 1 ? 'un rehén' : `${hostages} rehenes`} a la otra: ve pensando a quién te conviene sacar… o retener.</div>

{#if inGame}
  <MyCard {game} pid={my.id} mini={true} />
  <!-- La referencia, aquí mismo: enseñar la carta es EL mecanismo del juego y
       no es evidente que se haga con la pantalla del móvil. -->
  <details class="trref">
    <summary data-a="tr-ref-discuss">📖 Cómo se enseña la carta</summary>
    <p class="small-note">«🤝 Enseñársela a alguien» pone tu carta a pantalla completa, en grande, para ponerle el móvil delante a quien tú decidas. No se apaga sola: la guardas tú cuando hayáis acabado. Nadie está obligado a enseñar nada, y la app no arbitra: es un trato entre vosotros.</p>
    <p class="small-note">Se abre por el lado menos comprometido, «🎨 solo el color»: se ve tu bando y NO tu rol —la jugada de siempre del Presidente, que busca azules de confianza sin destaparse—. Con «🎴 Enseñar también el rol» destapas la carta entera.</p>
    <p class="small-note">«👁 Ver mi carta» es solo para ti: se oculta sola a los pocos segundos, para que el móvil pueda volver a la mesa sin dejar tu bando encendido.</p>
  </details>
{/if}

<style>
  .trref { margin: 4px 0 10px; border-top: 1px solid var(--line, #2a2f45); padding-top: 8px; }
  .trref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent, #d8a24a); }
</style>
