<script lang="ts">
  // Tablero de pilas: una fila por jugador con sus discos (boca abajo). Solo TU
  // pila muestra lo que pusiste; las ajenas van tapadas. Los discos ya
  // levantados en el revelado se ven destapados para todos.
  import { placed, placedCount, invCount, flipTargets } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SkullState } from '../types';

  const { game, my, onflip = null }: {
    game: SkullState; my: PlayerDoc; onflip?: ((pid: string) => void) | null;
  } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const targets = $derived(game.phase === 'reveal' ? flipTargets(game) : []);

  // Cuántos discos de una pila están ya levantados (desde arriba) en el revelado.
  const flippedCount = (pid: string) => (game.reveal?.flipped || []).filter((f) => f.owner === pid).length;
  // Disco levantado en la posición i (desde arriba), si lo está.
  function flippedAt(pid: string, fromTop: number) {
    const flips = (game.reveal?.flipped || []).filter((f) => f.owner === pid);
    return fromTop < flips.length ? flips[fromTop].disc : null;
  }
</script>

<div class="skstacks">
  {#each game.playerIds as pid (pid)}
    {@const mine = pid === my.id}
    {@const st = placed(game, pid)}
    <div class="skrow {game.turn === pid && game.phase !== 'reveal' ? 'active' : ''} {game.alive[pid] ? '' : 'out'}">
      <div class="skname">
        {nm(pid)}{mine ? ' (tú)' : ''}
        <span class="skmarks">{'⭐'.repeat(game.marks[pid] || 0)}</span>
        <span class="skinv">💠×{invCount(game, pid)}</span>
      </div>
      <div class="skpile">
        {#each st as d, i (i)}
          {@const fromTop = st.length - 1 - i}
          {@const flipped = flippedAt(pid, fromTop)}
          <span class="skdisc {flipped ? (flipped === 'skull' ? 'skull' : 'flower') : mine ? (d === 'skull' ? 'skull mine' : 'flower mine') : 'back'}">
            {flipped ? (flipped === 'skull' ? '💀' : '🌸') : mine ? (d === 'skull' ? '💀' : '🌸') : '🎴'}
          </span>
        {/each}
        {#if !st.length}<span class="skempty">— sin discos —</span>{/if}
      </div>
      {#if onflip && targets.includes(pid)}
        <button class="small danger" data-a="sk-flip" data-p={pid} onclick={() => onflip(pid)}>Levantar {pid === my.id ? 'el mío' : 'el suyo'}</button>
      {/if}
      {#if game.phase === 'reveal' && flippedCount(pid) > 0 && !targets.includes(pid)}
        <span class="small-note">✔️</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .skstacks { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; }
  .skrow { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 10px; border: 1px solid var(--border, #333); background: var(--surface, #1c1e28); flex-wrap: wrap; }
  .skrow.active { border-color: #c8a24a; box-shadow: 0 0 0 1px #c8a24a inset; }
  .skrow.out { opacity: 0.45; }
  .skname { font-size: 0.82rem; font-weight: 700; min-width: 90px; }
  .skmarks { margin-left: 4px; }
  .skinv { margin-left: 6px; opacity: 0.7; font-weight: 400; font-size: 0.75rem; }
  .skpile { display: flex; gap: 3px; flex: 1; flex-wrap: wrap; }
  .skdisc { font-size: 1.2rem; line-height: 1; }
  .skdisc.back { filter: grayscale(0.4) brightness(0.8); }
  .skempty { font-size: 0.72rem; color: var(--muted, #999); }
</style>
