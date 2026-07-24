<script lang="ts">
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
</script>

<h3>🏳️ ¿Terminar la partida?</h3>
<p class="small-note">Se cierra para todos y la mesa vuelve al lobby de Captain Sonar. Es también la salida si alguien se tiene que ir: sin las dos tripulaciones no hay caza, así que irse es terminar.</p>
<button class="danger block" data-a="sn-end-confirm" onclick={() => guard(async () => { await A.endSonar(); app.ui.modal = null; })}>🏳️ Sí, terminar</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
