<script lang="ts">
  // Reparto por persona, en orden de MESA y no de puntos: es un ranking falso
  // (solo se suma siendo Psíquico, así que quien aún no lo ha sido sale con 0 y
  // parece que va perdiendo). El total del equipo —el resultado de verdad— vive
  // en la cabecera de la partida y en el resumen final: aquí no se repite.
  // «Puntos» siempre significa esto; la cosa que se arrastra por el dial es «la
  // marca», nunca «el marcador».
  import { average, psychicId } from '../engine';
  import type { WavelengthState } from '../types';

  const { game, highlightPsychic = false }: { game: WavelengthState; highlightPsychic?: boolean } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const turnsOf = (pid: string) => game.psychicRounds?.[pid] || 0;
</script>

<div class="card">
  <h3>🔮 Cuánto sintonizasteis con cada Psíquico</h3>
  <p class="small-note" style="margin-top:-4px">Solo se suma siendo Psíquico, así que no es una clasificación: quien aún no lo ha sido va a cero.</p>
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
