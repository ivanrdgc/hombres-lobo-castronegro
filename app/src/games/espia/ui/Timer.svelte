<script lang="ts">
  // Cronómetro de la ronda: cuenta atrás grande (deadline) o congelado durante
  // una votación (frozenMs). Todos los dispositivos lo ven igual.
  import type { EspiaState } from '../types';

  const { game }: { game: EspiaState } = $props();

  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 250);
    return () => clearInterval(t);
  });

  const remaining = $derived.by(() => {
    if (game.vote && game.phase === 'play') return game.vote.frozenMs;
    if (game.deadline !== null) return Math.max(0, game.deadline - now);
    return null;
  });
  const mmss = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
</script>

{#if remaining !== null}
  <div class="esptimer {remaining <= 60000 ? 'low' : ''} {game.vote ? 'frozen' : ''}" data-a="espia-timer">
    {game.vote ? '⏸' : '⏱'} {mmss(remaining)}
    {#if game.vote}<span class="tnote">reloj congelado: votación en curso</span>{/if}
  </div>
{/if}

<style>
  .esptimer {
    text-align: center;
    font-variant-numeric: tabular-nums;
    font-size: 2.1rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    margin: 6px 0 10px;
    color: var(--moon);
  }
  .esptimer.low { color: #f3b0b0; }
  .esptimer.frozen { opacity: 0.75; }
  .tnote { display: block; font-size: 0.72rem; font-weight: 400; color: var(--muted); letter-spacing: normal; }
</style>
