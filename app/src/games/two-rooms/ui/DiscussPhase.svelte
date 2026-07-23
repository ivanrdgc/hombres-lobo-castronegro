<script lang="ts">
  // Ronda en marcha: cuenta atrás, tu sala y tu carta a mano. Se habla y se
  // enseñan cartas en persona; la app solo lleva el reloj. Cualquier dispositivo
  // dispara el fin de la ronda cuando el reloj llega a cero.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { TwoRoomsState } from '../types';
  import Timer from './Timer.svelte';
  import MyCard from './MyCard.svelte';

  const { game, my }: { game: TwoRoomsState; my: PlayerDoc } = $props();
  const inGame = $derived(game.playerIds.includes(my.id));
  const myRoom = $derived(inGame ? game.room[my.id] + 1 : 0);

  $effect(() => {
    const t = setInterval(() => {
      if (game.phase === 'discuss' && !game.paused && game.deadline !== null && Date.now() >= game.deadline + 400) {
        void guard(A.timeUp);
      }
    }, 1000);
    return () => clearInterval(t);
  });
</script>

<Timer {game} />
<div class="narration">🚪 Ronda {game.round} de {game.totalRounds}. {inGame ? `Estás en la Sala ${myRoom}.` : ''} Hablad dentro de vuestra sala y enseñad cartas a quien queráis (en persona). Al acabar el tiempo, cada sala mandará un rehén.</div>

{#if inGame}
  <MyCard {game} pid={my.id} mini={true} />
{:else}
  <div class="card"><p class="small-note" style="margin:0">👀 No juegas esta partida: puedes seguir el reloj desde aquí.</p></div>
{/if}
