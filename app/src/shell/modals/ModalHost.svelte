<script lang="ts">
  // Host de modales: hoja inferior con overlay (toca fuera para cerrar).
  // El tipo vive en app.ui.modal.type. Los modales del SHELL (grupo, sesión,
  // voz) viven aquí; los del juego los aporta su GameDefinition y tienen
  // prioridad si comparten tipo.
  import { app, ctxMatch } from '../../core/sync/store.svelte';
  import { gameDef } from '../../games/registry';
  import PlayerMenuModal from './PlayerMenuModal.svelte';
  import ConfirmLeaveModal from './ConfirmLeaveModal.svelte';
  import ConfirmDeleteModal from './ConfirmDeleteModal.svelte';
  import ConfirmEndMatchModal from './ConfirmEndMatchModal.svelte';
  import TakeoverModal from './TakeoverModal.svelte';
  import GroupExistsModal from './GroupExistsModal.svelte';
  import VoiceModal from './VoiceModal.svelte';

  const SHELL_MODALS: Record<string, unknown> = {
    'player-menu': PlayerMenuModal,
    'confirm-leave': ConfirmLeaveModal,
    'confirm-delete': ConfirmDeleteModal,
    'confirm-end-match': ConfirmEndMatchModal,
    takeover: TakeoverModal,
    'group-exists': GroupExistsModal,
    voice: VoiceModal,
  };

  const Current = $derived.by(() => {
    const type = app.ui.modal?.type;
    if (!type) return undefined;
    // El juego del CONTEXTO de este dispositivo: su partida, o el lobby que
    // navega por URL (la mesa puede tener varias partidas de juegos distintos).
    const gid = ctxMatch()?.gameId ?? app.route.game ?? app.group?.currentGame;
    const game = gameDef(gid).modals[type];
    return (game ?? SHELL_MODALS[type]) as typeof PlayerMenuModal | undefined;
  });

  let modalEl: HTMLElement | null = $state(null);

  // Solo importa si hay ALGÚN modal abierto, no cuál: así cambiar de un modal a
  // otro (p. ej. saltar al detalle de un rol) no re-dispara el bloqueo ni salta.
  const modalOpen = $derived(!!(app.ui.modal && Current));

  // Con un modal abierto, el fondo no debe desplazarse. En iOS `overflow:hidden`
  // sobre el body NO frena el scroll táctil, así que se FIJA el body en su sitio
  // (guardando la posición actual) y se restaura al cerrar; overscroll-behavior
  // evita además que el scroll del propio modal se encadene al fondo.
  $effect(() => {
    if (!modalOpen) return;
    const y = window.scrollY;
    const body = document.body;
    body.classList.add('modal-open');
    body.style.top = `-${y}px`;
    return () => {
      body.classList.remove('modal-open');
      body.style.top = '';
      window.scrollTo(0, y);
    };
  });

  // Un modal puede reabrirse pidiendo recuperar su scroll (p. ej. al volver del
  // detalle de un rol): app.ui.modal.scroll trae la posición guardada.
  $effect(() => {
    const s = Number(app.ui.modal?.scroll ?? 0);
    if (!s || !modalEl) return;
    requestAnimationFrame(() => {
      if (modalEl) modalEl.scrollTop = s;
    });
  });

  function onOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) app.ui.modal = null;
  }
</script>

{#if app.ui.modal && Current}
  <div class="overlay" data-a="close-modal" onclick={onOverlayClick} role="presentation">
    <div class="modal" data-a="noop" role="dialog" bind:this={modalEl}>
      <Current />
    </div>
  </div>
{/if}
