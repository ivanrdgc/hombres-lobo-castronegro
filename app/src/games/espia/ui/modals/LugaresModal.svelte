<script lang="ts">
  // La lista pública de localizaciones (carta de referencia).
  import { app } from '../../../../core/sync/store.svelte';
  import { LOCATIONS } from '../../locations';
  import LugaresGrid from '../LugaresGrid.svelte';
</script>

<h3>📍 Las {LOCATIONS.length} localizaciones</h3>
<p class="small-note">Cada una con 7 papeles posibles. La lista no cambia y es pública. Durante la ronda la tienes en «📝 Mi libreta», donde además puedes ir tachando las que descartes (solo en tu móvil).</p>
<LugaresGrid />
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
