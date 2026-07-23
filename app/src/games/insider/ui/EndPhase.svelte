<script lang="ts">
  // Final de ronda: se destapa el Insider y la palabra, con el marcador
  // acumulado. Otra ronda rota el Maestro y cambia la palabra.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { WIN_LABELS } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { InsiderState } from '../types';

  const { game, my }: { game: InsiderState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0)));
  void my;
</script>

<div class="narration">🌟 Fin de la ronda.</div>

<div class="card" style="text-align:center">
  <h3 style="margin:6px 0">{game.outcome ? WIN_LABELS[game.outcome] : ''}</h3>
  <p class="small-note">El Insider era <b>{nm(game.insiderId)}</b>. La palabra secreta: <b>«{game.word}»</b>.{game.accusedId ? ` La mesa señaló a ${nm(game.accusedId)}.` : ''}</p>
</div>

<div class="card">
  <h3>🏆 Marcador</h3>
  {#each ranked as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{nm(pid)}{pid === game.masterId ? ' 🎓' : ''}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="ins-again" onclick={() => guard(A.nextRound)}>🔁 Otra ronda (rota el Maestro)</button>
<button class="ghost block" data-a="ins-back-lobby" onclick={() => guard(() => A.endInsider())}>🏁 Terminar y volver al lobby</button>
