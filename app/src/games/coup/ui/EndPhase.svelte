<script lang="ts">
  // Fin de la partida: gana el último con influencia. Marcador acumulado y
  // revancha (rebaraja) o volver al lobby.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { winnerName } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CoupState } from '../types';

  const { game, my }: { game: CoupState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0)));
  void my;
</script>

<div class="card" style="text-align:center">
  <span class="moon">👑</span>
  <h3 style="margin:6px 0">¡Gana {winnerName(game)}!</h3>
  <p class="small-note">Último en pie en la corte de Castronegro.</p>
</div>

<div class="card">
  <h3>🏆 Marcador</h3>
  {#each ranked as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{nm(pid)}{pid === game.winner ? ' 👑' : ''}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="coup-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida</button>
<button class="ghost block" data-a="coup-back-lobby" onclick={() => guard(() => A.endCoup())}>🏁 Terminar y volver al lobby</button>
