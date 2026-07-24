<script lang="ts">
  // Panel del dispositivo que pone la VOZ. Dos usos:
  //  · detail=true (quien narra y NO juega): su móvil es el que la mesa mira
  //    cuando algo se atasca, y antes no veía nada de la partida (U1). Aquí ve
  //    la fase y el paso en curso.
  //  · detail=false (quien narra jugando): SOLO el escape, nunca a quién se
  //    espera — eso le diría qué rol tiene cada cual.
  // El escape (R2): la noche solo avanza cuando todos los llamados actúan; si
  // alguien bloqueó el móvil, se colgaba para siempre. Tras un par de
  // recordatorios aparece «⏭️ Saltar este turno».
  //
  // Postura 🍽️ MESA (B28): este móvil suele quedarse EN EL CENTRO de la mesa
  // sonando, o sea, a la vista de todos. Por eso los nombres de quien falta —y
  // el «no actúa nadie», que delataría un paso fantasma— no se pintan solos:
  // se piden con un gesto y se ocultan a los 12 s.
  import { guard } from '../../../core/sync/guard';
  import { e2eTestMode } from '../../../core/test-hooks';
  import * as A from '../actions';
  import { playersOf, stepActors } from '../engine';
  import { ROLES, ROLE_OF_STEP } from '../roles';
  import type { GameState } from '../types';
  import DebateTimer from './DebateTimer.svelte';

  const { game, detail = false }: { game: GameState; detail?: boolean } = $props();

  const nm = (pid: string) => game.names[pid] || '¿?';
  const step = $derived(game.phase === 'night' ? game.steps[game.stepIdx] : null);
  const actors = $derived(step ? stepActors(step, game, playersOf(game)) : null);
  const waiting = $derived((actors || []).map(nm));
  const skipped = $derived((game.skippedSteps || []).includes(game.stepIdx));
  const role = $derived(step ? ROLE_OF_STEP[step] : null);
  const stepName = $derived(
    step === 'durmiendo' ? '🌙 Todos cierran los ojos'
      : step === 'amanecer' ? '🌅 Va a amanecer'
        : role ? `${ROLES[role].emoji} ${ROLES[role].name}` : '…',
  );
  const pendingSeen = $derived(game.playerIds.filter((pid) => !(game.seen || {})[pid]).map(nm));

  // «¿A quién se espera?»: se pide y se oculta solo (nunca queda escrito en la
  // pantalla que está en medio de la mesa).
  let who = $state(false);
  $effect(() => { void game.stepIdx; void game.phase; who = false; });
  $effect(() => {
    if (!who) return;
    const t = setTimeout(() => (who = false), e2eTestMode() ? 120000 : 12000);
    return () => clearTimeout(t);
  });

  // El botón solo asoma si el paso se eterniza (≈2 recordatorios). Los pasos
  // fantasma también pueden llegar ahí (se hacen de rogar), así que su aparición
  // no delata si el rol existe: solo dice que la noche está encallada, que a
  // esas alturas ya oye toda la mesa.
  const SKIP_AFTER = e2eTestMode() ? 1500 : 35000;
  let stepSince = $state(Date.now());
  let now = $state(Date.now());
  $effect(() => { void game.stepIdx; void game.phase; stepSince = Date.now(); });
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(t);
  });
  const canSkip = $derived(
    game.phase === 'night' && !game.paused && !skipped
    && step !== 'durmiendo' && step !== 'amanecer'
    && now - stepSince > SKIP_AFTER,
  );
</script>

{#if detail}
  <div class="card">
    <h3>🎙️ Pones la voz</h3>
    {#if game.phase === 'reveal'}
      <p class="hint">🎴 Cada uno mira su carta en su móvil.
        {pendingSeen.length ? `Faltan por confirmar: ${pendingSeen.join(', ')}.` : 'Todos han confirmado: que alguien pulse «🌙 Comenzar la noche».'}</p>
    {:else if game.phase === 'night'}
      <p class="hint">🌙 Llamada en curso: <b>{stepName}</b> ({game.stepIdx + 1} de {game.steps.length}).</p>
      {#if who}
        <p class="hint">{#if skipped}⏭️ Paso saltado: la voz lo cierra y sigue.{:else if waiting.length}⏳ Se espera a: <b>{waiting.join(', ')}</b>.{:else}✅ Nadie tiene que actuar en esta llamada: la voz la cerrará sola.{/if}</p>
        <button class="small ghost" data-a="una-who-hide" onclick={() => (who = false)}>🙈 Ocultar</button>
      {:else}
        <button class="small ghost" data-a="una-who" onclick={() => (who = true)}>👁 ¿Por quién se espera? (se oculta solo)</button>
      {/if}
      <p class="small-note">🤫 Este móvil suele quedarse en el centro de la mesa: por eso los nombres solo salen si los pides.</p>
    {:else if game.phase === 'day'}
      <DebateTimer {game} />
      <p class="hint">{#if game.pendingHunter}🏹 {nm(game.pendingHunter)} era el Cazador: espera a que decida su flecha.{:else if game.lynched != null}⚖️ Veredicto registrado. Resolviendo…{:else}☀️ Debate en curso. Al acabarse el tiempo: contad hasta tres, señalad todos a la vez y que una persona lo registre.{/if}</p>
    {/if}
  </div>
{/if}

{#if canSkip}
  <div class="card">
    <p class="hint">⏳ Esta llamada se está eternizando. Si alguien se ha dormido (o bloqueó el móvil), sáltala: la voz cerrará el paso con normalidad y la noche seguirá.</p>
    <button class="ghost block" data-a="una-skip-step" onclick={() => guard(() => A.skipCurrentStep(game.stepIdx))}>⏭️ Saltar esta llamada</button>
  </div>
{/if}
