<script lang="ts">
  // Final: ganador de la partida y marcador de favores. Otra partida reinicia.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { LoveLetterState } from '../types';

  const { game, my }: { game: LoveLetterState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.tokens[b] || 0) - (game.tokens[a] || 0)));
</script>

<div class="card" style="text-align:center">
  <span class="moon">👑</span>
  <h3 style="margin:6px 0">¡{nm(game.winner || '')} gana la partida!</h3>
  <p class="small-note">Ha reunido los {game.need} favores en {game.round} {game.round === 1 ? 'ronda' : 'rondas'}.</p>
</div>

<div class="card">
  <h3>🏆 Favores</h3>
  {#each ranked as pid, i (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{i + 1}. {nm(pid)}{pid === my.id ? ' (tú)' : ''}{game.winner === pid ? ' 👑' : ''}</div></div>
      <b>💌 {game.tokens[pid] || 0}<span style="opacity:.6;font-weight:400">/{game.need}</span></b>
    </div>
  {/each}
</div>

<!-- Los dos caminos dicen lo que hacen: el marcador se pierde en los dos casos,
     así que el de terminar pasa por su confirmación (B26·1 y B26·3). -->
<button class="primary block" data-a="ll-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida con los mismos (favores a 0)</button>
<button class="ghost block" data-a="ll-back-lobby" onclick={() => (app.ui.modal = { type: 'll-end' })}>🏁 Cerrar la partida y volver al lobby</button>
