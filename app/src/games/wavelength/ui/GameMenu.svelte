<script lang="ts">
  import { app, matchOf, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { WavelengthState } from '../types';

  const { game, my }: { game: WavelengthState; my: PlayerDoc } = $props();
  const spectator = $derived(!matchOf(my.id));
  const slug = $derived(app.route.slug);
  let open = $state(false);
  const close = () => (open = false);
</script>

<div class="gamemenu">
  <button class="small ghost" data-a="game-menu" aria-haspopup="menu" aria-expanded={open} aria-label="Herramientas" title="Herramientas" onclick={() => (open = !open)}>⋯</button>
  {#if open}
    <button class="menu-scrim" aria-label="Cerrar menú" onclick={close}></button>
    <div class="menu-pop" role="menu">
      <button role="menuitem" data-a="voice-open" onclick={() => { app.ui.modal = { type: 'voice' }; app.ui.voiceTest = null; close(); }}>{app.ui.muted ? '🔇 Voz' : '🗣️ Voz'}</button>
      <!-- «La mesa» desde dentro de la partida: el rescate cuando al Psíquico se
           le muere el móvil y la ronda se queda esperando su pista para siempre. -->
      <button role="menuitem" data-a="table-open" onclick={() => { app.ui.modal = { type: 'table' }; close(); }}>🪑 La mesa</button>
      <button role="menuitem" data-a="wl-repeat" onclick={() => { guard(A.requestRepeat); close(); }}>🔁 Repetir la voz</button>
      <!-- Salida no destructiva (la tiene cualquiera): la ronda puede atascarse
           en el móvil del Psíquico y hasta ahora la única puerta era «Terminar»,
           que borraba la partida y los puntos. -->
      {#if (game.phase === 'clue' || game.phase === 'guess') && !game.paused}
        <button role="menuitem" data-a="wl-skip-open" onclick={() => { app.ui.modal = { type: 'wl-skip' }; close(); }}>⏭️ Saltar ronda</button>
      {/if}
      {#if game.paused}
        <button role="menuitem" data-a="wl-resume" onclick={() => { guard(A.resumeGame); close(); }}>▶️ Reanudar</button>
      {:else}
        <button role="menuitem" data-a="wl-pause" onclick={() => { guard(A.pauseGame); close(); }}>⏸️ Pausar</button>
      {/if}
      {#if spectator}
        <button role="menuitem" data-a="back-to-mesa" onclick={() => { close(); navigate(`/g/${slug}`); }}>← Volver a la mesa</button>
      {/if}
      <!-- UNA sola salida destructiva. Irse de una partida de Wavelength la
           cierra para todos (el Psíquico tiene que poder rotar), así que
           «Dejar la partida» y «Terminar» hacían exactamente lo mismo con dos
           nombres y dos confirmaciones distintas. -->
      <button role="menuitem" class="danger-text" data-a="wl-end-open" onclick={() => { app.ui.modal = { type: 'wl-end' }; close(); }}>🏳️ Terminar la partida</button>
    </div>
  {/if}
</div>
