<script lang="ts">
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
</script>

<h3>⏭️ ¿Saltar esta ronda?</h3>
<p class="small-note">La ronda se anula: no puntúa a nadie y pasa el turno (nuevo espectro y nuevo Psíquico). La partida y el marcador siguen intactos. Útil si el Psíquico se ha atascado, ha dejado el móvil o se ha perdido la pista.</p>
<button class="primary block" data-a="wl-skip-confirm" onclick={() => guard(async () => { await A.skipRound(); app.ui.modal = null; })}>⏭️ Sí, saltar la ronda</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
