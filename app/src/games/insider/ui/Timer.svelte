<script lang="ts">
  // Cronómetro del interrogatorio: cuenta atrás grande (deadline) + barra de lo
  // que queda y lo que está en juego al llegar a cero. En pausa se muestra
  // congelado (el tiempo restante se devuelve al reanudar).
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
  const pct = $derived(remaining === null ? 0 : Math.max(0, Math.min(100, (remaining / Math.max(1, game.durationMs)) * 100)));
  const mins = $derived(Math.max(1, Math.round(game.durationMs / 60000)));
  const mmss = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
</script>

{#if remaining !== null}
  <div class="instimer {remaining <= 30000 ? 'low' : ''} {game.paused ? 'frozen' : ''}" data-a="ins-timer">
    <div class="big">{game.paused ? '⏸' : '⏱'} {mmss(remaining)}</div>
    <div class="bar"><div class="fill" style="width:{pct}%"></div></div>
    <!-- Lo que está en juego, en la misma pieza que el número: el reloj a cero
         no es «se acabó la fase», es una derrota de todos. -->
    <div class="tnote">
      {#if game.paused}en pausa · el reloj no corre
      {:else if remaining <= 30000}¡Últimos segundos! Si llega a 0 sin la palabra, perdéis todos
      {:else}de {mins} min · si llega a 0 sin adivinar la palabra, pierden todos (también el Insider){/if}
    </div>
  </div>
{/if}

<style>
  .instimer {
    text-align: center;
    margin: 6px 0 10px;
    color: var(--moon);
  }
  .instimer .big {
    font-variant-numeric: tabular-nums;
    font-size: 2.6rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    line-height: 1.1;
  }
  .bar { height: 6px; border-radius: 999px; background: var(--card2); overflow: hidden; margin: 6px auto 0; max-width: 420px; }
  .fill { height: 100%; background: var(--moon); transition: width 0.25s linear; }
  .instimer.low { color: #f3b0b0; }
  .instimer.low .fill { background: #f3b0b0; }
  .instimer.frozen { opacity: 0.75; }
  .tnote { display: block; font-size: 0.8rem; font-weight: 400; color: var(--muted); letter-spacing: normal; margin-top: 6px; }
</style>
