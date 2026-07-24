<script lang="ts">
  // Revelado: quien ganó la puja levanta discos desde el tablero de arriba
  // (primero los suyos). El resto observa el progreso.
  import { flippedFlowers } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SkullState } from '../types';

  const { game, my }: { game: SkullState; my: PlayerDoc } = $props();
  const iReveal = $derived(game.reveal?.by === my.id);
  const nm = (pid: string) => game.names[pid] || '¿?';
</script>

<div class="narration">
  🎲 <b>{nm(game.reveal?.by || '')}</b> levanta {game.reveal?.need} flor{game.reveal?.need === 1 ? '' : 'es'}. Llevadas: <b>{flippedFlowers(game)}/{game.reveal?.need}</b>.
</div>
{#if iReveal}
  <div class="card"><p class="hint">👆 Toca «Levantar» en el tablero de arriba. Debes empezar por TU pila; luego elige de qué rival seguir. Si sale una calavera, pierdes un disco.</p></div>
{:else}
  <div class="card"><p class="hint">👀 {nm(game.reveal?.by || '')} se la juega…</p></div>
{/if}
