<script lang="ts">
  // Fase de noche: si me toca actuar en el paso en curso, mi panel de acción;
  // si no, un panel neutral (ojos cerrados). El narrador lleva el orden.
  import { stepActors, playersOf } from '../engine';
  import { STEP_CALL } from '../texts';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GameState } from '../types';
  import NightActionPanel from './NightActionPanel.svelte';
  import MyCard from './MyCard.svelte';

  const { game, my }: { game: GameState; my: PlayerDoc } = $props();

  const step = $derived(game.steps[game.stepIdx]);
  const players = $derived(playersOf(game));
  const actors = $derived(step ? stepActors(step, game, players) : null);
  const isActor = $derived(!!(actors && actors.includes(my.id)));
  const inGame = $derived(game.playerIds.includes(my.id));
  const call = $derived(step ? STEP_CALL[step] : undefined);
</script>

<div class="narration">🌙 {step === 'durmiendo' ? 'Castronegro cierra los ojos…' : step === 'amanecer' ? 'Los primeros rayos asoman…' : (call || 'La noche avanza…')}</div>

{#if isActor}
  <NightActionPanel {game} {my} step={step!} {players} />
{:else}
  <div class="actionpanel"><h3>👂 Ojos cerrados</h3>
    <p class="hint">Mantén los ojos cerrados y atiende a la voz. Cuando te llamen, actúa aquí con disimulo.</p></div>
{/if}
{#if inGame}<MyCard role={game.originalRole[my.id]} />{/if}
