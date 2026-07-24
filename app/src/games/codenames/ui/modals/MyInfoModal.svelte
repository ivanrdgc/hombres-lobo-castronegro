<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu papel, cómo se sostiene tu móvil y
  // la chuleta de colores y reglas. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { codenamesGame } from '../../actions';
  import { boardRef } from '../../texts';
  import RefRows from '../../../../shell/RefRows.svelte';
  import MyCard from '../MyCard.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? codenamesGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  // La misma chuleta que se pliega dentro del panel de acción: una sola fuente.
  const rows = $derived(game ? boardRef(game) : []);
</script>

{#if game && my}
  {#if inGame}
    <MyCard {game} pid={my.id} />
  {:else}
    <p class="small-note">👀 Miras de espectador: ves las 25 palabras, pero no el mapa de los Jefes.</p>
  {/if}
  <RefRows title="📖 Los colores del tablero" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
