<script lang="ts">
  // Reloj del debate (R7): en Una Noche el día tiene límite, y al agotarse se
  // vota. No bloquea nada —la mesa manda—, solo empuja: la voz avisa a la vez.
  import type { GameState } from '../types';

  const { game }: { game: GameState } = $props();

  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 500);
    return () => clearInterval(t);
  });

  // En pausa el reloj se congela (resumeGame estira el plazo lo que duró).
  const frozen = $derived(!!game.paused);
  const remaining = $derived(
    game.discussionEndsAt ? Math.max(0, game.discussionEndsAt - (frozen ? game.paused!.at : now)) : null,
  );
  const mmss = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
</script>

{#if remaining !== null}
  <div class="unatimer {remaining <= 60000 ? 'low' : ''} {frozen ? 'frozen' : ''}" data-a="una-timer">
    {frozen ? '⏸' : '⏱'} {mmss(remaining)}
    <span class="tnote">
      {#if remaining === 0}se acabó el tiempo: contad hasta tres y señalad todos a la vez{:else if frozen}reloj congelado: partida en pausa{:else}tiempo de debate{/if}
    </span>
  </div>
{/if}

<style>
  .unatimer {
    text-align: center;
    font-variant-numeric: tabular-nums;
    font-size: 1.9rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    margin: 6px 0 10px;
    color: var(--moon);
  }
  .unatimer.low { color: #f3b0b0; }
  .unatimer.frozen { opacity: 0.75; }
  .tnote { display: block; font-size: 0.72rem; font-weight: 400; color: var(--muted); letter-spacing: normal; }
</style>
