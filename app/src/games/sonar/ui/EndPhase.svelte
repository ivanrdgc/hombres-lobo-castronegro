<script lang="ts">
  // Final: submarino ganador, posiciones reveladas (ambos mapas) y marcador.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { teamOf, TEAM_LABEL } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SonarState } from '../types';
  import MapGrid from './MapGrid.svelte';

  const { game }: { game: SonarState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0)));
</script>

<div class="card" style="text-align:center">
  <span class="moon">{game.winner === 'red' ? '🔴' : '🔵'}</span>
  <h3 style="margin:6px 0">¡Gana {game.winner ? TEAM_LABEL[game.winner] : ''}!</h3>
  {#if game.winReason}<p class="small-note">{game.winReason}</p>{/if}
</div>

<div class="card"><h3>🗺️ Posiciones finales</h3>
  <div style="display:flex;gap:10px;flex-wrap:wrap">
    <div><p class="small-note" style="margin:0">🔴 Rojo</p><MapGrid sub={game.subs.red} team="red" /></div>
    <div><p class="small-note" style="margin:0">🔵 Azul</p><MapGrid sub={game.subs.blue} team="blue" /></div>
  </div>
</div>

<div class="card">
  <h3>🏆 Marcador</h3>
  {#each ranked as pid (pid)}
    {@const t = teamOf(game, pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{t === 'red' ? '🔴' : '🔵'} {nm(pid)}{game.winner && t === game.winner ? ' ✅' : ''}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="sn-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida</button>
<button class="ghost block" data-a="sn-back-lobby" onclick={() => guard(() => A.endSonar())}>🏁 Terminar y volver al lobby</button>
