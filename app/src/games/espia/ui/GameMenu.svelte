<script lang="ts">
  // Menú ⋯ de El Espía: voz, dejar la ronda (si juegas) y terminar el juego.
  // Es del GRUPO: cualquier dispositivo puede terminar (nadie queda bloqueado).
  import { app } from '../../../core/sync/store.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { EspiaState } from '../types';

  const { game, my }: { game: EspiaState; my: PlayerDoc } = $props();

  const inRound = $derived(game.playerIds.includes(my.id) && game.phase !== 'end');

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
      {#if inRound}
        <button role="menuitem" class="danger-text" data-a="espia-leave-open" onclick={leaveOpen}>🚪 Dejar la ronda</button>
      {/if}
      <button role="menuitem" class="danger-text" data-a="espia-end-open" onclick={endOpen}>🏳️ Terminar</button>
    </div>
  {/if}
</div>
