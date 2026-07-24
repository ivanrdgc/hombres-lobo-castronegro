<script lang="ts">
  // Marcador cooperativo. En orden de MESA, no de puntos: es un ranking falso
  // (solo se suma siendo Psíquico, así que quien aún no lo ha sido sale con 0 y
  // parece que va perdiendo). Al lado, las rondas que ha llevado cada uno.
  import { average, psychicId } from '../engine';
  import type { WavelengthState } from '../types';

  const { game, highlightPsychic = false }: { game: WavelengthState; highlightPsychic?: boolean } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const turnsOf = (pid: string) => game.psychicRounds?.[pid] || 0;
</script>

<div class="card">
  <h3>🏆 Puntos que ha conseguido transmitir cada uno</h3>
  <p class="small-note" style="margin-top:-4px">Solo se suma siendo Psíquico: no es una clasificación, es cuánto ha sintonizado la mesa con cada uno. El resultado de verdad es el total del equipo: <b>{game.teamScore}</b> ({average(game.teamScore, game.scored || 0)} por ronda).</p>
  {#each game.playerIds as pid (pid)}
    <div class="settingrow" style="align-items:center" data-a="wl-score-row" data-p={pid}>
      <div class="sinfo">
        <div class="sname">{nm(pid)}{highlightPsychic && pid === psychicId(game) ? ' 🔮' : ''}</div>
        <div class="sdesc">{turnsOf(pid) === 0 ? 'aún no ha sido Psíquico' : `${turnsOf(pid)} ${turnsOf(pid) === 1 ? 'ronda' : 'rondas'} como Psíquico · media ${average(game.scores[pid] || 0, turnsOf(pid))}`}</div>
      </div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>
