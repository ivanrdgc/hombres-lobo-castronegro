<script lang="ts">
  // Fase de noche: si me toca actuar en el paso en curso, mi panel de acción;
  // si no, un panel neutral (ojos cerrados). El narrador lleva el orden.
  import { isMaster } from '../../../core/sync/store.svelte';
  import { stepActors, playersOf } from '../engine';
  import { STEP_CALL } from '../texts';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GameState } from '../types';
  import NarratorPanel from './NarratorPanel.svelte';
  import NightActionPanel from './NightActionPanel.svelte';
  import MyCard from './MyCard.svelte';

  const { game, my }: { game: GameState; my: PlayerDoc } = $props();

  const step = $derived(game.steps[game.stepIdx]);
  const players = $derived(playersOf(game));
  const actors = $derived(step ? stepActors(step, game, players) : null);
  const isActor = $derived(!!(actors && actors.includes(my.id)));
  const inGame = $derived(game.playerIds.includes(my.id));
  const call = $derived(step ? STEP_CALL[step] : undefined);

  // Acuse de recibo: al completar tu acción dejas de ser actor y el panel
  // desaparecía de golpe, justo cuando esperabas un «hecho». Recordamos en LOCAL
  // que este paso era tuyo para despedirte con calma.
  let actedStep = $state(-1);
  $effect(() => { if (isActor) actedStep = game.stepIdx; });
  const justActed = $derived(!isActor && actedStep === game.stepIdx);
</script>

<div class="narration">🌙 {step === 'durmiendo' ? 'Castronegro cierra los ojos…' : step === 'amanecer' ? 'Los primeros rayos asoman…' : (call || 'La noche avanza…')}</div>

{#if isActor}
  <NightActionPanel {game} {my} step={step!} {players} />
{:else if justActed}
  <div class="actionpanel"><h3>✅ Hecho: tu turno está resuelto</h3>
    <p class="hint">Cierra los ojos y deja el móvil boca abajo. La voz sigue con los demás.</p>
    <p class="hint">Recuerda: la noche continúa sin ti. Tu carta todavía puede cambiar de manos… y ni te enterarás.</p></div>
{:else}
  <div class="actionpanel"><h3>👂 Ojos cerrados</h3>
    <p class="hint">Ahora mismo no te toca: mantén los ojos cerrados y el móvil boca abajo. Cuando la voz llame a TU carta, esta pantalla te dará los botones para actuar con disimulo.</p>
    <p class="hint">Si tu carta no actúa de noche (🧑‍🌾 Aldeano, 🏹 Cazador, 🪢 Curtidor…), no te llamarán: tu turno llega mañana, en el debate. Y la voz llama a TODOS los roles del mazo, estén repartidos o en el centro, así que el silencio no delata a nadie.</p></div>
{/if}
<!-- Escape de quien narra jugando: solo el botón (nunca a quién se espera). -->
{#if isMaster()}<NarratorPanel {game} />{/if}
{#if inGame}<MyCard {game} pid={my.id} />{/if}
