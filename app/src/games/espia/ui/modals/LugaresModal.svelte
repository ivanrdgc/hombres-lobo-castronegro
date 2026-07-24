<script lang="ts">
  // La lista pública de localizaciones (carta de referencia).
  import { app } from '../../../../core/sync/store.svelte';
  import { LOCATIONS } from '../../locations';
  import LugaresGrid from '../LugaresGrid.svelte';
</script>

<h3>📍 Las {LOCATIONS.length} localizaciones</h3>
<p class="small-note">Cada una con 7 papeles posibles. En la ronda, todos reciben el mismo lugar… menos el espía. La lista no cambia y es pública: durante la partida la tienes al pie de la pantalla de juego, donde además puedes tachar las que vayas descartando.</p>
<LugaresGrid />
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
