<script lang="ts">
  // Final: se destapa el mapa entero, el ganador y el marcador. Otra partida
  // re-reparte equipos, tablero y mapa.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { WIN_LABELS } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CodenamesState } from '../types';
  import Board from './Board.svelte';

  const { game, my }: { game: CodenamesState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0)));
</script>

<div class="card" style="text-align:center">
  <span class="moon">{game.winner === 'red' ? '🔴' : '🔵'}</span>
  <h3 style="margin:6px 0">{game.winner ? WIN_LABELS(game.winner) : ''}</h3>
  {#if game.winReason}<p class="small-note">{game.winReason}</p>{/if}
</div>

<div class="card"><h3>🗺️ El mapa completo</h3>
  <Board {game} {my} /></div>

<div class="card">
  <h3>🏆 Marcador</h3>
  {#each ranked as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{game.teams[pid] === 'red' ? '🔴' : '🔵'} {nm(pid)}{game.spymaster[game.teams[pid]] === pid ? ' 🕵️' : ''}{game.winner === game.teams[pid] ? ' ✅' : ''}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="cn-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida</button>
<button class="ghost block" data-a="cn-back-lobby" onclick={() => guard(() => A.endCodenames())}>🏁 Terminar y volver al lobby</button>
