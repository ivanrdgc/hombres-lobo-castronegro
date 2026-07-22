<script lang="ts">
  // Dejar la partida. Una Noche es de una sola noche: al irse alguien, el
  // reparto queda inservible, así que la partida termina para todos.
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
</script>

<h3>🚪 ¿Dejar la partida?</h3>
<p class="small-note">Una Noche dura una sola noche: si alguien se va, el reparto ya no vale, así que la partida se cierra y todos vuelven al lobby (podéis empezar otra al instante).</p>
<button class="danger block" data-a="una-leave-confirm" onclick={() => guard(async () => { await A.endUnaNoche(); app.ui.modal = null; })}>🚪 Sí, salir y terminar</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
