<script lang="ts">
  // La apuesta del espía: se revela y señala una localización. Termina la
  // ronda, acierte o falle.
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
  import { locationById } from '../../locations';
  import LugaresGrid from '../LugaresGrid.svelte';

  let pick = $state<string | null>(null);
  const pickLoc = $derived(locationById(pick));

  function confirm() {
    if (!pick) return;
    const id = pick;
    void guard(async () => { await A.spyGuess(id); app.ui.modal = null; });
  }
</script>

<h3>🎭 Revelarte y adivinar</h3>
<p class="small-note">Vas a anunciar a la mesa que eres el espía. Señala el lugar: si aciertas, +4 para ti; si fallas, +1 para cada agente. No hay vuelta atrás.</p>
<LugaresGrid selectable={true} selected={pick} onPick={(id) => (pick = pick === id ? null : id)} />
<button class="violet block" data-a="espia-guess-confirm" disabled={!pick} onclick={confirm}>🎭 {pickLoc ? `Es ${pickLoc.emoji} ${pickLoc.name}` : 'Elige una localización'}</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Sigo disimulando</button>
