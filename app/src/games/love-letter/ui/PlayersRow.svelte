<script lang="ts">
  // Estado público de cada jugador: favores, si está fuera o protegido, y su
  // última carta descartada. Las manos son secretas (no se muestran aquí).
  import { CARD_INFO } from '../cards';
  import type { LoveLetterState } from '../types';

  const { game }: { game: LoveLetterState } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const lastDiscard = (pid: string) => {
    const d = game.discards[pid] || []; return d.length ? d[d.length - 1] : null;
  };
</script>

<div class="llrow">
  {#each game.playerIds as pid (pid)}
    {@const d = lastDiscard(pid)}
    <div class="llp {game.turn === pid && game.phase === 'turn' ? 'active' : ''} {game.alive[pid] ? '' : 'out'}">
      <div class="lln">{game.alive[pid] ? '' : '❌ '}{game.protected[pid] ? '🛡️ ' : ''}{nm(pid)}</div>
      <div class="llt">{'💌'.repeat(game.tokens[pid] || 0) || '·'}</div>
      <div class="lld">{d ? `${CARD_INFO[d].emoji} ${CARD_INFO[d].name}` : '—'}</div>
    </div>
  {/each}
</div>

<style>
  .llrow { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .llp { flex: 1 1 90px; min-width: 90px; padding: 6px 8px; border-radius: 10px; border: 1px solid var(--border, #333); background: var(--surface, #1c1e28); }
  .llp.active { border-color: #c86ab0; box-shadow: 0 0 0 1px #c86ab0 inset; }
  .llp.out { opacity: 0.45; }
  .lln { font-size: 0.82rem; font-weight: 700; }
  .llt { font-size: 0.8rem; }
  .lld { font-size: 0.72rem; color: var(--muted, #9aa); margin-top: 2px; }
</style>
