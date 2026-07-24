<script lang="ts">
  // Final: se destapan bandos y roles y se dictamina el ganador (¿acabó el
  // Bombardero junto al Presidente?). Marcador acumulado y revancha.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { MIN_PLAYERS, WIN_LABELS, presidentId, bomberId, roomOf } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { TwoRoomsState } from '../types';
  import RoomsBoard from './RoomsBoard.svelte';

  const { game, my }: { game: TwoRoomsState; my: PlayerDoc } = $props();
  const nm = (pid: string | null) => (pid && game.names[pid]) || '¿?';
  const pres = $derived(presidentId(game));
  const bomb = $derived(bomberId(game));
  const ranked = $derived([...game.playerIds].sort((a, b) => (game.scores[b] || 0) - (game.scores[a] || 0)));
  const canRematch = $derived(game.playerIds.length >= MIN_PLAYERS);
  // El titular cuenta por qué acabó así: si el Presidente abandonó, gana el rojo
  // pero NO hubo ningún «¡BOOM!» (winReason lo dice tal cual).
  const headline = $derived(game.winReason
    || (game.winner ? WIN_LABELS[game.winner] : 'Partida disuelta: quedasteis menos de los necesarios.'));
  // El icono sale del propio titular: así una rendición no se corona con 💥.
  const icon = $derived(headline.match(/^\p{Extended_Pictographic}/u)?.[0]
    || (game.winner === 'red' ? '💥' : game.winner === 'blue' ? '🕊️' : '🚪'));
</script>

<div class="card" style="text-align:center">
  <span class="moon">{icon}</span>
  <h3 style="margin:6px 0">{headline}</h3>
  {#if pres || bomb}
    <p class="small-note">Presidente: <b>{nm(pres)}</b> (Sala {pres && game.room[pres] !== undefined ? roomOf(game, pres) + 1 : '?'}). Bombardero: <b>{nm(bomb)}</b> (Sala {bomb && game.room[bomb] !== undefined ? roomOf(game, bomb) + 1 : '?'}).</p>
  {/if}
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

{#if !canRematch}<p class="small-note" style="text-align:center">Sois menos de {MIN_PLAYERS}: no hay revancha con este grupo.</p>{/if}
<button class="primary block" data-a="tr-again" disabled={!canRematch} onclick={() => guard(A.playAgain)}>🔁 Otra partida</button>
<button class="ghost block" data-a="tr-back-lobby" onclick={() => guard(() => A.endTwoRooms())}>🏁 Terminar y volver al lobby</button>
