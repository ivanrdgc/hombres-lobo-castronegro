<script lang="ts">
  // Final: se destapan todas las lealtades, el bando ganador y el porqué.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ROLES, isEvil } from '../roles';
  import { WIN_LABELS } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { AvalonState } from '../types';

  const { game, my }: { game: AvalonState; my: PlayerDoc } = $props();

  const players = $derived(game.playerIds);
  const meId = my.id;
  const nm = (pid: string) => game.names[pid] || '¿?';
  const rn = (pid: string) => `${ROLES[game.roles[pid]].emoji} ${ROLES[game.roles[pid]].name}`;
  const merlin = $derived(players.find((pid) => game.roles[pid] === 'merlin'));
</script>

<div class="narration">🌅 Cae el telón sobre Ávalon: se destapan todas las lealtades.</div>

<div class="card" style="text-align:center">
  <h3 style="margin:6px 0">{game.winner ? WIN_LABELS[game.winner] : ''}</h3>
  {#if game.winReason}<p class="small-note">{game.winReason}</p>{/if}
</div>

<div class="card">
  <h3>🎭 Las lealtades</h3>
  {#each players as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo">
        <div class="sname">{nm(pid)}{pid === meId ? ' (tú)' : ''} {pid === merlin ? '🧙' : ''} {game.assassinTarget === pid ? '🗡️' : ''}</div>
        <div class="sdesc">{isEvil(game.roles[pid]) ? '🗡️' : '🏰'} {rn(pid)}</div>
      </div>
    </div>
  {/each}
  {#if game.assassinTarget}<p class="small-note" style="margin-top:8px">🗡️ El Asesino señaló a <b>{nm(game.assassinTarget)}</b>{game.roles[game.assassinTarget] === 'merlin' ? ' — ¡y era Merlín!' : ' — que no era Merlín.'}</p>{/if}
</div>

<button class="primary block" data-a="av-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida (mismos jugadores)</button>
<button class="ghost block" data-a="av-back-lobby" onclick={() => guard(() => A.endAvalon())}>🏁 Terminar y volver al lobby</button>
