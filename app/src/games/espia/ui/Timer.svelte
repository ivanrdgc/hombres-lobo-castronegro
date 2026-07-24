<script lang="ts">
  // Cronómetro de la ronda: cuenta atrás grande (deadline) o congelado durante
  // una votación (frozenMs). La barra dice de un vistazo cuánto queda sin leer
  // números, y el pie recuerda qué pasará al llegar a cero.
  import type { EspiaState } from '../types';

  const { game }: { game: EspiaState } = $props();

  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 250);
    return () => clearInterval(t);
  });

  const frozen = $derived(!!game.vote || !!game.paused);
  const remaining = $derived.by(() => {
    if (game.vote && game.phase === 'play') return game.vote.frozenMs;
    // En pausa el reloj se congela donde estaba (al reanudar se desplaza).
    if (game.paused && game.deadline !== null) return Math.max(0, game.deadline - game.paused.at);
    if (game.deadline !== null) return Math.max(0, game.deadline - now);
    return null;
  });
  const mmss = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const totalMin = $derived(Math.round(game.durationMs / 60000));
  const pct = $derived(remaining === null || !game.durationMs
    ? 0
    : Math.max(0, Math.min(100, (remaining / game.durationMs) * 100)));
  const low = $derived(remaining !== null && remaining <= 60000);
</script>

{#if remaining !== null}
  <div class="esptimer {low ? 'low' : ''} {frozen ? 'frozen' : ''}" data-a="espia-timer">
    {frozen ? '⏸' : '⏱'} {mmss(remaining)}
    {#if game.vote}<span class="tnote">reloj congelado: votación en curso</span>
    {:else if game.paused}<span class="tnote">reloj congelado: partida en pausa</span>
    {:else if low}<span class="tnote">último minuto · al llegar a cero se acaban las preguntas y se acusa por turnos</span>
    {:else}<span class="tnote">{totalMin >= 1 ? `de ${totalMin} min de interrogatorio · ` : ''}al llegar a cero se acusa por turnos</span>{/if}
  </div>
  <div class="tbar {low ? 'low' : ''}" aria-hidden="true"><span style="width:{pct}%"></span></div>
{/if}

<style>
  .esptimer {
    text-align: center;
    font-variant-numeric: tabular-nums;
    font-size: 2.1rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    margin: 6px 0 6px;
    color: var(--moon);
  }
  .esptimer.low { color: #f3b0b0; }
  .esptimer.frozen { opacity: 0.75; }
  .tnote { display: block; font-size: 0.72rem; font-weight: 400; color: var(--muted); letter-spacing: normal; }
  /* La barra es el «cuánto queda» que se lee sin leer: de un golpe de vista. */
  .tbar {
    height: 6px; border-radius: 3px; background: var(--card2);
    border: 1px solid var(--border); overflow: hidden; margin: 0 0 10px;
  }
  .tbar span { display: block; height: 100%; background: var(--accent); transition: width 0.25s linear; }
  .tbar.low span { background: #f3b0b0; }
</style>
