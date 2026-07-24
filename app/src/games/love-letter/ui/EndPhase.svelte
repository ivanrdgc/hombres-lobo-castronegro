<script lang="ts">
  // Final: ganador de la partida y marcador de favores. Otra partida reinicia.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { LoveLetterState } from '../types';

  const { game, my }: { game: LoveLetterState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.tokens[b] || 0) - (game.tokens[a] || 0)));
  void my;
</script>

<div class="card" style="text-align:center">
  <span class="moon">👑</span>
  <h3 style="margin:6px 0">¡{nm(game.winner || '')} gana la partida!</h3>
  <p class="small-note">Ha reunido {game.need} favores.</p>
</div>

<div class="card">
  <h3>🏆 Favores</h3>
  {#each ranked as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{nm(pid)}{game.winner === pid ? ' 👑' : ''}</div></div>
      <b>{'💌'.repeat(game.tokens[pid] || 0) || '0'}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="ll-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida</button>
<button class="ghost block" data-a="ll-back-lobby" onclick={() => guard(() => A.endLoveLetter())}>🏁 Terminar y volver al lobby</button>
