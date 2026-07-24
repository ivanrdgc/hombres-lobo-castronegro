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
  const myRoom = $derived(inGame ? game.room[my.id] + 1 : 0);
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

<!-- El reloj lo pinta GameScreen encima del tablero de salas. -->
<div class="narration">🚪 Ronda {game.round} de {game.totalRounds}. {inGame ? `Estás en la Sala ${myRoom}.` : ''} Hablad dentro de vuestra sala y enseñad la carta (la pantalla de tu móvil) a quien queráis, en persona. Al acabar el tiempo, cada sala mandará {hostages === 1 ? 'un rehén' : `${hostages} rehenes`}.</div>

{#if inGame}
  <MyCard {game} pid={my.id} mini={true} />
  <!-- La referencia, aquí mismo: enseñar la carta es EL mecanismo del juego y
       no es evidente que se haga con la pantalla del móvil. -->
  <details class="trref">
    <summary data-a="tr-ref-discuss">📖 Cómo se enseña la carta (y qué viene después)</summary>
    <p class="small-note">Abre tu carta con «👁 Ver mi carta», tapa la pantalla con la mano y enséñasela cara a cara a quien tú decidas. Nadie está obligado a enseñar nada, y la app no arbitra: es un trato entre vosotros.</p>
    <p class="small-note">«🎨 Enseñar solo el color» deja en pantalla tu bando y esconde el rol: es la jugada de siempre del Presidente, que busca azules de confianza sin destaparse.</p>
    <p class="small-note">Al acabar el reloj, cada sala votará {hostages === 1 ? 'a una persona' : `a ${hostages} personas`} para mandar de rehén a la otra. Ve pensando a quién te conviene sacar… o retener.</p>
  </details>
{:else}
  <div class="card"><p class="small-note" style="margin:0">👀 No juegas esta partida: puedes seguir el reloj desde aquí.</p></div>
{/if}

<style>
  .trref { margin: 4px 0 10px; border-top: 1px solid var(--line, #2a2f45); padding-top: 8px; }
  .trref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent, #d8a24a); }
</style>
