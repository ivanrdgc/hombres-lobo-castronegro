<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu bando, rol y sala, y la chuleta del
  // juego. Accesible en cualquier fase (también durante los votos).
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { twoRoomsGame } from '../../actions';
  import RefRows from '../../../../shell/RefRows.svelte';
  import MyCard from '../MyCard.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? twoRoomsGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const rows = [
    { emoji: '🕊️', name: 'Presidente', note: 'azul', desc: 'El azul gana si acaba la partida en una sala SIN el Bombardero. Enséñate con cuidado: los rojos te buscan.' },
    { emoji: '💣', name: 'Bombardero', note: 'rojo', desc: 'El rojo gana si acaba en la MISMA sala que el Presidente: ¡BOOM!' },
    { emoji: '🎴', name: 'Cartas normales', desc: 'Azules protegen al Presidente; rojos maniobran para juntar al Bombardero con él. Enseñar tu carta (en privado) es tu herramienta.' },
    { emoji: '👀', name: 'Enseñar la carta', note: 'cara a cara', desc: 'Abres tu carta aquí y le enseñas la pantalla a quien tú decidas, tapando el resto. Con «Enseñar solo el color» se ve el bando y NO el rol.' },
    { emoji: '🔄', name: 'Rehenes', desc: 'Al final de cada ronda, cada sala vota a quién manda a la otra (uno de cada cuatro, mínimo uno); tras el intercambio os colocáis SIN reloj y confirmáis con el botón.' },
  ];
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tu carta</h3>
  {#if inGame}
    <MyCard {game} pid={my.id} />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
  {/if}
  <RefRows title="📖 Chuleta" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
