// Los Hombres Lobo de Castronegro como juego enchufable de la mesa.
import type { GameDefinition } from '../registry';
import LobbyScreen from './ui/LobbyScreen.svelte';
import StartScreen from './ui/StartScreen.svelte';
import GameScreen from './ui/GameScreen.svelte';
import RolesModal from './ui/modals/RolesModal.svelte';
import SettingsModal from './ui/modals/SettingsModal.svelte';
import ExplainModal from './ui/modals/ExplainModal.svelte';
import RoleDetailModal from './ui/modals/RoleDetailModal.svelte';
import ViewRolesModal from './ui/modals/ViewRolesModal.svelte';
import EndGameModal from './ui/modals/EndGameModal.svelte';
import LeaveGameModal from './ui/modals/LeaveGameModal.svelte';
import ManualPlayerModal from './ui/modals/ManualPlayerModal.svelte';
import ShowRoleModal from './ui/modals/ShowRoleModal.svelte';
import ThiefSwapModal from './ui/modals/ThiefSwapModal.svelte';
import DemoModal from './ui/modals/DemoModal.svelte';
import MyInfoModal from './ui/modals/MyInfoModal.svelte';

export const hombresLobo: GameDefinition = {
  id: 'hombres_lobo',
  emoji: '🐺',
  name: 'Los Hombres Lobo de Castronegro',
  desc: 'El clásico de roles ocultos: lobos contra el pueblo, con narrador automático por voz, modo guiado y todas las expansiones.',
  minPlayers: 3,
  maxPlayers: 18,
  Lobby: LobbyScreen,
  Start: StartScreen,
  Screen: GameScreen,
  modals: {
    'hl-mycard': MyInfoModal,
    'hl-demo': DemoModal,
    roles: RolesModal,
    settings: SettingsModal,
    explain: ExplainModal,
    'role-detail': RoleDetailModal,
    'view-roles': ViewRolesModal,
    'end-game': EndGameModal,
    'leave-game': LeaveGameModal,
    'manual-player': ManualPlayerModal,
    'show-role': ShowRoleModal,
    'thief-swap': ThiefSwapModal,
  },
};
