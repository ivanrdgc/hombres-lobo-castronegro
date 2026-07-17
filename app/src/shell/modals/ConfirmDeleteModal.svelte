<script lang="ts">
  // Confirmación de borrado del grupo entero (port de confirmDeleteModal v1).
  import { app } from '../../core/sync/store.svelte';
  import { guard } from '../../core/sync/guard';
  import * as A from '../../core/sync/group-actions';

  function deleteConfirm() {
    app.ui.modal = null;
    guard(() => A.deleteGroup());
  }
</script>

<h3>🗑️ ¿Eliminar el grupo?</h3>
<p class="small-note">Se expulsará a todos los jugadores y el nombre del grupo quedará libre. Esta acción no se puede deshacer.</p>
<button class="danger block" data-a="delete-group-confirm" onclick={deleteConfirm}>🗑️ Sí, eliminar todo</button><button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
