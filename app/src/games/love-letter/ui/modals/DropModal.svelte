<script lang="ts">
  // Rescate del máster cuando un móvil muere a mitad de ronda: retira al
  // ausente de ESTA ronda para que la partida no se quede atascada en su turno.
  // No es lo mismo que sacarlo de la mesa (eso cierra la partida entera).
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';

  const g = $derived(viewGroup());
  const game = $derived(g ? A.loveLetterGame(g) : null);
  const myId = $derived(me()?.id);
  const alive = $derived(game ? game.playerIds.filter((pid) => game.alive[pid]) : []);
</script>

<h3 style="margin:0 0 4px">⏭️ Retirar a un ausente de la ronda</h3>
<p class="small-note">Si a alguien se le muere el móvil, la ronda se atasca en su turno. Sácalo de ESTA ronda: se descarta su mano y el juego sigue. Vuelve a jugar en la siguiente ronda.</p>
{#if game && game.phase === 'turn'}
  {#each alive as pid (pid)}
    <button class="danger block" data-a="ll-drop" data-p={pid}
      onclick={() => guard(async () => { await A.dropPlayer(pid); app.ui.modal = null; })}>
      ❌ Retirar a {game.names[pid] || '¿?'}{pid === myId ? ' (tú)' : ''}{game.turn === pid ? ' · le toca ahora' : ''}
    </button>
  {/each}
{:else}
  <p class="small-note">Ahora mismo no hay ninguna ronda en juego.</p>
{/if}
<button class="ghost block" style="margin-top:10px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
