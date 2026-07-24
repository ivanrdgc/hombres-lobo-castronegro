<script lang="ts">
  // Los datos PÚBLICOS de la ronda, siempre a la vista (B25/B26 §5 y §7): quién
  // es el Maestro (el único que responde), quién abre el interrogatorio y cuánto
  // dura el reloj. En la mesa real se ven de un vistazo; aquí se decían una sola
  // vez —por voz y en el diario— y a los dos minutos ya nadie se acordaba.
  import type { InsiderState } from '../types';

  const { game, meId, showTime = false }: { game: InsiderState; meId: string; showTime?: boolean } = $props();
  const nm = (pid: string) => (game.names[pid] || '¿?') + (pid === meId ? ' (tú)' : '');
  const starterId = $derived(game.playerIds[game.starterIdx]);
  const mins = $derived(Math.max(1, Math.round(game.durationMs / 60000)));
</script>

<div class="chips facts">
  <span class="chip">🎓 Responde <b>{nm(game.masterId)}</b></span>
  <span class="chip">❓ Abre <b>{nm(starterId)}</b></span>
  {#if showTime}<span class="chip">⏱ {mins} min de preguntas</span>{/if}
  <span class="chip">👥 {game.playerIds.length} en la ronda</span>
</div>

<style>
  .facts { margin: 8px 0 2px; }
  .facts .chip { font-size: 0.82rem; }
  .facts b { color: var(--text); font-weight: 600; }
</style>
