<script lang="ts">
  // Mapa 8×8 del submarino PROPIO: islas, estela y posición. En modo «target»
  // sirve para elegir la casilla del torpedo (solo casillas a tiro).
  import { W, H, COLS, isIsland, sameCell, type Cell } from '../map';
  import type { Sub } from '../types';

  const {
    sub, team, targets = [], onPick = null,
  }: {
    sub: Sub; team: 'red' | 'blue'; targets?: Cell[]; onPick?: ((c: Cell) => void) | null;
  } = $props();
  const cells: Cell[] = Array.from({ length: W * H }, (_, i) => ({ x: i % W, y: Math.floor(i / W) }));
  const inTrail = (c: Cell) => sub.trail.some((t) => sameCell(t, c));
  const canPick = (c: Cell) => !!onPick && targets.some((t) => sameCell(t, c));
</script>

<div class="snmap" data-team={team}>
  <div class="sncorner"></div>
  {#each COLS.slice(0, W) as l (l)}<div class="snlabel">{l}</div>{/each}
  {#each Array.from({ length: H }, (_, y) => y) as y (y)}
    <div class="snlabel">{y + 1}</div>
    {#each cells.slice(y * W, y * W + W) as c (c.x)}
      {#if canPick(c)}
        <button class="sncell pick" data-a="sn-cell" data-p="{c.x},{c.y}" aria-label="Casilla {COLS[c.x]}{c.y + 1}" onclick={() => onPick!(c)}>🎯</button>
      {:else}
        <div class="sncell {isIsland(c) ? 'island' : ''} {inTrail(c) ? 'trail' : ''} {sameCell(sub.pos, c) ? 'sub' : ''}">
          {#if isIsland(c)}⛰️{:else if sameCell(sub.pos, c)}{team === 'red' ? '🔴' : '🔵'}{:else if inTrail(c)}·{/if}
        </div>
      {/if}
    {/each}
  {/each}
</div>

<style>
  .snmap { display: grid; grid-template-columns: 18px repeat(8, 1fr); gap: 2px; margin: 8px 0; max-width: 340px; }
  .snlabel { font-size: 0.62rem; opacity: 0.6; display: flex; align-items: center; justify-content: center; }
  .sncell { aspect-ratio: 1; border-radius: 5px; border: 1px solid var(--border, #333); background: #14202e; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; padding: 0; min-height: 24px; }
  .sncell.island { background: #23301f; }
  .sncell.trail { color: #7fd0ff; font-size: 1rem; background: #182c40; }
  .sncell.sub { background: #1d3a4a; border-color: #3a7ca0; font-size: 0.85rem; }
  .sncell.pick { background: #40232a; border-color: #a03a5a; cursor: pointer; font-size: 0.7rem; opacity: 0.85; }
  .sncell.pick:active { transform: scale(0.92); }
</style>
