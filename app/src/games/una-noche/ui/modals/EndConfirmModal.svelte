<script lang="ts">
  // Terminar la partida (cualquier dispositivo): vuelve al lobby de Una Noche.
  // Es también la salida de quien quiere irse: en una partida de una sola noche
  // no se puede abandonar sin cerrarla, y el aviso lo dice.
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
</script>

<h3>🏳️ ¿Terminar la partida?</h3>
<p class="small-note">Una Noche dura una sola noche: no se puede salir sin cerrarla, porque el reparto ya no valdría. La mesa vuelve al lobby y podéis empezar otra al instante.</p>
<button class="danger block" data-a="una-end-confirm" onclick={() => guard(async () => { await A.endUnaNoche(); app.ui.modal = null; })}>🏳️ Sí, terminar</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
