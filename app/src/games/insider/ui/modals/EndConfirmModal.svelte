<script lang="ts">
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
</script>

<h3>🏳️ ¿Terminar la partida?</h3>
<p class="small-note">Se cierra para TODOS y se pierde el marcador acumulado de estas rondas: la mesa vuelve al lobby de Insider. Si solo queréis parar un rato, usa ⋯ → ⏸️ Pausar.</p>
<button class="danger block" data-a="ins-end-confirm" onclick={() => guard(async () => { await A.endInsider(); app.ui.modal = null; })}>🏳️ Sí, terminar</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
