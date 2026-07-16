<script lang="ts">
  // Host de modales: hoja inferior con overlay (toca fuera para cerrar).
  // El tipo vive en app.ui.modal.type. Los modales del SHELL (grupo, sesión,
  // voz) viven aquí; los del juego los aporta su GameDefinition y tienen
  // prioridad si comparten tipo.
  import { app } from '../../core/sync/store.svelte';
  import { gameDef } from '../../games/registry';
  import PlayerMenuModal from './PlayerMenuModal.svelte';
  import ConfirmLeaveModal from './ConfirmLeaveModal.svelte';
  import ConfirmDeleteModal from './ConfirmDeleteModal.svelte';
  import TakeoverModal from './TakeoverModal.svelte';
  import GroupExistsModal from './GroupExistsModal.svelte';
  import VoiceModal from './VoiceModal.svelte';

  const SHELL_MODALS: Record<string, unknown> = {
    'player-menu': PlayerMenuModal,
    'confirm-leave': ConfirmLeaveModal,
    'confirm-delete': ConfirmDeleteModal,
    takeover: TakeoverModal,
    'group-exists': GroupExistsModal,
    voice: VoiceModal,
  };

  const Current = $derived.by(() => {
    const type = app.ui.modal?.type;
    if (!type) return undefined;
    const game = gameDef(app.group?.currentGame).modals[type];
    return (game ?? SHELL_MODALS[type]) as typeof PlayerMenuModal | undefined;
  });

  let modalEl: HTMLElement | null = $state(null);

  // Con un modal abierto, el fondo no debe desplazarse: se bloquea el scroll
  // del body (y el propio modal contiene su rebote con overscroll-behavior).
  $effect(() => {
    const open = !!(app.ui.modal && Current);
    document.body.classList.toggle('modal-open', open);
    return () => document.body.classList.remove('modal-open');
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
