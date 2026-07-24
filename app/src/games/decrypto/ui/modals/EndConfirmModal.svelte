<script lang="ts">
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
</script>

<h3>🏳️ ¿Terminar la partida?</h3>
<p class="small-note">Se cierra para todos y la mesa vuelve al lobby de Decrypto. No se puede «salir uno solo»: con los equipos y las palabras ya repartidos, irse es terminar.</p>
<button class="danger block" data-a="de-end-confirm" onclick={() => guard(async () => { await A.endDecrypto(); app.ui.modal = null; })}>🏳️ Sí, terminar</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
