<script lang="ts">
  // Terminar la partida (cualquier dispositivo): vuelve al lobby de Una Noche.
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
</script>

<h3>🏳️ ¿Terminar la partida?</h3>
<p class="small-note">Se cierra la partida en curso: la mesa vuelve al lobby de Una Noche.</p>
<button class="danger block" data-a="una-end-confirm" onclick={() => guard(async () => { await A.endUnaNoche(); app.ui.modal = null; })}>🏳️ Sí, terminar</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
