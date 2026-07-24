<script lang="ts">
  // Fase de adivinar: el equipo (todos menos el Psíquico) mueve el marcador y,
  // tras debatir, UNO lo fija. El Psíquico ya no interviene.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { psychicId } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { WavelengthState } from '../types';
  import Dial from './Dial.svelte';

  const { game, my }: { game: WavelengthState; my: PlayerDoc } = $props();
  const iAmPsychic = $derived(psychicId(game) === my.id);
  const inTeam = $derived(game.playerIds.includes(my.id) && !iAmPsychic);
  let pick = $state(50);
</script>

{#if inTeam}
  <div class="actionpanel"><h3>🎚️ ¿Dónde apuntaba?</h3>
    <p class="hint">Debatid la pista y arrastrad el marcador. Cuando os pongáis de acuerdo, uno lo fija por todos.</p>
    <Dial spectrumId={game.spectrumId} selectable={true} value={pick} onpick={(v) => (pick = v)} />
    <button class="primary block" data-a="wl-guess-confirm" onclick={() => guard(() => A.castGuess(pick))}>✅ Fijar la marca ({pick})</button>
  </div>
{:else}
  <div class="narration">🎚️ Ya diste tu pista. El equipo está decidiendo dónde colocar el marcador… tú calla y disfruta.</div>
  <div class="card"><Dial spectrumId={game.spectrumId} target={game.target} /></div>
{/if}
