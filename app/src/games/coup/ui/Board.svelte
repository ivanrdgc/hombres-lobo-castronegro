<script lang="ts">
  // Tablero público de Coup, legible de un vistazo: cada jugador con sus
  // monedas (y si le llegan para asesinar o para el golpe), sus influencias
  // (dorso = oculta; personaje = descubierta para siempre) y su papel en la
  // jugada en curso: quién la declara, quién es la víctima y quién falta por
  // reaccionar. No revela NADA oculto: solo lo que ya es público en la mesa.
  import { charLabel, ACTIONS } from '../chars';
  import { influenceCount, pendingReactors, COUP_LIMIT } from '../engine';
  import type { CoupState } from '../types';

  const { game, meId }: { game: CoupState; meId: string } = $props();
  const turnPid = $derived(game.playerIds[game.turnIdx]);
  // Al terminar se destapa TODO: sin esto la mesa nunca sabía quién faroleaba.
  const showAll = $derived(game.phase === 'end');
  const p = $derived(game.pending);
  const waiting = $derived(game.phase === 'end' ? [] : pendingReactors(game));
  const deckLeft = $derived((game.deck || []).length);

  // Etiqueta del bolsillo: lo que ese montón de monedas le permite (público).
  function purse(n: number): string {
    if (n >= COUP_LIMIT) return 'obligado al 💥 golpe';
    if (n >= ACTIONS.golpe.cost) return 'puede dar 💥 golpe';
    if (n >= ACTIONS.asesinar.cost) return 'puede 🗡️ asesinar';
    return '';
  }
</script>

<div class="board">
  {#each game.playerIds as pid (pid)}
    {@const alive = influenceCount(game, pid) > 0}
    {@const isTurn = pid === turnPid && game.phase !== 'end' && game.phase !== 'reveal'}
    {@const coins = game.coins[pid] || 0}
    <div class="seat {alive ? '' : 'out'} {isTurn ? 'turn' : ''}" data-a="coup-seat" data-p={pid}>
      <div class="seathead">
        <span class="nm">{isTurn ? '▶ ' : ''}{game.names[pid] || pid}{pid === meId ? ' (tú)' : ''}</span>
        <span class="coins">🪙 {coins}{alive && purse(coins) ? ` · ${purse(coins)}` : ''}</span>
      </div>
      <div class="cards">
        {#if alive && p && p.actor === pid && game.phase !== 'turn'}
          <span class="tag act">{ACTIONS[p.type].emoji} declara {ACTIONS[p.type].name}</span>
        {/if}
        {#if alive && p && p.target === pid && game.phase !== 'turn'}<span class="tag tgt">🎯 víctima</span>{/if}
        {#if alive && game.block?.by === pid}<span class="tag act">🛡️ bloquea</span>{/if}
        {#if waiting.includes(pid)}<span class="tag wait">⏳ falta</span>{/if}
        {#each game.hands[pid] as card, i (i)}
          {#if card.lost}
            <span class="inf lost">{charLabel(card.char)}</span>
          {:else if showAll}
            <span class="inf shown" title="influencia que conservaba">{charLabel(card.char)}</span>
          {:else}
            <span class="inf back">🂠</span>
          {/if}
        {/each}
        {#if !alive}<span class="deadtag">💀 eliminado</span>{/if}
      </div>
    </div>
  {/each}
</div>
{#if game.phase !== 'end'}
  <p class="boardnote">🂠 dorso = influencia oculta · carta con nombre = descubierta, fuera de juego · quedan {deckLeft} cartas en la corte</p>
{/if}

<style>
  .board { display: flex; flex-direction: column; gap: 6px; margin: 4px 0 4px; }
  .seat {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--r-2);
    background: var(--card);
  }
  .seat.turn { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
  .seat.out { opacity: 0.5; }
  .seathead { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .nm { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .coins { font-variant-numeric: tabular-nums; font-size: 0.82rem; color: var(--muted); }
  .cards { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  .inf { font-size: 0.82rem; padding: 2px 7px; border-radius: var(--r-full); }
  .inf.back { background: var(--card2); color: #cdd; letter-spacing: 0.1em; }
  .inf.lost { background: #3a2130; color: #f0b8c8; text-decoration: line-through; opacity: 0.85; }
  .inf.shown { background: #23324a; color: #cfe3ff; }
  .tag { font-size: 0.75rem; padding: 2px 7px; border-radius: var(--r-full); border: 1px solid var(--border); color: var(--muted); white-space: nowrap; }
  .tag.act { border-color: var(--accent2); color: #cfc3f7; }
  .tag.tgt { border-color: var(--danger); color: #f3b8c4; }
  .tag.wait { border-color: var(--accent); color: var(--moon); }
  .deadtag { font-size: 0.72rem; color: var(--muted); font-style: italic; }
  .boardnote { font-size: 0.74rem; color: var(--muted); margin: 0 0 10px; }
</style>
