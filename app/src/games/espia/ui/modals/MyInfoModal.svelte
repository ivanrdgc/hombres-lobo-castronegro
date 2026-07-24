<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu carta (lugar y papel, o espía) y la
  // chuleta de reglas y puntos, con acceso a las localizaciones posibles.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { espiaGame } from '../../actions';
  import RefRows from '../../../../shell/RefRows.svelte';
  import SpyCard from '../SpyCard.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? espiaGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const rows = [
    { emoji: '🕵️', name: 'El espía', note: 'uno por ronda', desc: 'No conoce el lugar: deduce con las respuestas. Puede revelarse y adivinar el lugar mientras corre el reloj y también en la tanda de acusaciones (nunca durante una votación). +2 escondido · +4 si condenan a un inocente · +4 si adivina.' },
    { emoji: '👥', name: 'Los agentes', note: 'todos los demás', desc: 'Conocen el lugar y su papel: responden sin nombrarlo, ni muy exacto ni muy vago. Al ganar la ronda: +1 cada uno, +1 extra a quien inició la acusación.' },
    { emoji: '🛑', name: 'Acusar', note: 'una vez por ronda y jugador', desc: 'Para el reloj. Votan todos menos acusador (su «sí» ya cuenta) y acusado. Unanimidad = se revela la carta y la ronda TERMINA, sea el espía o no (si era inocente, +4 para el espía). Un solo «no» la tumba, el reloj sigue… y la acusación se gasta igual.' },
    { emoji: '⏰', name: 'Si el reloj llega a cero', desc: 'Se acaban las preguntas: acusaciones por turnos desde quien repartió, acusando o pasando. Aquí acusa todo el mundo, aunque ya gastara la suya. Si nadie es condenado, el espía se marcha de rositas (+2).' },
  ];
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tu carta</h3>
  {#if inGame}
    <SpyCard {game} pid={my.id} />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
  {/if}
  <RefRows title="📖 Chuleta" {rows} />
  <button class="block" style="margin-top:8px" data-a="espia-lugares-open" onclick={() => (app.ui.modal = { type: 'espia-lugares' })}>🗺️ Ver las localizaciones posibles</button>
  <p class="small-note" style="margin-top:6px">Durante la ronda las tienes también al pie de la pantalla de juego, y ahí puedes ir tachando las que descartes (solo en tu móvil).</p>
{/if}
<button class="primary block" style="margin-top:10px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
