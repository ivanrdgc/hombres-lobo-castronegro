<script lang="ts">
  import { app, isMaster, matchOf, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { LoveLetterState } from '../types';

  const { game, my }: { game: LoveLetterState; my: PlayerDoc } = $props();
  const spectator = $derived(!matchOf(my.id));
  const slug = $derived(app.route.slug);
  const playing = $derived(game.phase !== 'end');
  let open = $state(false);
  const close = () => (open = false);
</script>

<div class="gamemenu">
  <button class="small ghost" data-a="game-menu" aria-haspopup="menu" aria-expanded={open} aria-label="Herramientas" title="Herramientas" onclick={() => (open = !open)}>⋯</button>
  {#if open}
    <button class="menu-scrim" aria-label="Cerrar menú" onclick={close}></button>
    <div class="menu-pop" role="menu">
      <button role="menuitem" data-a="voice-open" onclick={() => { app.ui.modal = { type: 'voice' }; app.ui.voiceTest = null; close(); }}>{app.ui.muted ? '🔇 Voz' : '🗣️ Voz'}</button>
      <button role="menuitem" data-a="ll-table-open" onclick={() => { app.ui.modal = { type: 'table' }; close(); }}>🪑 La mesa</button>
      {#if playing}
        <button role="menuitem" data-a="ll-repeat" onclick={() => { guard(A.requestRepeat); close(); }}>🔁 Repetir</button>
        {#if game.paused}
          <button role="menuitem" data-a="ll-resume" onclick={() => { guard(A.resumeGame); close(); }}>▶️ Reanudar</button>
        {:else}
          <button role="menuitem" data-a="ll-pause" onclick={() => { guard(A.pauseGame); close(); }}>⏸️ Pausar</button>
        {/if}
        <!-- Solo el máster: rescate cuando a alguien se le muere el móvil. -->
        {#if isMaster() && game.phase === 'turn'}
          <button role="menuitem" data-a="ll-drop-open" onclick={() => { app.ui.modal = { type: 'll-drop' }; close(); }}>⏭️ Retirar a un ausente</button>
        {/if}
      {/if}
      {#if spectator}
        <button role="menuitem" data-a="back-to-mesa" onclick={() => { close(); navigate(`/g/${slug}`); }}>← Volver a la mesa</button>
      {/if}
      {#if !spectator}
        <button role="menuitem" class="danger-text" data-a="ll-leave-open" onclick={() => { app.ui.modal = { type: 'll-leave' }; close(); }}>🚪 Dejar la partida</button>
      {/if}
      <button role="menuitem" class="danger-text" data-a="ll-end-open" onclick={() => { app.ui.modal = { type: 'll-end' }; close(); }}>🏳️ Terminar</button>
    </div>
  {/if}
</div>

<style>
  /* Móvil primero: el ⋯ y sus opciones son el acceso a pausar y al rescate de
     un móvil muerto — área de toque cómoda (≥ 44 px) en los dos. */
  .gamemenu > button[data-a='game-menu'] { min-height: 44px; min-width: 44px; }
  .menu-pop button { min-height: 44px; }
</style>
