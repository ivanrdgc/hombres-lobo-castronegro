<script lang="ts">
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
</script>

<h3>🚪 ¿Dejar la partida?</h3>
<p class="small-note">El Camaleón necesita a todos: si alguien se va, la ronda ya no vale, así que la partida se cierra y todos vuelven al lobby.</p>
<button class="danger block" data-a="ch-leave-confirm" onclick={() => guard(async () => { await A.endChameleon(); app.ui.modal = null; })}>🚪 Sí, salir y terminar</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
