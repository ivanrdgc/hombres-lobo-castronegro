<script lang="ts">
  // Final: se destapan bandos y roles y se dictamina el ganador (¿acabó el
  // Bombardero junto al Presidente?). Marcador acumulado y revancha.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { WIN_LABELS, presidentId, bomberId, roomOf } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { TwoRoomsState } from '../types';
  import RoomsBoard from './RoomsBoard.svelte';

  const { game, my }: { game: TwoRoomsState; my: PlayerDoc } = $props();
  const nm = (pid: string | null) => (pid && game.names[pid]) || '¿?';
  const pres = $derived(presidentId(game));
  const bomb = $derived(bomberId(game));
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0)));
</script>

<div class="card" style="text-align:center">
  <span class="moon">{game.winner === 'red' ? '💥' : '🕊️'}</span>
  <h3 style="margin:6px 0">{game.winner ? WIN_LABELS[game.winner] : ''}</h3>
  <p class="small-note">Presidente: <b>{nm(pres)}</b> (Sala {pres ? roomOf(game, pres) + 1 : '?'}). Bombardero: <b>{nm(bomb)}</b> (Sala {bomb ? roomOf(game, bomb) + 1 : '?'}).</p>
</div>

<div class="card"><h3>🚪 Cómo quedaron las salas</h3>
  <RoomsBoard {game} meId={my.id} reveal={true} /></div>

<div class="card">
  <h3>🏆 Marcador</h3>
  {#each ranked as pid (pid)}
    <div class="settingrow" style="align-items:center">
      <div class="sinfo"><div class="sname">{game.teams[pid] === 'blue' ? '🔵' : '🔴'} {nm(pid)}{game.winner === game.teams[pid] ? ' ✅' : ''}</div></div>
      <b>{game.scores[pid] || 0}</b>
    </div>
  {/each}
</div>

<button class="primary block" data-a="tr-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida</button>
<button class="ghost block" data-a="tr-back-lobby" onclick={() => guard(() => A.endTwoRooms())}>🏁 Terminar y volver al lobby</button>
