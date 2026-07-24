<script lang="ts">
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
</script>

<h3>🚪 ¿Dejar la partida?</h3>
<p class="small-note">Captain Sonar depende de las dos tripulaciones: si alguien se va, la partida ya no vale, así que se cierra y todos vuelven al lobby.</p>
<button class="danger block" data-a="sn-leave-confirm" onclick={() => guard(async () => { await A.endSonar(); app.ui.modal = null; })}>🚪 Sí, salir y terminar</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
