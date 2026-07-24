<script lang="ts">
  // Final de partida: el resumen que faltaba antes de borrarlo todo (hasta
  // ahora «Terminar» hacía desaparecer los puntos sin más). Nadie «gana»: es
  // cooperativo, así que la nota es del equipo.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { average, MAX_POINTS } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { WavelengthState } from '../types';
  import ScoreBoard from './ScoreBoard.svelte';

  const { game, my }: { game: WavelengthState; my: PlayerDoc } = $props();
  const rounds = $derived(game.scored || 0);
  const max = $derived(rounds * MAX_POINTS);
  const pct = $derived(max > 0 ? Math.round((game.teamScore / max) * 100) : 0);
  const verdict = $derived(
    pct >= 85 ? '🔮 Sintonía de telépatas: os leéis la mente.'
      : pct >= 65 ? '👏 Muy buena sintonía: os entendéis casi sin hablar.'
        : pct >= 40 ? '🙂 Sintonía decente: hay margen para afinar.'
          : '📡 Interferencias: la próxima, pistas más concretas.',
  );
  void my;
</script>

<div class="card" style="text-align:center">
  <span class="moon">🏁</span>
  <h3 style="margin:6px 0">{game.teamScore} puntos de equipo</h3>
  <p class="small-note">{rounds} {rounds === 1 ? 'ronda puntuada' : 'rondas puntuadas'} · media {average(game.teamScore, rounds)} de {MAX_POINTS} · {pct}% del máximo posible.</p>
  <p style="margin:8px 0 0">{verdict}</p>
</div>

<ScoreBoard {game} />

<button class="primary block" data-a="wl-play-again" onclick={() => guard(A.playAgain)}>🔁 Otra partida (puntos a cero)</button>
<button class="ghost block" data-a="wl-back-lobby" onclick={() => guard(() => A.endWavelength())}>🏁 Terminar y volver al lobby</button>
