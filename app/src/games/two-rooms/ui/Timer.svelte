<script lang="ts">
  // Cuenta atrás de la ronda (deadline). En pausa se congela; el tiempo se
  // devuelve al reanudar.
  import type { TwoRoomsState } from '../types';

  const { game }: { game: TwoRoomsState } = $props();
  let now = $state(Date.now());
  $effect(() => { const t = setInterval(() => (now = Date.now()), 250); return () => clearInterval(t); });

  const remaining = $derived.by(() => {
    if (game.deadline === null) return null;
    if (game.paused) return Math.max(0, game.deadline - game.paused.at);
    return Math.max(0, game.deadline - now);
  });
  const mmss = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
</script>

{#if remaining !== null}
  <div class="trtimer {remaining <= 30000 ? 'low' : ''} {game.paused ? 'frozen' : ''}" data-a="tr-timer">
    {game.paused ? '⏸' : '⏱'} {mmss(remaining)}{#if game.paused}<span class="tnote">en pausa</span>{/if}
  </div>
{/if}

<style>
  .trtimer { text-align: center; font-variant-numeric: tabular-nums; font-size: 2.1rem; font-weight: 700; letter-spacing: 0.04em; margin: 6px 0 10px; color: var(--moon); }
  .trtimer.low { color: #f3b0b0; }
  .trtimer.frozen { opacity: 0.75; }
  .tnote { display: block; font-size: 0.72rem; font-weight: 400; color: var(--muted); letter-spacing: normal; }
</style>
