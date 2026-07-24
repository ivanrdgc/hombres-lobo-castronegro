<script lang="ts">
  import { app, matchOf, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GoodCopState } from '../types';

  const { game, my }: { game: GoodCopState; my: PlayerDoc } = $props();
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
      <!-- Orden del contrato (UX.md): primero mandar sobre la partida, luego
           consultar, y al final las salidas. -->
      {#if playing}
        {#if game.paused}
          <button role="menuitem" data-a="gc-resume" onclick={() => { guard(A.resumeGame); close(); }}>▶️ Reanudar</button>
        {:else}
          <button role="menuitem" data-a="gc-pause" onclick={() => { guard(A.pauseGame); close(); }}>⏸️ Pausar</button>
        {/if}
        <button role="menuitem" data-a="gc-repeat" onclick={() => { guard(A.requestRepeat); close(); }}>🔁 Repetir</button>
      {/if}
      <button role="menuitem" data-a="voice-open" onclick={() => { app.ui.modal = { type: 'voice' }; app.ui.voiceTest = null; close(); }}>{app.ui.muted ? '🔇 Voz' : '🗣️ Voz'}</button>
      <!-- La ayuda solo se abría desde el lobby: a media partida no había forma
           de consultar las reglas. Mismo nombre que allí. -->
      <button role="menuitem" data-a="gc-help-open" onclick={() => { app.ui.modal = { type: 'gc-help' }; close(); }}>🎲 Cómo se juega</button>
      <!-- Rescate cuando un móvil se queda sin batería y el turno espera por él. -->
      <button role="menuitem" data-a="table-open" onclick={() => { app.ui.modal = { type: 'table' }; close(); }}>🪑 La mesa</button>
      {#if spectator}
        <button role="menuitem" data-a="back-to-mesa" onclick={() => { close(); navigate(`/g/${slug}`); }}>← Volver a la mesa</button>
      {/if}
      {#if !spectator}
        <button role="menuitem" class="danger-text" data-a="gc-leave-open" onclick={() => { app.ui.modal = { type: 'gc-leave' }; close(); }}>🚪 Dejar la partida</button>
      {/if}
      <button role="menuitem" class="danger-text" data-a="gc-end-open" onclick={() => { app.ui.modal = { type: 'gc-end' }; close(); }}>🏳️ Terminar</button>
    </div>
  {/if}
</div>
