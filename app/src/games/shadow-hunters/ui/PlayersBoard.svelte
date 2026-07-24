<script lang="ts">
  // Tablero público: cada jugador con su vida ❤️, si sigue en pie y su
  // personaje (solo si está revelado o muerto; el tuyo siempre para ti).
  import { CHARS, FACTION_LABEL } from '../chars';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ShadowHState } from '../types';

  const { game, my }: { game: ShadowHState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const charFor = (pid: string) => CHARS[game.chars[pid]];
</script>

<div class="shboard">
  {#each game.playerIds as pid (pid)}
    {@const mine = pid === my.id}
    {@const c = charFor(pid)}
    {@const seen = game.revealed[pid] || mine}
    <div class="shrow {game.turn === pid && game.phase === 'turn' ? 'active' : ''} {game.alive[pid] ? '' : 'out'}">
      <div class="shname">{game.alive[pid] ? '' : '☠️ '}{nm(pid)}{mine ? ' (tú)' : ''}</div>
      <div class="shchar">
        {#if seen && c}
          <span class="shid {game.revealed[pid] ? 'pub' : 'priv'}">{c.emoji} {c.name}{game.revealed[pid] ? '' : ' 🤫'}</span>
        {:else}
          <span class="shid back">❓ oculto</span>
        {/if}
      </div>
      <div class="shhp" title="puntos de vida">
        {#if game.alive[pid]}❤️ {game.hp[pid]}{:else}—{/if}
      </div>
    </div>
  {/each}
</div>
<p class="small-note" style="margin:4px 0 0">🏹 Cazadores · 🌑 Sombras · 🧭 neutrales — {FACTION_LABEL.hunter.replace('🏹 ', '')} ganan sin Sombras vivas; al revés para las Sombras.</p>

<style>
  .shboard { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; }
  .shrow { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 10px; border: 1px solid var(--border, #333); background: var(--surface, #1c1e28); flex-wrap: wrap; }
  .shrow.active { border-color: #c8a24a; box-shadow: 0 0 0 1px #c8a24a inset; }
  .shrow.out { opacity: 0.55; }
  .shname { font-size: 0.84rem; font-weight: 700; min-width: 96px; }
  .shchar { flex: 1; display: flex; justify-content: flex-end; }
  .shid { font-size: 0.74rem; padding: 3px 7px; border-radius: 7px; border: 1px solid var(--border, #444); }
  .shid.back { opacity: 0.6; }
  .shid.priv { background: #1d3a4a; border-color: #3a7ca0; }
  .shid.pub { background: #3a2d1d; border-color: #a0763a; }
  .shhp { font-size: 0.82rem; font-weight: 700; min-width: 48px; text-align: right; }
</style>
