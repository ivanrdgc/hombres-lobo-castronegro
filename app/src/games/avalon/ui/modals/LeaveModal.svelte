<script lang="ts">
  // Dejar la partida. Ávalon depende del reparto completo: al irse alguien, se
  // cierra para todos (podéis empezar otra al instante).
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
</script>

<h3>🚪 ¿Dejar la partida?</h3>
<p class="small-note">Ávalon necesita a todos: si alguien se va, el reparto ya no vale, así que la partida se cierra y todos vuelven al lobby.</p>
<button class="danger block" data-a="av-leave-confirm" onclick={() => guard(async () => { await A.endAvalon(); app.ui.modal = null; })}>🚪 Sí, salir y terminar</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
