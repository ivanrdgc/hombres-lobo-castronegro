<script lang="ts">
  // Confirmación de abandono del grupo (port de confirmLeaveModal v1).
  import { app } from '../../core/sync/store.svelte';
  import { guard } from '../../core/sync/guard';
  import * as A from '../../core/sync/group-actions';

  function leaveConfirm() {
    app.ui.modal = null;
    guard(() => A.leaveGroup());
  }
</script>

<h3>🚪 ¿Abandonar el grupo?</h3>
<p class="small-note">Saldrás de la lista y se cerrará tu sesión en este dispositivo.</p>
<button class="danger block" data-a="leave-confirm" onclick={leaveConfirm}>🚪 Sí, salir</button><button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
