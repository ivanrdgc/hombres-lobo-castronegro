<script lang="ts">
  // Confirmación de «dejar la ronda» (salida administrativa).
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
  import { espiaGame } from '../../actions';

  const game = $derived(espiaGame(app.group));
  const soyEspia = $derived(!!game && app.session?.pid === game.spyId && game.phase !== 'reveal');
</script>

<h3>🚪 ¿Dejar la ronda?</h3>
<p class="small-note">{soyEspia
  ? 'Eres el espía: si te vas, la ronda termina y los agentes se apuntan la victoria (+1).'
  : 'Sales de esta ronda al instante. Si quedan menos de 3, la ronda se disuelve sin puntos; durante el reparto, se barajan identidades nuevas.'}</p>
<button class="danger block" data-a="espia-leave-confirm" onclick={() => guard(async () => { await A.leaveRound(); app.ui.modal = null; })}>🚪 Sí, me voy</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
