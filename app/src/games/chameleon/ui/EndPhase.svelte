<script lang="ts">
  // Final de ronda: se destapa la palabra secreta y el Camaleón, con el
  // marcador acumulado. Otra ronda re-reparte tema y Camaleón.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { WIN_LABELS } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ChameleonState } from '../types';
  import Grid from './Grid.svelte';

  const { game, my }: { game: ChameleonState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0)));
  void my;
</script>

<div class="narration">🌟 Fin de la ronda.</div>

<div class="card" style="text-align:center">
  <h3 style="margin:6px 0">{game.winner ? WIN_LABELS[game.winner] : ''}</h3>
  <p class="small-note">El Camaleón era <b>{nm(game.chameleonId)}</b>. La palabra secreta: <b>«{game.grid[game.secret]}»</b>{game.guess !== null ? ` · apostó por «${game.grid[game.guess]}»` : ''}.</p>
  <Grid grid={game.grid} secret={game.secret} guess={game.guess} />
</div>

<div class="card">
  <h3>🏆 Marcador</h3>
  {#each ranked as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{nm(pid)}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="ch-again" onclick={() => guard(A.nextRound)}>🔁 Otra ronda</button>
<button class="ghost block" data-a="ch-back-lobby" onclick={() => guard(() => A.endChameleon())}>🏁 Terminar y volver al lobby</button>
