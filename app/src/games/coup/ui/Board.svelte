<script lang="ts">
  // Tablero público de Coup: cada jugador con sus monedas, sus influencias
  // (ocultas = dorso; perdidas = personaje descubierto) y de quién es el turno.
  // No revela NADA oculto: solo lo que ya es público.
  import { charLabel } from '../chars';
  import { influenceCount } from '../engine';
  import type { CoupState } from '../types';

  const { game, meId }: { game: CoupState; meId: string } = $props();
  const turnPid = $derived(game.playerIds[game.turnIdx]);
</script>

<div class="board">
  {#each game.playerIds as pid (pid)}
    {@const alive = influenceCount(game, pid) > 0}
    {@const isTurn = pid === turnPid && game.phase !== 'end' && game.phase !== 'reveal'}
    <div class="seat {alive ? '' : 'out'} {isTurn ? 'turn' : ''}" data-a="coup-seat" data-p={pid}>
      <div class="seathead">
        <span class="nm">{isTurn ? '▶ ' : ''}{game.names[pid] || pid}{pid === meId ? ' (tú)' : ''}</span>
        <span class="coins" title="monedas">🪙 {game.coins[pid] || 0}</span>
      </div>
      <div class="cards">
        {#each game.hands[pid] as card, i (i)}
          {#if card.lost}
            <span class="inf lost">{charLabel(card.char)}</span>
          {:else}
            <span class="inf back">🂠</span>
          {/if}
        {/each}
        {#if !alive}<span class="deadtag">eliminado</span>{/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .board { display: flex; flex-direction: column; gap: 6px; margin: 4px 0 10px; }
  .seat {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 8px 12px; border: 1px solid var(--line, #2a2f45); border-radius: 12px;
    background: var(--card, #171a2b);
  }
  .seat.turn { border-color: var(--accent, #d8a24a); box-shadow: 0 0 0 1px var(--accent, #d8a24a) inset; }
  .seat.out { opacity: 0.5; }
  .seathead { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .nm { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .coins { font-variant-numeric: tabular-nums; font-size: 0.9rem; color: var(--muted, #97a); }
  .cards { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  .inf { font-size: 0.82rem; padding: 2px 7px; border-radius: 999px; }
  .inf.back { background: #2a2f45; color: #cdd; letter-spacing: 0.1em; }
  .inf.lost { background: #3a2130; color: #f0b8c8; text-decoration: line-through; opacity: 0.85; }
  .deadtag { font-size: 0.72rem; color: var(--muted, #97a); font-style: italic; }
</style>
