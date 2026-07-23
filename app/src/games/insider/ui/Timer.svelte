<script lang="ts">
  // Cronómetro del interrogatorio: cuenta atrás grande (deadline). En pausa se
  // muestra congelado (el tiempo restante se devuelve al reanudar).
  import type { InsiderState } from '../types';

  const { game }: { game: InsiderState } = $props();

  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 250);
    return () => clearInterval(t);
  });

  const remaining = $derived.by(() => {
    if (game.deadline === null) return null;
    if (game.paused) return Math.max(0, game.deadline - game.paused.at); // congelado
    return Math.max(0, game.deadline - now);
  });
  const mmss = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
</script>

{#if remaining !== null}
  <div class="instimer {remaining <= 30000 ? 'low' : ''} {game.paused ? 'frozen' : ''}" data-a="ins-timer">
    {game.paused ? '⏸' : '⏱'} {mmss(remaining)}
    {#if game.paused}<span class="tnote">en pausa</span>{/if}
  </div>
{/if}

<style>
  .instimer {
    text-align: center;
    font-variant-numeric: tabular-nums;
    font-size: 2.1rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    margin: 6px 0 10px;
    color: var(--moon);
  }
  .instimer.low { color: #f3b0b0; }
  .instimer.frozen { opacity: 0.75; }
  .tnote { display: block; font-size: 0.72rem; font-weight: 400; color: var(--muted); letter-spacing: normal; }
</style>
