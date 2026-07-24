<script lang="ts">
  // Final: quién ha ganado y por qué, el mapa entero destapado y el marcador
  // acumulado. Resultado y marcador van juntos —son la misma idea— y el mapa
  // aparte, porque es lo que la mesa se queda mirando y comentando.
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
  {#if game.winReason}<p class="small-note" style="margin-top:0">{game.winReason}</p>{/if}
  <div style="margin-top:12px">
    <div class="exp" style="text-align:left">🏆 Marcador</div>
    {#each ranked as pid (pid)}
      <div class="settingrow" style="align-items:center">
        <div class="sinfo"><div class="sname">{game.teams[pid] === 'red' ? '🔴' : '🔵'} {nm(pid)}{game.spymaster[game.teams[pid]] === pid ? ' 🕵️ Jefe' : ''}{game.winner === game.teams[pid] ? ' ✅' : ''}</div></div>
        <b>{game.scores[pid] || 0}</b>
      </div>
    {/each}
  </div>
  <p class="small-note">Cada victoria suma un punto y el marcador se acumula mientras la mesa siga jugando.</p>
</div>

<div class="card"><h3>🗺️ El mapa, ya sin secretos</h3>
  <Board {game} {my} />
  <p class="small-note" style="margin-top:0">Las casillas de borde discontinuo son las que nadie llegó a tocar.</p></div>

<button class="primary block" data-a="cn-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida (equipos, jefes y mapa nuevos)</button>
<button class="ghost block" data-a="cn-back-lobby" onclick={() => guard(() => A.endCodenames())}>🏁 Terminar y volver al lobby</button>
