<script lang="ts">
  // Confirmación del voto definitivo del día (port de voteConfirmModal de la v1).
  import { app } from '../../core/sync/store.svelte';
  import { guard } from '../../core/sync/guard';
  import * as A from '../../games/hombres-lobo/actions';

  const pid = $derived(String(app.ui.modal?.pid ?? ''));
  const p = $derived(app.players.find((x) => x.id === pid));

  function voteFinal() {
    const choice = pid;
    app.ui.modal = null;
    void guard(() => A.castVote(choice));
  }
</script>

<h3>⚖️ ¿Condenar a {p?.name || ''}?</h3>
<p class="small-note">Esta decisión es definitiva para hoy: nadie más podrá votar.</p>
<button class="danger block" data-a="vote-final" data-p={pid} onclick={voteFinal}>⚖️ Sí, el pueblo ha hablado</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
