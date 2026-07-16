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

  function onOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) app.ui.modal = null;
  }
</script>

{#if app.ui.modal && Current}
  <div class="overlay" data-a="close-modal" onclick={onOverlayClick} role="presentation">
    <div class="modal" data-a="noop" role="dialog">
      <Current />
    </div>
  </div>
{/if}
