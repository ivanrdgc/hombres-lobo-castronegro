<script lang="ts">
  // Confirmación de «terminar el juego» a mitad de ronda (cualquier dispositivo).
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
</script>

<h3>🏳️ ¿Terminar el juego?</h3>
<p class="small-note">Se cierra la ronda en curso y el marcador: la mesa vuelve al lobby de El Espía.</p>
<button class="danger block" data-a="espia-end-confirm" onclick={() => guard(async () => { await A.endEspia(); app.ui.modal = null; })}>🏳️ Sí, terminar</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
