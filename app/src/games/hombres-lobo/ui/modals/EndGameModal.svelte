<script lang="ts">
  // Terminar la partida eligiendo el desenlace (port de endGameModal de la v1):
  // solo se ofrecen los desenlaces posibles con los roles de esta partida.
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
  import { WINNER_LABELS } from '../../engine';
  import type { RoleId } from '../../roles';
  import type { WinnerId } from '../../types';

  const players = $derived(app.players.filter((p) => p.inGame));
  const relevant = $derived.by((): Partial<Record<WinnerId, boolean>> => {
    const comp = app.group?.game?.composition || {};
    const hasRole = (r: RoleId) => (comp[r] || 0) > 0 || players.some((p) => p.role === r);
    return {
      pueblo: true,
      lobos: true,
      enamorados: hasRole('cupido') || players.some((p) => p.lover),
      gaitero: hasRole('gaitero'),
      lobo_albino: hasRole('lobo_albino'),
      sectario: hasRole('sectario'),
      angel: hasRole('angel'),
    };
  });
  const winners = $derived(
    (Object.entries(WINNER_LABELS) as [WinnerId, string][]).filter(([k]) => k !== 'nadie' && relevant[k]),
  );

  function confirm(winner: WinnerId | '') {
    app.ui.modal = null; // cerrar antes de enviar, como la v1
    void guard(() => A.endGameNow(winner || null));
  }
</script>

<h3>🏳️ Terminar la partida</h3>
<p class="small-note">Elige el resultado (o deja que la app lo calcule con los vivos actuales).</p>
<button class="primary block" data-a="end-game-confirm" data-p="" onclick={() => confirm('')}>🧮 Calcular ganador automáticamente</button>
{#each winners as [k, label] (k)}
  <button class="ghost block" data-a="end-game-confirm" data-p={k} onclick={() => confirm(k)}>{label}</button>
{/each}
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
