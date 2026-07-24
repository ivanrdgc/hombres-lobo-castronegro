<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu bando (con lo que sabes) y la
  // chuleta de cartas y poderes. Accesible en cualquier fase.
  //
  // Postura 🍽️ MESA (B28): la carta se abre dentro de la cortina de privacidad
  // —abrir este modal ES el gesto, así que entra ya destapada— y se oculta sola.
  // La chuleta es pública y puede quedarse a la vista.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { shGame } from '../../actions';
  import RefRows from '../../../../shell/RefRows.svelte';
  import MyCard from '../MyCard.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? shGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const rows = [
    { emoji: '🕊️', name: 'Liberal', note: 'mayoría', desc: 'No sabe nada de nadie. Gana con 5 decretos liberales o ejecutando a Hitler.' },
    { emoji: '🐷', name: 'Fascista', desc: 'Conoce a los suyos y a Hitler. Gana con 6 decretos fascistas o con Hitler de Canciller (3+ fascistas en mesa).' },
    { emoji: '💀', name: 'Hitler', desc: 'Con 5-6 jugadores conoce a su fascista; con 7+ juega a ciegas. Finge ser el liberal más ejemplar.' },
    { emoji: '📜', name: 'Legislar', desc: 'Presidente ve 3 decretos y descarta 1; Canciller promulga 1 de los 2. Solo lo promulgado es público. Con 5 fascistas: VETO (una vez por sesión).' },
    { emoji: '⚡', name: 'Poderes fascistas', desc: 'Según jugadores: mirar el mazo, investigar lealtades (Hitler sale «fascista»), elección especial o ejecutar.' },
  ];
</script>

{#if game && my}
  {#if inGame}
    <MyCard {game} pid={my.id} startOpen />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
  {/if}
  <RefRows title="📖 Chuleta" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
