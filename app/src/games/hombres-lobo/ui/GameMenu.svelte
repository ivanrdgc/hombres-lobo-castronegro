<script lang="ts">
  // Menú de herramientas de la partida (sustituye la barra fija inferior
  // masterToolsBar de la v1): un botón ⋯ en la cabecera despliega Voz, Repetir,
  // Cartas, Ver roles y Terminar según el modo y si este dispositivo narra. Así
  // el cuerpo del juego recupera el alto que ocupaba la barra.
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
  function openGameRoles() {
    app.ui.modal = { type: 'game-roles' };
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
        <button role="menuitem" data-a="open-game-roles" onclick={openGameRoles}>🎴 Cartas</button>
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
