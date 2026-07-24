<script lang="ts">
  // Tablero público: cada jugador con sus 3 cartas (dorsos 🂠 o destapadas al
  // caer), si va armado 🔫 y a quién apunta 🎯. Solo TUS cartas se ven de cara.
  import { cardLabel } from '../cards';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GoodCopState } from '../types';

  const { game, my }: { game: GoodCopState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
</script>

<div class="gcboard">
  {#each game.playerIds as pid (pid)}
    {@const mine = pid === my.id}
    <div class="gcrow {game.turn === pid && game.phase === 'turn' ? 'active' : ''} {game.alive[pid] ? '' : 'out'}">
      <div class="gcname">{game.alive[pid] ? '' : '❌ '}{nm(pid)}{mine ? ' (tú)' : ''}
        {#if game.armed[pid]}<span title="armado"> 🔫</span>{/if}
        {#if game.aimAt[pid]}<span class="gcaim"> 🎯 {nm(game.aimAt[pid]!)}</span>{/if}
      </div>
      <div class="gccards">
        {#each game.cards[pid] as c, i (i)}
          <span class="gccard {c.up || mine ? (c.kind === 'crook' ? 'crook' : 'honest') : 'back'}">
            {c.up || mine ? cardLabel(c) : '🂠'}
          </span>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .gcboard { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; }
  .gcrow { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 10px; border: 1px solid var(--border, #333); background: var(--surface, #1c1e28); flex-wrap: wrap; }
  .gcrow.active { border-color: #c8a24a; box-shadow: 0 0 0 1px #c8a24a inset; }
  .gcrow.out { opacity: 0.5; }
  .gcname { font-size: 0.84rem; font-weight: 700; min-width: 110px; }
  .gcaim { opacity: 0.85; font-weight: 400; font-size: 0.78rem; }
  .gccards { display: flex; gap: 4px; flex: 1; flex-wrap: wrap; justify-content: flex-end; }
  .gccard { font-size: 0.72rem; padding: 3px 6px; border-radius: 7px; border: 1px solid var(--border, #444); }
  .gccard.back { font-size: 1rem; padding: 0 4px; border: none; filter: grayscale(0.4) brightness(0.85); }
  .gccard.honest { background: #1d3a4a; border-color: #3a7ca0; }
  .gccard.crook { background: #4a1d2a; border-color: #a03a5a; }
</style>
