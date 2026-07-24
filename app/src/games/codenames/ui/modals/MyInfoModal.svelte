<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu equipo/papel y la chuleta de
  // colores y reglas. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { codenamesGame } from '../../actions';
  import RefRows from '../../../../shell/RefRows.svelte';
  import MyCard from '../MyCard.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? codenamesGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const rows = $derived(game ? [
    { emoji: '🔴', name: 'Casillas rojas', note: `quedan ${game.remaining.red}`, desc: 'Las del equipo rojo: destapadlas todas para ganar.' },
    { emoji: '🔵', name: 'Casillas azules', note: `quedan ${game.remaining.blue}`, desc: 'Las del equipo azul.' },
    { emoji: '⬜', name: 'Transeúntes (neutrales)', note: '7', desc: 'Tocar una corta el turno de tu equipo.' },
    { emoji: '💀', name: 'El Asesino', note: '1', desc: 'Tocarla hace PERDER a tu equipo al instante.' },
    { emoji: '💬', name: 'La pista', desc: 'El Jefe da UNA palabra + un número; su equipo toca hasta número+1 casillas. Al menos un toque por turno; luego se puede pasar.' },
  ] : []);
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tu papel</h3>
  {#if inGame}
    <MyCard {game} pid={my.id} />
  {:else}
    <p class="small-note">👀 Miras de espectador (sin ver el mapa oculto).</p>
  {/if}
  <RefRows title="📖 El tablero (25 palabras)" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
