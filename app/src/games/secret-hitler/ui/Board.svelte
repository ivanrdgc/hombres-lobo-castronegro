<script lang="ts">
  // Tablero público: los dos marcadores de decretos (con los iconos de poder del
  // tramo fascista), el contador de elección, presidente/canciller y el mazo.
  import { presidentId } from '../engine';
  import { powerFor } from '../roles';
  import type { SHState } from '../types';

  const { game }: { game: SHState } = $props();

  const n = $derived(game.playerIds.length);
  const nm = (pid: string | null) => (pid && game.names[pid]) || '—';
  const POWER_ICON: Record<string, string> = { peek: '🔮', investigate: '🔎', special: '🗳️', execution: '💀' };
  const fascistSlots = $derived([1, 2, 3, 4, 5, 6].map((i) => ({
    i, filled: game.fascistPolicies >= i,
    power: i <= 5 ? powerFor(n, i) : null, win: i === 6,
  })));
  const libSlots = $derived([1, 2, 3, 4, 5].map((i) => ({ i, filled: game.liberalPolicies >= i, win: i === 5 })));
  const lastEl = $derived(game.lastElection);
</script>

<div class="card shboard">
  <div class="track lib">
    <span class="tlabel">🕊️ Liberal</span>
    <div class="slots">{#each libSlots as s (s.i)}<span class="slot {s.filled ? 'on' : ''}">{s.filled ? '🕊️' : s.win ? '🏁' : ''}</span>{/each}</div>
  </div>
  <div class="track fas">
    <span class="tlabel">🐷 Fascista</span>
    <div class="slots">{#each fascistSlots as s (s.i)}<span class="slot {s.filled ? 'on' : ''}" title={s.power ? s.power : ''}>{s.filled ? '🐷' : s.win ? '🏁' : s.power ? POWER_ICON[s.power] : ''}</span>{/each}</div>
  </div>
  <div class="shmeta">
    <span>🪙 Presidente: <b>{nm(presidentId(game))}</b></span>
    <span>🎩 Canciller: <b>{nm(game.nominatedChancellor)}</b></span>
  </div>
  <div class="shmeta">
    <span class="eltrack">🗳️ Caos: {#each [0, 1, 2] as i (i)}<span class="dot {i < game.electionTracker ? 'on' : ''}"></span>{/each} {game.electionTracker}/3</span>
    <span class="small-note">🃏 mazo {game.draw.length}{game.vetoUnlocked ? ' · ✋ veto' : ''}</span>
  </div>
  {#if lastEl}
    <p class="small-note" style="margin:4px 0 0">Última votación ({nm(lastEl.president)}/{nm(lastEl.chancellor)}): {lastEl.passed ? '✅ aprobada' : '❌ rechazada'} · Ja {lastEl.ja.length}, Nein {lastEl.nein.length}</p>
  {/if}
</div>

<style>
  .shboard { padding: 12px 14px; }
  .track { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
  .tlabel { min-width: 92px; font-weight: 700; font-size: 0.9rem; }
  .track.lib .tlabel { color: #7fd0ff; }
  .track.fas .tlabel { color: #f3a88a; }
  .slots { display: flex; gap: 5px; flex: 1; }
  .slot {
    flex: 1; aspect-ratio: 1; max-width: 40px; display: flex; align-items: center; justify-content: center;
    border-radius: 8px; background: var(--surface, #1a1c28); border: 1px solid var(--border, #333);
    font-size: 0.95rem; opacity: 0.55;
  }
  .track.lib .slot.on { background: #163247; border-color: #3a86b0; opacity: 1; }
  .track.fas .slot.on { background: #3a1f16; border-color: #b0603a; opacity: 1; }
  .shmeta { display: flex; justify-content: space-between; gap: 8px; font-size: 0.9rem; margin-top: 8px; flex-wrap: wrap; }
  .eltrack { display: inline-flex; align-items: center; gap: 4px; }
  .eltrack .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--border, #444); display: inline-block; }
  .eltrack .dot.on { background: #f3a0a0; }
</style>
