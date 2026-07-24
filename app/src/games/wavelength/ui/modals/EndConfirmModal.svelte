<script lang="ts">
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
</script>

<h3>🏳️ ¿Terminar la partida?</h3>
<p class="small-note">Se cierra para TODOS y los puntos se borran: la mesa vuelve al lobby de Wavelength. Es también la salida cuando alguien tiene que irse, porque el Psíquico ha de poder rotar entre los presentes.</p>
<p class="small-note">Si solo queréis pasar de ronda, usa «⏭️ Saltar ronda»; si la partida ya ha llegado a su meta, cerradla desde el resumen final (así veis el total).</p>
<button class="danger block" data-a="wl-end-confirm" onclick={() => guard(async () => { await A.endWavelength(); app.ui.modal = null; })}>🏳️ Sí, terminar</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
