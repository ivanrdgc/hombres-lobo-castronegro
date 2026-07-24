<script lang="ts">
  // Final: quién gana y cómo quedó la mesa, en una sola tarjeta.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { invCount } from '../engine';
  import type { SkullState } from '../types';

  // `my` llega desde la pantalla de partida, pero el final es igual para todos.
  const { game }: { game: SkullState } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.marks[b] || 0) - (game.marks[a] || 0)));
</script>

<div class="card">
  <div style="text-align:center">
    <span class="moon">👑</span>
    <h3 style="margin:6px 0 2px">¡{nm(game.winner || '')} gana la partida!</h3>
    <p class="small-note" style="margin:0">Dos retos ganados… o el último con discos en pie.</p>
  </div>

  <h3 style="margin:14px 0 2px">🏆 Marcador</h3>
  <p class="small-note" style="margin:0 0 6px">⭐ retos de esta partida · 💠 discos que le quedaban · a la derecha, partidas ganadas en esta mesa.</p>
  {#each ranked as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{nm(pid)}{game.winner === pid ? ' 👑' : ''}{!game.alive[pid] ? ' ☠️' : ''}</div>
        <div class="sdesc">{'⭐'.repeat(game.marks[pid] || 0) || 'sin retos'} · 💠×{invCount(game, pid)}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="sk-again" onclick={() => guard(A.playAgain)}>🔁 Jugar otra partida</button>
<button class="ghost block" data-a="sk-back-lobby" onclick={() => guard(() => A.endSkull())}>🏁 Terminar y volver al lobby</button>
