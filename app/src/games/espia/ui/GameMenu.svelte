<script lang="ts">
  // Menú ⋯ de El Espía: voz, pausa/repetir, dejar la ronda (si juegas) y
  // terminar el juego. Es del GRUPO: cualquier dispositivo puede terminar
  // (nadie queda bloqueado).
  import { app, matchOf, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';

  const { game, my }: { game: EspiaState; my: PlayerDoc } = $props();

  const inRound = $derived(game.playerIds.includes(my.id) && game.phase !== 'end');
  // Con el reloj corriendo, la pausa es la única forma de congelarlo sin
  // gastar una acusación (antes había que gastarla).
  const playing = $derived(game.phase !== 'end');
  // Espectador: mira una partida ajena (no es miembro de ninguna).
  const spectator = $derived(!matchOf(my.id));
  const slug = $derived(app.route.slug);

  let open = $state(false);
  const close = () => (open = false);
  function voiceOpen() {
    app.ui.modal = { type: 'voice' };
    app.ui.voiceTest = null;
    close();
  }
  function leaveOpen() {
    app.ui.modal = { type: 'espia-leave' };
    close();
  }
  function endOpen() {
    app.ui.modal = { type: 'espia-end' };
    close();
  }
</script>

<div class="gamemenu">
  <button class="small ghost" data-a="game-menu" aria-haspopup="menu" aria-expanded={open} aria-label="Herramientas" title="Herramientas" onclick={() => (open = !open)}>⋯</button>
  {#if open}
    <button class="menu-scrim" aria-label="Cerrar menú" onclick={close}></button>
    <div class="menu-pop" role="menu">
      <button role="menuitem" data-a="voice-open" onclick={voiceOpen}>{app.ui.muted ? '🔇 Voz' : '🗣️ Voz'}</button>
      <!-- Dentro de una partida la URL se recoloca sola: sin esta entrada no hay
           forma de llegar al menú de un dispositivo apagado y sacarlo. -->
      <button role="menuitem" data-a="table-open" onclick={() => { app.ui.modal = { type: 'table' }; close(); }}>🪑 La mesa</button>
      {#if playing}
        <button role="menuitem" data-a="espia-repeat" onclick={() => { guard(A.requestRepeat); close(); }}>🔁 Repetir</button>
        {#if game.paused}
          <button role="menuitem" data-a="espia-resume" onclick={() => { guard(A.resumeGame); close(); }}>▶️ Reanudar</button>
        {:else}
          <button role="menuitem" data-a="espia-pause" onclick={() => { guard(A.pauseGame); close(); }}>⏸️ Pausar</button>
        {/if}
      {/if}
      {#if spectator}
        <button role="menuitem" data-a="back-to-mesa" onclick={() => { close(); navigate(`/g/${slug}`); }}>← Volver a la mesa</button>
      {/if}
      {#if inRound}
        <button role="menuitem" class="danger-text" data-a="espia-leave-open" onclick={leaveOpen}>🚪 Dejar la ronda</button>
      {/if}
      <button role="menuitem" class="danger-text" data-a="espia-end-open" onclick={endOpen}>🏳️ Terminar el juego</button>
    </div>
  {/if}
</div>
