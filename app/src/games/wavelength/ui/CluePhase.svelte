<script lang="ts">
  // Fase de pista: SOLO el Psíquico ve el objetivo (la diana en su dial) y da la
  // pista en voz alta; el resto espera sin ver el objetivo.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { psychicId } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { WavelengthState } from '../types';
  import Dial from './Dial.svelte';

  const { game, my }: { game: WavelengthState; my: PlayerDoc } = $props();
  const iAmPsychic = $derived(psychicId(game) === my.id);
  const psychicName = $derived(game.names[psychicId(game)] || '¿?');
</script>

{#if iAmPsychic}
  <div class="actionpanel"><h3>🔮 Eres el Psíquico</h3>
    <p class="hint">Solo tú ves la diana. Di EN VOZ ALTA una idea que, para ti, caiga justo ahí (sin señalar el dial). Luego pulsa el botón.</p>
    <Dial spectrumId={game.spectrumId} target={game.target} />
    <button class="primary block" data-a="wl-clue-done" onclick={() => guard(A.giveClue)}>💬 Ya he dado la pista</button>
  </div>
{:else}
  <div class="narration">🔮 <b>{psychicName}</b> está mirando el objetivo y pensando su pista… Escuchad con atención.</div>
  <div class="card"><Dial spectrumId={game.spectrumId} /></div>
{/if}
