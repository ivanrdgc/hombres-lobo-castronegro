<script lang="ts">
  // Fin de la ronda: desenlace, puntos, marcador acumulado e historial.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { locationById } from '../locations';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';
  import LugaresGrid from './LugaresGrid.svelte';

  const { game }: { game: EspiaState; my: PlayerDoc } = $props();

  const o = $derived(game.outcome);
  const loc = $derived(locationById(game.locationId));
  const spyWon = $derived(!!o && ['wrong_accusation', 'spy_guessed', 'spy_survived'].includes(o.type));
  const board = $derived(game.playerIds
    .map((pid) => ({ pid, name: game.names[pid] || pid, pts: game.scores[pid] || 0, delta: o?.delta[pid] || 0 }))
    .sort((a, b) => b.pts - a.pts));
</script>

{#if o}
  <div class="card" style="text-align:center;border-color:var(--accent)">
    <span class="moon">{spyWon ? '🕵️' : '🎉'}</span>
    <h3>{spyWon ? 'El espía gana la ronda' : 'Los agentes ganan la ronda'}</h3>
    <p style="margin:10px 0">{o.txt}</p>
    <p class="small-note">El espía era <b>{game.names[game.spyId] || '¿?'}</b> · el lugar, <b>{loc ? `${loc.emoji} ${loc.name}` : game.locationId}</b>.</p>
  </div>
{/if}

<div class="card">
  <h3>🏆 Marcador</h3>
  <div class="players">
    {#each board as row, i (row.pid)}
      <div class="player">
        <span class="pname">{i === 0 && row.pts > 0 ? '🥇 ' : ''}{row.name}{row.pid === game.spyId ? ' 🕵️' : ''}</span>
        <span class="badge">{row.pts} pt{row.pts === 1 ? '' : 's'}{row.delta ? ` (+${row.delta})` : ''}</span>
      </div>
    {/each}
  </div>
  {#if game.history.length > 1}
    <p class="small-note" style="margin-top:10px"><b>Rondas anteriores:</b></p>
    {#each game.history.slice(0, -1).reverse() as h (h.round)}
      <p class="small-note">R{h.round}: {h.txt}</p>
    {/each}
  {/if}
</div>

<div class="card">
  <h3>📍 El lugar era…</h3>
  <LugaresGrid reveal={game.locationId} />
</div>

<div class="card">
  <button class="primary block" data-a="espia-next-round" onclick={() => guard(A.nextRound)}>▶️ Otra ronda (reparte {game.names[game.playerIds[(game.round) % game.playerIds.length]] || '¿?'})</button>
  <button class="ghost block" data-a="espia-end-game" onclick={() => guard(A.endEspia)}>🏁 Terminar el juego</button>
</div>
