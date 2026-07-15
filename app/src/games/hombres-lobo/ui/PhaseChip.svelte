<script lang="ts">
  // Chip de fase para la barra superior (port de phaseChip() de la v1).
  import type { GameState } from '../types';

  const { game }: { game: GameState } = $props();
</script>

{#if game.phase === 'reveal'}<span class="chip">🎴 Reparto</span>
{:else if game.phase === 'night'}<span class="chip">🌙 Noche {game.night}</span>
{:else if game.phase === 'day'}<span class="chip">☀️ Día {game.dayNum}</span>
{:else if game.phase === 'manual'}<span class="chip">🎩 Manual</span>
{:else}<span class="chip">🏁 Fin</span>{/if}
