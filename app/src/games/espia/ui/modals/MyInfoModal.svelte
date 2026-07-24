<script lang="ts">
  // Lo que hay detrás de la pastilla flotante «🎴 Mi carta y las reglas»: la
  // ÚNICA puerta a tu carta en todo El Espía (docs/UX.md · B34). Arriba tu
  // carta, ya destapada —para eso la has pedido— y con auto-tapado (B28);
  // debajo, las reglas del juego. La libreta no está aquí: es una herramienta y
  // vive en la pantalla de la ronda, con su propio botón.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { espiaGame } from '../../actions';
  import RefRows from '../../../../shell/RefRows.svelte';
  import LugaresGrid from '../LugaresGrid.svelte';
  import MyCard from '../MyCard.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? espiaGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const rows = [
    { emoji: '🕵️', name: 'El espía', note: 'uno por ronda', desc: 'No conoce el lugar: deduce con las respuestas. Puede revelarse y adivinar el lugar mientras corre el reloj y también en la tanda de acusaciones (nunca durante una votación). +2 escondido · +4 si condenan a un inocente · +4 si adivina.' },
    { emoji: '👥', name: 'Los agentes', note: 'todos los demás', desc: 'Conocen el lugar y su papel: responden sin nombrarlo, ni muy exacto ni muy vago. Al ganar la ronda: +1 cada uno, +1 extra a quien inició la acusación.' },
    { emoji: '🛑', name: 'Acusar', note: 'una vez por ronda y jugador', desc: 'Para el reloj. Votan todos menos acusador (su «sí» ya cuenta) y acusado. Unanimidad = se revela la carta y la ronda TERMINA, sea el espía o no (si era inocente, +4 para el espía). Un solo «no» la tumba, el reloj sigue… y la acusación se gasta igual.' },
    { emoji: '⏰', name: 'Si el reloj llega a cero', desc: 'Se acaban las preguntas: acusaciones por turnos desde quien repartió, acusando o pasando. Aquí acusa todo el mundo, aunque ya gastara la suya. Si nadie es condenado, el espía se marcha de rositas (+2).' },
    { emoji: '📝', name: 'Mi libreta', note: 'en la pantalla de la ronda', desc: 'Las 30 localizaciones posibles, para ir tachando las que descartes con cada respuesta. Los tachones solo existen en tu móvil: no los ve nadie.' },
  ];
</script>

{#if game && my}
  {#if inGame}
    <MyCard {game} {my} />
  {:else}
    <p class="small-note" style="margin-top:0">👀 Miras de espectador: sin carta propia. Aquí tienes las reglas y las localizaciones posibles.</p>
  {/if}
  <RefRows title="📖 Las reglas" {rows} />
  {#if !inGame}
    <!-- Quien juega ya tiene la lista entera (y tachable) en su libreta: no se
         repite aquí. El espectador no tiene libreta, así que la ve tal cual. -->
    <h3 style="margin:16px 0 6px">📍 Las localizaciones posibles</h3>
    <LugaresGrid />
  {/if}
{/if}
<button class="primary block" style="margin-top:12px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
