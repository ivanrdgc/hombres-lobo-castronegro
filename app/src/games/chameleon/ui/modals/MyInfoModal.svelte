<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu carta (palabra secreta o Camaleón)
  // y la chuleta de reglas y puntos. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { chamGame } from '../../actions';
  import RefRows from '../../../../shell/RefRows.svelte';
  import MyCard from '../MyCard.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? chamGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const rows = [
    { emoji: '🦎', name: 'El Camaleón', note: 'uno por ronda', desc: 'No conoce la palabra: improvisa pistas y, si lo pillan, aún gana adivinándola en la rejilla.' },
    { emoji: '🔑', name: 'El grupo', desc: 'Conoce la palabra secreta: pistas ni obvias (se la regalas) ni vagas (sospecharán de ti).' },
    // Las dos reglas que deciden la partida y que solo estaban en el lobby.
    { emoji: '👉', name: 'El voto', note: 'lo decide todo', desc: 'Si señaláis al Camaleón, le queda una bala: adivinar la palabra. Si señaláis a un inocente (o hay empate), la ronda acaba ahí y gana el Camaleón.' },
    { emoji: '🏆', name: 'Puntos', desc: 'Camaleón sin pillar, 2 puntos. Pillado pero acierta, 1 punto. Pillado y falla, 1 punto para cada jugador del grupo.' },
  ];
</script>

{#if game && my}
  {#if inGame}
    <!-- Sin título: la carta ya se presenta sola («Tu carta de esta ronda») y el
         botón dice lo que hace. `mini`: se enseña a petición y se auto-oculta,
         que abierta de par en par se quedaba a la vista del vecino de mesa. -->
    <MyCard {game} pid={my.id} mini={true} />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
  {/if}
  <RefRows title="📖 Chuleta" {rows} />
  <button class="block" style="margin-top:10px" data-a="ch-help-open" onclick={() => (app.ui.modal = { type: 'ch-help' })}>🎲 Cómo se juega (reglas completas)</button>
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
