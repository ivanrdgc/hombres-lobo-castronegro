<script lang="ts">
  // Menú ⋯ de Una Noche: voz, pausar/reanudar y repetir (narrador), la mesa y
  // terminar. Es del GRUPO: cualquier dispositivo puede terminar.
  //
  // Aquí NO hay «abandonar»: en una partida de una sola noche irse es cerrarla
  // (el reparto ya no vale), así que había dos entradas —«🚪 Dejar la partida» y
  // «🏳️ Terminar»— que llamaban a la MISMA acción con dos nombres. Queda una.
  import { app, matchOf, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GameState } from '../types';

  const { game, my }: { game: GameState; my: PlayerDoc } = $props();

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
        <button role="menuitem" data-a="una-repeat" onclick={() => { guard(A.requestRepeat); close(); }}>🔁 Repetir</button>
        {#if game.paused}
          <button role="menuitem" data-a="una-resume" onclick={() => { guard(A.resumeGame); close(); }}>▶️ Reanudar</button>
        {:else}
          <button role="menuitem" data-a="una-pause" onclick={() => { guard(A.pauseGame); close(); }}>⏸️ Pausar</button>
        {/if}
      {/if}
      <!-- Rescate cuando un móvil se queda sin batería y la fase lo espera (B26). -->
      <button role="menuitem" data-a="una-table-open" onclick={() => { app.ui.modal = { type: 'table' }; close(); }}>🪑 La mesa</button>
      {#if spectator}
        <button role="menuitem" data-a="back-to-mesa" onclick={() => { close(); navigate(`/g/${slug}`); }}>← Volver a la mesa</button>
      {/if}
      <button role="menuitem" class="danger-text" data-a="una-end-open" onclick={() => { app.ui.modal = { type: 'una-end' }; close(); }}>🏳️ Terminar la partida</button>
    </div>
  {/if}
</div>
