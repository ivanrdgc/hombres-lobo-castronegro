<script lang="ts">
  // Menú ⋯ de la partida: SOLO funciones de juego (pausar, voz, repetir, ver
  // roles, abandonar, terminar) según el modo y quién es este dispositivo. La
  // información de cartas vive abajo, en la tira «Cartas en juego».
  import { app, me, isMaster } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { GroupDoc } from '../../../core/sync/schema';

  const { group }: { group: GroupDoc } = $props();

  const game = $derived(group.game);
  const my = $derived(me());
  const narrator = $derived(isMaster());
  const auto = $derived(game?.mode === 'auto');
  // El menú es del GRUPO: cualquier dispositivo (juegue o no) puede pausar o
  // terminar la partida — nadie queda bloqueado porque falte otro móvil.
  const canUse = $derived(!!game && game.phase !== 'end');
  // Abandonar: solo quien está en juego y vivo.
  const inPlay = $derived(!!my?.inGame && my?.alive === true);

  let open = $state(false);
  const close = () => (open = false);
  function leaveOpen() {
    app.ui.modal = { type: 'leave-game' };
    close();
  }
  function voiceOpen() {
    app.ui.modal = { type: 'voice' };
    app.ui.voiceTest = null;
    close();
  }
  function viewRoles() {
    app.ui.modal = { type: 'view-roles' };
    close();
  }
  function endGame() {
    app.ui.modal = { type: 'end-game' };
    close();
  }
  function repeat() {
    void guard(A.requestRepeat);
    close();
  }
  function pause() {
    void guard(A.pauseGame);
    close();
  }
</script>

{#if canUse}
  <div class="gamemenu">
    <button class="small ghost" data-a="game-menu" aria-haspopup="menu" aria-expanded={open} aria-label="Herramientas" title="Herramientas" onclick={() => (open = !open)}>⋯</button>
    {#if open}
      <button class="menu-scrim" aria-label="Cerrar menú" onclick={close}></button>
      <div class="menu-pop" role="menu">
        {#if auto}
          {#if !game?.paused}<button role="menuitem" data-a="pause-game" onclick={pause}>⏸️ Pausar</button>{/if}
          <button role="menuitem" data-a="voice-open" onclick={voiceOpen}>{app.ui.muted ? '🔇 Voz' : '🗣️ Voz'}</button>
          <button role="menuitem" data-a="repeat-last" onclick={repeat}>🔁 Repetir</button>
        {/if}
        {#if narrator && game?.mode === 'guiado'}
          <button role="menuitem" data-a="view-roles" onclick={viewRoles}>👁 Ver roles</button>
        {/if}
        {#if inPlay}
          <button role="menuitem" class="danger-text" data-a="leave-game" onclick={leaveOpen}>🚪 Abandonar la partida</button>
        {/if}
        <button role="menuitem" class="danger-text" data-a="end-game" onclick={endGame}>🏳️ Terminar</button>
        {#if narrator && auto}
          <p class="menu-note">🔊 Narras tú: mantén la pantalla encendida y la app en primer plano, o la voz se detiene. Otro dispositivo puede tomar el relevo desde 🗣️ Voz.</p>
        {/if}
      </div>
    {/if}
  </div>
{/if}
