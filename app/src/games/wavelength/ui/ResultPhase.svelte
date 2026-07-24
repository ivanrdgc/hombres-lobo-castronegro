<script lang="ts">
  // Resultado: se revela el objetivo y la marca del equipo, la puntuación de la
  // ronda y el marcador. Otra ronda rota el Psíquico y cambia el espectro.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { psychicId, scoreLabel } from '../engine';
  import { spectrumLabel } from '../spectrums';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { WavelengthState } from '../types';
  import Dial from './Dial.svelte';

  const { game, my }: { game: WavelengthState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0)));
  void my;
</script>

<div class="narration">🎯 {game.lastScore !== null ? scoreLabel(game.lastScore) : ''}</div>

<div class="card" style="text-align:center">
  <p class="small-note" style="margin:0 0 2px">📡 {spectrumLabel(game.spectrumId)}</p>
  <Dial spectrumId={game.spectrumId} target={game.target} marker={game.marker} />
  <p class="small-note">Objetivo en <b>{game.target}</b> · marca del equipo en <b>{game.marker}</b> · Psíquico: <b>{nm(psychicId(game))}</b></p>
</div>

<div class="card">
  <h3>🏆 Marcador <span style="opacity:.7;font-weight:400">(equipo: {game.teamScore})</span></h3>
  {#each ranked as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{nm(pid)}{pid === psychicId(game) ? ' 🔮' : ''}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="wl-again" onclick={() => guard(A.nextRound)}>🔁 Otra ronda (rota el Psíquico)</button>
<button class="ghost block" data-a="wl-back-lobby" onclick={() => guard(() => A.endWavelength())}>🏁 Terminar y volver al lobby</button>
