<script lang="ts">
  // Menú ⋯ de la partida: SOLO funciones de juego (pausar, voz, repetir, ver
  // roles, abandonar, terminar) según el modo y quién es este dispositivo. La
  // información de cartas vive abajo, en la tira «Cartas en juego».
  import { app, me, isMaster, matchOf, navigate } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import type { GroupDoc } from '../../../core/sync/schema';

  const { group }: { group: GroupDoc } = $props();

  const game = $derived(group.game);
  const my = $derived(me());
  const narrator = $derived(isMaster());
  const auto = $derived(game?.mode === 'auto');
  // Espectador: mira una partida ajena (no es miembro de ninguna) y puede
  // volver a la mesa cuando quiera.
  const spectator = $derived(!!my && !matchOf(my.id));
  // El menú es del GRUPO: cualquier dispositivo (juegue o no) puede pausar o
  // terminar la partida — nadie queda bloqueado porque falte otro móvil. El
  // espectador lo conserva incluso en el desenlace (por el «volver»).
  const canUse = $derived(!!game && (game.phase !== 'end' || spectator));
  // Abandonar: solo quien está en juego y vivo.
  const inPlay = $derived(!!my?.inGame && my?.alive === true);
  // Rescate: la noche escaló al repaso de roles porque alguien no responde.
  // Ese repaso exige a TODOS los vivos, así que sin salida se queda colgado.
  const stuckNight = $derived(!!(auto && game?.phase === 'night' && game?.roleRefresh));

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
  function skipStep() {
    void guard(() => A.forceAdvance(true));
    close();
  }
  // «🪑 La mesa» es la pieza COMPARTIDA del shell (igual en los 17 juegos):
  // lista de dispositivos con 💤 y, tocando a uno, «⛔ Sacarlo de la partida».
  // Es el rescate cuando un móvil se queda sin batería y la fase lo espera.
  function tableOpen() {
    app.ui.modal = { type: 'table' };
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
        {#if stuckNight}
          <button role="menuitem" data-a="skip-stuck-step" onclick={skipStep}>⏭️ Saltar paso</button>
        {/if}
        {#if narrator && game?.mode === 'guiado'}
          <button role="menuitem" data-a="view-roles" onclick={viewRoles}>👁 Ver roles</button>
        {/if}
        {#if spectator}
          <button role="menuitem" data-a="back-to-mesa" onclick={() => { close(); navigate(`/g/${group.id}`); }}>← Volver a la mesa</button>
        {/if}
        {#if game?.phase !== 'end'}
          <!-- La mesa, alcanzable SIN salir de la partida: desde una partida en
               curso la URL se recoloca sola a la pantalla de juego, así que sin
               esto el menú de cada dispositivo quedaba fuera de alcance. -->
          <button role="menuitem" data-a="table-open" onclick={tableOpen}>🪑 La mesa</button>
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
