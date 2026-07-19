<script lang="ts">
  // Confirmación para terminar una partida en curso DESDE LA MESA (cualquiera
  // puede: es la mesa de casa). En Hombres Lobo con la partida a medias, se
  // salta al desenlace (roles a la vista); si ya está en su pantalla final,
  // se cierra del todo. En El Espía se cierra directamente.
  import { app } from '../../core/sync/store.svelte';
  import { guard } from '../../core/sync/guard';
  import * as A from '../../core/sync/group-actions';
  import { gameDef } from '../../games/registry';

  const mid = $derived((app.ui.modal?.mid as string | undefined) ?? '');
  const m = $derived(app.matches.find((x) => x.id === mid));
  const def = $derived(m ? gameDef(m.gameId) : null);
  const ended = $derived(!!m && (m.game as { phase?: string } | null)?.phase === 'end');

  function endConfirm() {
    const id = mid;
    app.ui.modal = null;
    guard(() => A.endMatch(id));
  }
</script>

{#if m && def}
  <h3>🛑 ¿Terminar la partida de {def.name}?</h3>
  {#if ended}
    <p class="small-note">La partida ya está en su pantalla final: se cerrará y sus jugadores quedarán libres para otra.</p>
  {:else if m.gameId === 'hombres_lobo'}
    <p class="small-note">La partida saltará a su desenlace y se revelarán los roles. Los jugadores podrán cerrar desde allí.</p>
  {:else}
    <p class="small-note">La partida se cierra (el marcador no se conserva) y sus jugadores quedan libres para otra.</p>
  {/if}
  <button class="danger block" data-a="end-match-confirm" onclick={endConfirm}>🛑 Sí, terminarla</button>
  <button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
{/if}
