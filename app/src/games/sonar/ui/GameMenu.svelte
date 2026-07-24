<script lang="ts">
  import { app, matchOf, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { SonarState } from '../types';

  const { game, my }: { game: SonarState; my: PlayerDoc } = $props();
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
      {#if playing}
        <button role="menuitem" data-a="sn-repeat" onclick={() => { guard(A.requestRepeat); close(); }}>🔁 Repetir</button>
        {#if game.paused}
          <button role="menuitem" data-a="sn-resume" onclick={() => { guard(A.resumeGame); close(); }}>▶️ Reanudar</button>
        {:else}
          <button role="menuitem" data-a="sn-pause" onclick={() => { guard(A.pauseGame); close(); }}>⏸️ Pausar</button>
        {/if}
      {/if}
      <button role="menuitem" data-a="table-open" onclick={() => { app.ui.modal = { type: 'table' }; close(); }}>🪑 La mesa</button>
      {#if spectator}
        <button role="menuitem" data-a="back-to-mesa" onclick={() => { close(); navigate(`/g/${slug}`); }}>← Volver a la mesa</button>
      {/if}
      <!-- UNA sola salida (B34). Antes había dos con dos nombres —«🚪 Dejar la
           partida» y «🏳️ Terminar»— que hacían exactamente lo mismo: en un juego
           por equipos, irse ES terminar. Y con la partida ya acabada, la
           pantalla del final ya ofrece «🔁 Otra partida» y «🏁 Terminar». -->
      {#if playing}
        <button role="menuitem" class="danger-text" data-a="sn-end-open" onclick={() => { app.ui.modal = { type: 'sn-end' }; close(); }}>🏳️ Terminar la partida</button>
      {/if}
    </div>
  {/if}
</div>
