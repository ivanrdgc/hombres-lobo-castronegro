<script lang="ts">
  // Final: ganador y marcador. Otra partida recoge todo y reparte de nuevo.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { invCount } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SkullState } from '../types';

  const { game, my }: { game: SkullState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.marks[b] || 0) - (game.marks[a] || 0)));
  void my;
</script>

<div class="card" style="text-align:center">
  <span class="moon">👑</span>
  <h3 style="margin:6px 0">¡{nm(game.winner || '')} gana la partida!</h3>
  <p class="small-note">Dos retos ganados (o el último en pie).</p>
</div>

<div class="card">
  <h3>🏆 Marcador</h3>
  {#each ranked as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{nm(pid)}{game.winner === pid ? ' 👑' : ''}{!game.alive[pid] ? ' ☠️' : ''}</div>
        <div class="sdesc">{'⭐'.repeat(game.marks[pid] || 0) || 'sin retos'} · 💠×{invCount(game, pid)}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="sk-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida</button>
<button class="ghost block" data-a="sk-back-lobby" onclick={() => guard(() => A.endSkull())}>🏁 Terminar y volver al lobby</button>
