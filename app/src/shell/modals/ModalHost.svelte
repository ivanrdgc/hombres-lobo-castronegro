<script lang="ts">
  // Host de modales: hoja inferior con overlay (toca fuera para cerrar).
  // El tipo vive en app.ui.modal.type; cada modal es un componente.
  import { app } from '../../core/sync/store.svelte';
  import RolesModal from './RolesModal.svelte';
  import SettingsModal from './SettingsModal.svelte';
  import PlayerMenuModal from './PlayerMenuModal.svelte';
  import ConfirmLeaveModal from './ConfirmLeaveModal.svelte';
  import ConfirmDeleteModal from './ConfirmDeleteModal.svelte';
  import TakeoverModal from './TakeoverModal.svelte';
  import GroupExistsModal from './GroupExistsModal.svelte';
  import VoiceModal from './VoiceModal.svelte';
  import ViewRolesModal from './ViewRolesModal.svelte';
  import EndGameModal from './EndGameModal.svelte';
  import LeaveGameModal from './LeaveGameModal.svelte';
  import ManualPlayerModal from './ManualPlayerModal.svelte';
  import ShowRoleModal from './ShowRoleModal.svelte';
  import ThiefSwapModal from './ThiefSwapModal.svelte';
  import ExplainModal from './ExplainModal.svelte';
  import GameRolesModal from './GameRolesModal.svelte';

  const COMPONENTS: Record<string, unknown> = {
    roles: RolesModal,
    settings: SettingsModal,
    'player-menu': PlayerMenuModal,
    'confirm-leave': ConfirmLeaveModal,
    'confirm-delete': ConfirmDeleteModal,
    takeover: TakeoverModal,
    'group-exists': GroupExistsModal,
    voice: VoiceModal,
    'view-roles': ViewRolesModal,
    'end-game': EndGameModal,
    'leave-game': LeaveGameModal,
    'manual-player': ManualPlayerModal,
    'show-role': ShowRoleModal,
    'thief-swap': ThiefSwapModal,
    explain: ExplainModal,
    'game-roles': GameRolesModal,
  };

  const Current = $derived(app.ui.modal ? (COMPONENTS[app.ui.modal.type] as typeof RolesModal | undefined) : undefined);

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
