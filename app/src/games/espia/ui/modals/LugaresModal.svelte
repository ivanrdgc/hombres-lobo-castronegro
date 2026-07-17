<script lang="ts">
  // La lista pública de localizaciones (carta de referencia).
  import { app } from '../../../../core/sync/store.svelte';
  import { LOCATIONS } from '../../locations';
  import LugaresGrid from '../LugaresGrid.svelte';
</script>

<h3>📍 Las {LOCATIONS.length} localizaciones</h3>
<p class="small-note">Cada una con 7 papeles posibles. En la ronda, todos reciben el mismo lugar… menos el espía.</p>
<LugaresGrid />
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
