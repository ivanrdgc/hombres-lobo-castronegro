<script lang="ts">
  // Pillaron al Camaleón: su última baza es señalar en la rejilla la palabra
  // secreta. Solo actúa el Camaleón; los demás miran.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ChameleonState } from '../types';
  import Grid from './Grid.svelte';

  const { game, my }: { game: ChameleonState; my: PlayerDoc } = $props();
  const amCham = $derived(my.id === game.chameleonId);
  const nm = (pid: string) => game.names[pid] || '¿?';
  let pick = $state<number | null>(null);
</script>

<div class="narration">🎯 ¡{nm(game.chameleonId)} era el Camaleón! Aún puede escapar si adivina la palabra secreta.</div>

{#if amCham}
  <div class="actionpanel"><h3>🦎 Adivina la palabra</h3>
    <p class="hint">Te han pillado. Señala en la rejilla cuál crees que era la palabra secreta: si aciertas, escapas y ganas.</p>
    <Grid grid={game.grid} guess={pick} selectable={true} onpick={(i) => (pick = i)} />
    <button class="danger block" data-a="ch-guess-confirm" disabled={pick === null} onclick={() => (pick !== null ? guard(() => A.chameleonGuess(pick!)) : undefined)}>🎯 {pick !== null ? `Apostar por «${game.grid[pick]}»` : 'Elige una palabra'}</button>
  </div>
{:else}
  <Grid grid={game.grid} />
  <div class="card"><p class="hint">🦎 El Camaleón intenta adivinar la palabra secreta…</p></div>
{/if}
