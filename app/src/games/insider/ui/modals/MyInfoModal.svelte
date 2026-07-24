<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): tu papel (y la palabra si la conoces)
  // y la chuleta de roles y puntos. Accesible en cualquier fase.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { insiderGame } from '../../actions';
  import RefRows from '../../../../shell/RefRows.svelte';
  import MyCard from '../MyCard.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? insiderGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));
  const rows = [
    { emoji: '🎓', name: 'Maestro', note: 'público, rota', desc: 'Conoce la palabra; responde solo «sí», «no» o «no lo sé». Pulsa «¡Palabra adivinada!» cuando alguien la diga.' },
    { emoji: '🕵️', name: 'Insider', note: 'secreto', desc: 'También conoce la palabra: guía las preguntas hacia ella sin delatarse. Gana si la adivináis y no lo señaláis.' },
    { emoji: '👤', name: 'Comunes', desc: 'No conocen la palabra: preguntan de sí o no, y tras adivinarla cazan al Insider con el voto.' },
    { emoji: '🏆', name: 'Puntos', desc: 'Insider cazado: +1 al Maestro y a cada común · Insider que escapa: +2 para él · tiempo agotado: nadie puntúa.' },
  ];
</script>

{#if game && my}
  <h3 style="margin:0 0 4px">🎴 Tu carta</h3>
  {#if inGame}
    <MyCard {game} pid={my.id} />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin carta propia.</p>
  {/if}
  <RefRows title="📖 Los papeles" {rows} />
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
