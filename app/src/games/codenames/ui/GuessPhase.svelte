<script lang="ts">
  // Fase de toques: los agentes del equipo de turno tocan casillas del tablero
  // (arriba) o pasan. El Jefe y el rival solo miran.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { canGuess } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CodenamesState } from '../types';

  const { game, my }: { game: CodenamesState; my: PlayerDoc } = $props();
  const iGuess = $derived(canGuess(game, my.id));
  const clue = $derived(game.clue);
</script>

<div class="narration">
  💬 Pista del equipo {game.turn === 'red' ? '🔴 rojo' : '🔵 azul'}: <b>{clue?.word ? `«${clue.word}»` : '(en voz alta)'}</b> · {clue?.num ?? 0}. Intentos restantes: <b>{game.guessesLeft}</b>.
</div>

{#if iGuess}
  <div class="card"><p class="hint">👉 Toca en el tablero de arriba las palabras que creas de tu equipo. Cuando no quieras arriesgar más, pasa.</p>
    <button class="ghost block" data-a="cn-pass" onclick={() => guard(A.passTurn)}>🤐 Pasar el turno</button></div>
{:else}
  <div class="card"><p class="hint">👀 El equipo {game.turn === 'red' ? 'rojo' : 'azul'} está tocando…</p></div>
{/if}
