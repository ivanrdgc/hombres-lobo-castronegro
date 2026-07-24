<script lang="ts">
  // «🎴 Mi carta y las reglas» (B19/B21/B34): la ÚNICA puerta a tu carta durante
  // la partida —Two Rooms es de postura 🍽️ mesa—, más la referencia del juego.
  // Accesible en cualquier fase (también durante los votos).
  //
  // Aquí NO se enseña la carta a nadie: eso es otra cosa, se hace durante la
  // ronda con «🤝 Enseñar mi carta a alguien» y tiene su propia pantalla.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { twoRoomsGame } from '../../actions';
  import RefRows from '../../../../shell/RefRows.svelte';
  import MyCard from '../MyCard.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? twoRoomsGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const rows = [
    { emoji: '🎖️', name: 'Presidente', note: 'azul', desc: 'El azul gana si acaba la partida en una sala SIN el Bombardero. Enséñate con cuidado: los rojos te buscan.' },
    { emoji: '💣', name: 'Bombardero', note: 'rojo', desc: 'El rojo gana si acaba en la MISMA sala que el Presidente: ¡BOOM!' },
    { emoji: '🎴', name: 'Cartas normales', desc: 'Azules protegen al Presidente; rojos maniobran para juntar al Bombardero con él. Enseñar tu carta (en privado) es tu herramienta.' },
    { emoji: '🤝', name: 'Enseñar mi carta', note: 'durante la ronda', desc: 'Botón de la pantalla de la ronda: tu carta llena el móvil y se lo pones delante a quien tú decidas. Con «🎨 solo el color» se ve tu bando y NO tu rol.' },
    { emoji: '🔄', name: 'Rehenes', desc: 'Al final de cada ronda, cada sala vota a quién manda a la otra (uno de cada cuatro, mínimo uno); tras el intercambio os colocáis SIN reloj y confirmáis con el botón.' },
  ];
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Mi carta</h3>
  {#if inGame}
    <MyCard {game} pid={my.id} autoHide={game.phase !== 'end'} />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
  {/if}
  <RefRows title="📖 Las reglas" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
