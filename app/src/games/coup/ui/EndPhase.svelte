<script lang="ts">
  // Fin de la partida: gana el último con influencia. Marcador acumulado y
  // revancha (rebaraja) o volver al lobby.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { winnerName } from '../engine';
  import type { CoupState } from '../types';

  const { game }: { game: CoupState } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0)));
</script>

<!-- Un solo bloque para el resultado (ganador + marcador): son la misma idea. -->
<div class="card">
  <span class="moon">👑</span>
  <h3 style="margin:6px 0;text-align:center">¡Gana {winnerName(game)}!</h3>
  <p class="small-note" style="text-align:center;margin-top:0">Último en pie. Arriba se destapan TODAS las manos: ahí se ve quién faroleaba.</p>
  <h3 style="margin:16px 0 2px">🏆 Marcador</h3>
  {#each ranked as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{nm(pid)}{pid === game.winner ? ' 👑' : ''}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<!-- La partida YA ha terminado: aquí no se «termina» nada (eso es el 🏳️ del menú
     a media partida), solo se vuelve al lobby. Un verbo por cosa (B29·4). -->
<button class="primary block" data-a="coup-again" onclick={() => guard(A.playAgain)}>🔁 Repartir otra partida</button>
<button class="ghost block" data-a="coup-back-lobby" onclick={() => guard(() => A.endCoup())}>🏁 Volver al lobby de Coup</button>
